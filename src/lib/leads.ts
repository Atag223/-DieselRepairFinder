import { prisma } from '@/lib/prisma'
import { ProviderTier, LeadStatus, ProviderLocation } from '@prisma/client'
import { calculateDistanceMiles } from '@/lib/distance'

export const FREE_LEAD_ALLOWANCE = 3
/** Price per lead in dollars */
export const LEAD_PRICE = 25
/** Price per lead in cents (for Stripe) */
export const LEAD_PRICE_CENTS = 2500
/** Credits consumed per lead */
export const LEAD_PRICE_CREDITS = 1

const MAX_PROVIDERS_PER_REQUEST = 3
/** How many hours must pass before a provider can receive another lead from any request. */
const RECENT_LEAD_WINDOW_HOURS = 1

/** Radius expansion steps (miles) used when customer lat/lng is available. */
const RADIUS_STEPS = [25, 50, 100] as const

export interface SelectedProvider {
  id: string
  businessName: string
  tier: ProviderTier
  leadCredits: number
  stripeAccountBalanceCents: number
  _locationId?: string
  _distanceMiles?: number
  _routingRank?: number
  _radiusUsed?: number
  // Allow any additional ServiceProvider fields
  [key: string]: unknown
}

/**
 * Issues 3 free lead credits to a provider if not already issued.
 * Should be called when a provider is approved or a claim is approved.
 */
export async function issueInitialFreeCredits(providerId: string): Promise<boolean> {
  const provider = await prisma.serviceProvider.findUnique({
    where: { id: providerId },
    select: { freeLeadCreditsIssued: true },
  })

  if (!provider || provider.freeLeadCreditsIssued) return false

  await prisma.$transaction([
    prisma.serviceProvider.update({
      where: { id: providerId },
      data: {
        leadCredits: { increment: FREE_LEAD_ALLOWANCE },
        freeLeadCreditsIssued: true,
      },
    }),
    prisma.leadCreditTransaction.create({
      data: {
        providerId,
        amount: FREE_LEAD_ALLOWANCE,
        type: 'FREE_CREDIT',
        note: 'Initial free lead credits',
      },
    }),
  ])

  return true
}

/**
 * Selects up to MAX_PROVIDERS_PER_REQUEST active providers for a service request.
 * When customer lat/lng are provided, uses Haversine distance with radius expansion
 * (25 → 50 → 100 miles → statewide). Falls back to state matching when no coordinates.
 */
