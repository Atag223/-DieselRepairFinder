import { prisma } from '@/lib/prisma'
import { ProviderTier, LeadStatus, ProviderLocation } from '@prisma/client'
import { calculateDistanceMiles } from '@/lib/distance'
import { createHash, randomBytes } from 'node:crypto'
import { sendProviderLeadOpportunityEmail } from '@/lib/email'

/** Price per lead in dollars */
export const LEAD_PRICE = 25
/** Price per lead in cents (for Stripe) */
export const LEAD_PRICE_CENTS = 2500
const LEGACY_FREE_LEAD_ALLOWANCE = 3

const MAX_PROVIDERS_PER_REQUEST = 3
const ACCEPTANCE_TOKEN_TTL_HOURS = 72
/** How many hours must pass before a provider can receive another lead from any request. */
const RECENT_LEAD_WINDOW_HOURS = 1

/** Radius expansion steps (miles) used when customer lat/lng is available. */
const RADIUS_STEPS = [25, 50, 100] as const

export interface SelectedProvider {
  id: string
  businessName: string
  email: string | null
  city: string
  state: string
  tier: ProviderTier
  leadCredits: number
  /** The `ProviderLocation.id` of the location chosen for routing (closest to customer). */
  routingLocationId?: string
  /** Great-circle distance in miles from the customer to the matched provider location. `undefined` when no coordinates were available. */
  routingDistanceMiles?: number
  /** 1-based rank of this provider in the routing result set (1 = closest/highest priority). */
  routingRank?: number
  /** The radius step (miles) in which this provider was found during expansion (25, 50, or 100). `undefined` for statewide fallback. */
  routingRadiusUsed?: number
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
      leadCredits: { gt: 0 },
      email: { not: null },
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
      distanceMiles: number | null
      withinCoverage: boolean
    }

    const withDistance: Candidate[] = eligible.map((provider) => {
      let closest: ProviderLocation | null = null
      let minDist: number | null = null

      for (const loc of provider.locations) {
        if (loc.latitude != null && loc.longitude != null) {
          const d = calculateDistanceMiles(custLat, custLng, loc.latitude, loc.longitude)
          if (minDist === null || d < minDist) {
            minDist = d
            closest = loc
          }
        }
      }

      // Fallback: if provider itself has coords but no location record has coords
      if (closest === null && provider.latitude != null && provider.longitude != null) {
        minDist = calculateDistanceMiles(custLat, custLng, provider.latitude, provider.longitude)
      }

      const serviceRadius = closest?.serviceRadius ?? provider.serviceRadius ?? 50
      const withinCoverage = minDist === null || minDist <= serviceRadius
      return {
        provider,
        location: closest,
        distanceMiles: minDist,
        withinCoverage,
      }
    })

    // Try radius expansion: 25 → 50 → 100 → statewide
    let selected: Candidate[] = []
    let radiusUsed: number | undefined

    for (const radius of RADIUS_STEPS) {
      // Only include providers with known distance within the radius
      const inRadius = withDistance.filter(
        (c) => c.withinCoverage && c.distanceMiles !== null && c.distanceMiles <= radius
      )
      if (inRadius.length >= MAX_PROVIDERS_PER_REQUEST) {
        selected = inRadius
        radiusUsed = radius
        break
      }
    }

    // Statewide fallback (filter by state if provided, include providers without coords too)
    if (selected.length < MAX_PROVIDERS_PER_REQUEST) {
      const statewide = params.state
        ? withDistance.filter(
            (c) =>
              c.withinCoverage &&
              (c.provider.state === params.state ||
                c.provider.locations.some((l) => l.state === params.state))
          )
        : withDistance.filter((c) => c.withinCoverage)
      if (statewide.length > 0) {
        selected = statewide
        radiusUsed = undefined
      }
    }

    // Sort: providers with known distance first (closest), then unknown; tier as tiebreaker
    selected.sort((a, b) => {
      const aHasDist = a.distanceMiles !== null
      const bHasDist = b.distanceMiles !== null
      if (aHasDist !== bHasDist) return aHasDist ? -1 : 1
      if (aHasDist && bHasDist && a.distanceMiles !== b.distanceMiles)
        return (a.distanceMiles as number) - (b.distanceMiles as number)
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
      id: c.provider.id,
      businessName: c.provider.businessName,
      email: c.provider.email,
      city: c.provider.city,
      state: c.provider.state,
      tier: c.provider.tier,
      leadCredits: c.provider.leadCredits,
      routingLocationId: c.location?.id,
      routingDistanceMiles: c.distanceMiles ?? undefined,
      routingRank: i + 1,
      routingRadiusUsed: radiusUsed,
    }))

    console.log('[leads] Providers selected (geo)', {
      serviceRequestId: params.serviceRequestId ?? null,
      count: result.length,
      providers: result.map((p) => ({
        providerId: p.id,
        name: p.businessName,
        tier: p.tier,
        distanceMiles: p.routingDistanceMiles?.toFixed(1),
        radiusUsed: p.routingRadiusUsed,
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
      id: p.id,
      businessName: p.businessName,
      email: p.email,
      city: p.city,
      state: p.state,
      tier: p.tier,
      leadCredits: p.leadCredits,
      routingLocationId: stateLocation?.id,
      routingRank: i + 1,
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

  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
    select: {
      requestedCategory: true,
      city: true,
      state: true,
      serviceAddress: true,
      issueType: true,
      issueDetails: true,
      breakdownNow: true,
      truckType: true,
    },
  })
  if (!serviceRequest) return

  await Promise.all(newProviders.map(async (selected) => {
    if (!selected.email) return
    const token = randomBytes(32).toString('base64url')
    const lead = await prisma.lead.create({
      data: {
        serviceRequestId,
        providerId: selected.id,
        status: LeadStatus.SENT,
        charged: false,
        price: LEAD_PRICE,
        acceptanceTokenHash: createHash('sha256').update(token).digest('hex'),
        acceptanceTokenExpiresAt: new Date(Date.now() + ACCEPTANCE_TOKEN_TTL_HOURS * 60 * 60 * 1000),
        providerLocationId: selected.routingLocationId ?? null,
        distanceMiles: selected.routingDistanceMiles ?? null,
        routingRank: selected.routingRank ?? null,
        routingRadiusUsed: selected.routingRadiusUsed ?? null,
      },
    })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    await sendProviderLeadOpportunityEmail({
      to: selected.email,
      providerName: selected.businessName,
      leadUrl: `${appUrl}/leads/${lead.id}/accept?token=${encodeURIComponent(token)}`,
      category: serviceRequest.requestedCategory,
      city: serviceRequest.city,
      state: serviceRequest.state,
      serviceAddress: serviceRequest.serviceAddress,
      issueType: serviceRequest.issueType,
      issueDetails: serviceRequest.issueDetails,
      breakdownNow: serviceRequest.breakdownNow,
      truckType: serviceRequest.truckType,
    })
  }))
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
    freeLeadsUsed: Math.max(0, LEGACY_FREE_LEAD_ALLOWANCE - p.freeLeadsRemaining),
    estimatedRevenue: p.totalLeadsCharged * LEAD_PRICE,
  }))
}
