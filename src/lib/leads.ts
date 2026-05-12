import { prisma } from '@/lib/prisma'
import { ProviderTier, LeadStatus } from '@prisma/client'

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
 * Only includes providers that have leadCredits > 0 OR stripeAccountBalanceCents >= LEAD_PRICE_CENTS.
 * Ordered by tier priority (PREMIUM → FEATURED → FREE), filtered by state and category.
 */
export async function selectProviders(params: {
  state: string | null
  category: string
  serviceRequestId?: string
}) {
  const tierOrder: ProviderTier[] = ['PREMIUM', 'FEATURED', 'FREE']

  console.log('[leads] Routing request', {
    serviceRequestId: params.serviceRequestId ?? null,
    category: params.category,
    state: params.state ?? 'any',
  })

  // Find providers that received a lead in the recent window (any request)
  const windowStart = new Date(Date.now() - RECENT_LEAD_WINDOW_HOURS * 60 * 60 * 1000)
  const recentLeads = await prisma.lead.findMany({
    where: { createdAt: { gte: windowStart } },
    select: { providerId: true },
    distinct: ['providerId'],
  })
  const recentProviderIds = new Set(recentLeads.map((l) => l.providerId))

  // If a serviceRequestId is supplied, also exclude providers already assigned to this request
  const existingLeads = params.serviceRequestId
    ? await prisma.lead.findMany({
        where: { serviceRequestId: params.serviceRequestId },
        select: { providerId: true },
      })
    : []
  const alreadySentIds = new Set(existingLeads.map((l) => l.providerId))

  const providers = await prisma.serviceProvider.findMany({
    where: {
      active: true,
      deletedAt: null,
      suspendedAt: null,
      providerCategory: params.category as never,
      ...(params.state ? { state: params.state } : {}),
      // Only route to providers with credits or prepaid balance
      OR: [
        { leadCredits: { gt: 0 } },
        { stripeAccountBalanceCents: { gte: LEAD_PRICE_CENTS } },
      ],
    },
    orderBy: [{ createdAt: 'asc' }],
  })

  // Sort by tier priority (PREMIUM → FEATURED → FREE).
  const sorted = providers
    .filter((p) => !alreadySentIds.has(p.id))
    .sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier))

  // Prefer providers outside the recent-lead window; fall back to all if not enough
  const preferred = sorted.filter((p) => !recentProviderIds.has(p.id))
  const selected = preferred.length >= MAX_PROVIDERS_PER_REQUEST
    ? preferred.slice(0, MAX_PROVIDERS_PER_REQUEST)
    : [
        ...preferred,
        ...sorted.filter((p) => recentProviderIds.has(p.id)),
      ].slice(0, MAX_PROVIDERS_PER_REQUEST)

  if (selected.length === 0) {
    console.log('[leads] No eligible credited providers available', {
      serviceRequestId: params.serviceRequestId ?? null,
    })
  } else {
    console.log('[leads] Providers selected', {
      serviceRequestId: params.serviceRequestId ?? null,
      count: selected.length,
      providers: selected.map((p) => ({ providerId: p.id, name: p.businessName, tier: p.tier })),
    })
  }

  return selected
}

/**
 * Creates Lead records for a service request and decrements provider credits.
 * If provider has leadCredits > 0, uses a credit. Otherwise uses stripeAccountBalanceCents.
 * Creates LeadCreditTransaction records for each lead sent.
 */
export async function createLeadsForRequest(
  serviceRequestId: string,
  providerIds: string[]
): Promise<void> {
  // Deduplication: exclude providers that already have a lead for this request
  const existingLeads = await prisma.lead.findMany({
    where: {
      serviceRequestId,
      providerId: { in: providerIds },
    },
    select: { providerId: true },
  })
  const existingProviderIds = new Set(existingLeads.map((l) => l.providerId))
  const newProviderIds = providerIds.filter((id) => !existingProviderIds.has(id))

  if (existingProviderIds.size > 0) {
    console.log('[leads] Duplicate leads skipped', {
      serviceRequestId,
      skippedProviderIds: [...existingProviderIds],
    })
  }

  if (newProviderIds.length === 0) {
    console.log('[leads] No new leads to create', { serviceRequestId })
    return
  }

  // Fetch all providers in a single query to avoid N+1
  const providers = await prisma.serviceProvider.findMany({
    where: { id: { in: newProviderIds } },
  })

  await Promise.all(
    providers.map(async (provider) => {
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
      })

      if (useCredit) {
        await prisma.$transaction([
          prisma.lead.create({
            data: {
              serviceRequestId,
              providerId: provider.id,
              status: LeadStatus.SENT,
              charged: false,
              price: 0,
            },
          }),
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
            data: {
              serviceRequestId,
              providerId: provider.id,
              status: LeadStatus.SENT,
              charged: true,
              price: LEAD_PRICE,
            },
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