export async function selectProviders(params: {
  state: string | null
  category: string
  serviceRequestId?: string
  latitude?: number | null
  longitude?: number | null
}): Promise<SelectedProvider[]> {
  const tierOrder: ProviderTier[] = ['PREMIUM', 'FEATURED', 'FREE']
  const hasCoords =
    params.latitude != null &&
    params.longitude != null &&
    !isNaN(params.latitude) &&
    !isNaN(params.longitude)

  console.log('[leads] Routing request', {
    serviceRequestId: params.serviceRequestId ?? null,
    category: params.category,
    state: params.state ?? 'any',
    hasCoords,
  })

  // Find providers that received a lead in the recent window (any request)
  const windowStart = new Date(Date.now() - RECENT_LEAD_WINDOW_HOURS * 60 * 60 * 1000)
  const recentLeads = await prisma.lead.findMany({
    where: { createdAt: { gte: windowStart } },
    select: { providerId: true },
    distinct: ['providerId'],
  })
  const recentProviderIds = new Set(recentLeads.map((l) => l.providerId))

  // Exclude providers already assigned to this request
  const existingLeads = params.serviceRequestId
    ? await prisma.lead.findMany({
        where: { serviceRequestId: params.serviceRequestId },
        select: { providerId: true },
      })
    : []
  const alreadySentIds = new Set(existingLeads.map((l) => l.providerId))

  // Fetch eligible providers with their active locations
  const providers = await prisma.serviceProvider.findMany({
    where: {
      active: true,
      deletedAt: null,
      suspendedAt: null,
      providerCategory: params.category as never,
      OR: [
        { leadCredits: { gt: 0 } },
        { stripeAccountBalanceCents: { gte: LEAD_PRICE_CENTS } },
      ],
    },
    include: {
      locations: {
        where: { active: true },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
  })

  const eligible = providers.filter((p) => !alreadySentIds.has(p.id))

  // ── Distance-based routing when lat/lng available ────────────────────────
  if (hasCoords) {
    const custLat = params.latitude as number
    const custLng = params.longitude as number

    type Candidate = {
      provider: typeof eligible[0]
      location: ProviderLocation | null
      distanceMiles: number
    }

    const withDistance: Candidate[] = eligible.map((provider) => {
      let closest: ProviderLocation | null = null
      let minDist = Infinity

      for (const loc of provider.locations) {
        if (loc.latitude != null && loc.longitude != null) {
          const d = calculateDistanceMiles(custLat, custLng, loc.latitude, loc.longitude)
          if (d < minDist) {
            minDist = d
            closest = loc
          }
        }
      }

      // Fallback: if provider itself has coords
      if (closest === null && provider.latitude != null && provider.longitude != null) {
        minDist = calculateDistanceMiles(custLat, custLng, provider.latitude, provider.longitude)
      }

      return {
        provider,
        location: closest,
        distanceMiles: minDist,
      }
    })

    // Try radius expansion: 25 → 50 → 100 → statewide
    let selected: Candidate[] = []
    let radiusUsed: number | undefined

    for (const radius of RADIUS_STEPS) {
      const inRadius = withDistance.filter((c) => c.distanceMiles <= radius)
      if (inRadius.length >= MAX_PROVIDERS_PER_REQUEST) {
        selected = inRadius
        radiusUsed = radius
        break
      }
    }

    // Statewide fallback (filter by state if provided)
    if (selected.length < MAX_PROVIDERS_PER_REQUEST) {
      const statewide = params.state
        ? withDistance.filter(
            (c) =>
              c.provider.state === params.state ||
              c.provider.locations.some((l) => l.state === params.state)
          )
        : withDistance
      if (statewide.length > 0) {
        selected = statewide
        radiusUsed = undefined
      }
    }

    // Sort by distance asc, then tier as tiebreaker
    selected.sort((a, b) => {
      if (a.distanceMiles !== b.distanceMiles)
        return a.distanceMiles - b.distanceMiles
      return tierOrder.indexOf(a.provider.tier) - tierOrder.indexOf(b.provider.tier)
    })

    // Prefer providers not in recent-lead window
    const preferred = selected.filter((c) => !recentProviderIds.has(c.provider.id))
    const fallback = selected.filter((c) => recentProviderIds.has(c.provider.id))
    const final = [...preferred, ...fallback].slice(0, MAX_PROVIDERS_PER_REQUEST)

    if (final.length === 0) {
      console.log('[leads] No eligible credited providers available', {
        serviceRequestId: params.serviceRequestId ?? null,
      })
      return []
    }

    const result: SelectedProvider[] = final.map((c, i) => ({
      ...c.provider,
      _locationId: c.location?.id,
      _distanceMiles: c.distanceMiles === Infinity ? undefined : c.distanceMiles,
      _routingRank: i + 1,
      _radiusUsed: radiusUsed,
    }))

    console.log('[leads] Providers selected (geo)', {
      serviceRequestId: params.serviceRequestId ?? null,
      count: result.length,
      providers: result.map((p) => ({
        providerId: p.id,
        name: p.businessName,
        tier: p.tier,
        distanceMiles: p._distanceMiles?.toFixed(1),
        radiusUsed: p._radiusUsed,
      })),
    })

    return result
  }

  // ── State-based fallback routing ─────────────────────────────────────────
  const stateFiltered = params.state
    ? eligible.filter(
        (p) =>
          p.state === params.state ||
          p.locations.some((l) => l.state === params.state)
      )
    : eligible

  const sorted = stateFiltered.sort(
    (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
  )

  const preferred = sorted.filter((p) => !recentProviderIds.has(p.id))
  const fallback = sorted.filter((p) => recentProviderIds.has(p.id))
  const final = [...preferred, ...fallback].slice(0, MAX_PROVIDERS_PER_REQUEST)

  if (final.length === 0) {
    console.log('[leads] No eligible credited providers available', {
      serviceRequestId: params.serviceRequestId ?? null,
    })
    return []
  }

  const result: SelectedProvider[] = final.map((p, i) => {
    // Find closest active location matching the state
    const stateLocation = params.state
      ? p.locations.find((l) => l.state === params.state) ?? null
      : null
    return {
      ...p,
      _locationId: stateLocation?.id,
      _routingRank: i + 1,
    }
  })

  console.log('[leads] Providers selected (state)', {
    serviceRequestId: params.serviceRequestId ?? null,
    count: result.length,
    providers: result.map((p) => ({ providerId: p.id, name: p.businessName, tier: p.tier })),
  })

  return result
}

/**
 * Creates Lead records for a service request and decrements provider credits.
 * Accepts SelectedProvider objects (with optional routing metadata) from selectProviders().
 */
export async function createLeadsForRequest(
  serviceRequestId: string,
  selectedProviders: SelectedProvider[]
): Promise<void> {
  const providerIds = selectedProviders.map((p) => p.id)

  // Deduplication: exclude providers that already have a lead for this request
  const existingLeads = await prisma.lead.findMany({
    where: {
      serviceRequestId,
      providerId: { in: providerIds },
    },
    select: { providerId: true },
  })
  const existingProviderIds = new Set(existingLeads.map((l) => l.providerId))
  const newProviders = selectedProviders.filter((p) => !existingProviderIds.has(p.id))

  if (existingProviderIds.size > 0) {
    console.log('[leads] Duplicate leads skipped', {
      serviceRequestId,
      skippedProviderIds: [...existingProviderIds],
    })
  }

  if (newProviders.length === 0) {
    console.log('[leads] No new leads to create', { serviceRequestId })
    return
  }

  // Fetch fresh provider data to get current credit counts
  const freshProviders = await prisma.serviceProvider.findMany({
    where: { id: { in: newProviders.map((p) => p.id) } },
  })
  const freshMap = new Map(freshProviders.map((p) => [p.id, p]))

  await Promise.all(
    newProviders.map(async (selected) => {
      const provider = freshMap.get(selected.id)
      if (!provider) return

      const useCredit = provider.leadCredits > 0
      const useBalance = !useCredit && provider.stripeAccountBalanceCents >= LEAD_PRICE_CENTS

      if (!useCredit && !useBalance) {
        console.log('[leads] Skipping provider with no credits/balance', {
          serviceRequestId,
          providerId: provider.id,
        })
        return
      }

      const charged = !useCredit && useBalance

      console.log('[leads] Creating lead', {
        serviceRequestId,
        providerId: provider.id,
        useCredit,
        useBalance,
        locationId: selected._locationId,
        distanceMiles: selected._distanceMiles,
      })

      const leadData = {
        serviceRequestId,
        providerId: provider.id,
        status: LeadStatus.SENT,
        charged: false,
        price: 0 as number,
        providerLocationId: selected._locationId ?? null,
        distanceMiles: selected._distanceMiles ?? null,
        routingRank: selected._routingRank ?? null,
        routingRadiusUsed: selected._radiusUsed ?? null,
      }

      if (useCredit) {
        await prisma.$transaction([
          prisma.lead.create({ data: leadData }),
          prisma.serviceProvider.update({
            where: { id: provider.id },
            data: {
              leadCredits: { decrement: 1 },
              leadsReceived: { increment: 1 },
            },
          }),
          prisma.leadCreditTransaction.create({
            data: {
              providerId: provider.id,
              amount: -1,
              type: 'LEAD_DEBIT',
              note: 'Lead sent',
            },
          }),
        ])
      } else {
        await prisma.$transaction([
          prisma.lead.create({
            data: { ...leadData, charged: true, price: LEAD_PRICE },
          }),
          prisma.serviceProvider.update({
            where: { id: provider.id },
            data: {
              stripeAccountBalanceCents: { decrement: LEAD_PRICE_CENTS },
              leadsReceived: { increment: 1 },
              totalLeadsCharged: { increment: 1 },
            },
          }),
          prisma.leadCreditTransaction.create({
            data: {
              providerId: provider.id,
              amount: -1,
              type: 'LEAD_DEBIT',
              note: 'Lead sent using prepaid balance',
            },
          }),
        ])
      }

      console.log('[leads] Lead created', {
        serviceRequestId,
        providerId: provider.id,
        status: LeadStatus.SENT,
        charged,
      })
    })
  )
}

/**
 * Returns a summary of lead stats for all providers (for admin view).
 */
export async function getProviderLeadStats() {
  const providers = await prisma.serviceProvider.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      businessName: true,
      city: true,
      state: true,
      tier: true,
      providerCategory: true,
      verificationStatus: true,
      leadsReceived: true,
      freeLeadsRemaining: true,
      totalLeadsCharged: true,
      leadCredits: true,
      freeLeadCreditsIssued: true,
      stripeAccountBalanceCents: true,
      billingStatus: true,
      claimStatus: true,
    },
    orderBy: { leadsReceived: 'desc' },
  })

  return providers.map((p) => ({
    ...p,
    category: p.providerCategory as string,
    freeLeadsUsed: Math.max(0, FREE_LEAD_ALLOWANCE - p.freeLeadsRemaining),
    estimatedRevenue: p.totalLeadsCharged * LEAD_PRICE,
  }))
}

