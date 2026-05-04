import { prisma } from '@/lib/prisma'
import { ProviderTier, LeadStatus } from '@prisma/client'

export const FREE_LEAD_ALLOWANCE = 3
/** Default price charged per lead once a provider's free allowance is exhausted. */
export const LEAD_PRICE = 25
const MAX_PROVIDERS_PER_REQUEST = 3
/** How many hours must pass before a provider can receive another lead from any request. */
const RECENT_LEAD_WINDOW_HOURS = 1

/**
 * Selects up to MAX_PROVIDERS_PER_REQUEST active providers for a service request,
 * ordered by tier priority (PREMIUM → FEATURED → FREE), filtered by state and category.
 * Providers that already received a lead in the last RECENT_LEAD_WINDOW_HOURS are excluded
 * to avoid provider fatigue / lead spam.
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
      providerCategory: params.category as never,
      ...(params.state ? { state: params.state } : {}),
    },
    orderBy: [
      // Sort by tier index by fetching all and sorting in-memory below
      { createdAt: 'asc' },
    ],
  })

  // Sort by tier priority (PREMIUM → FEATURED → FREE).
  // Prisma does not support ordering by enum value directly, so we sort in-memory.
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

  console.log('[leads] Providers selected', {
    serviceRequestId: params.serviceRequestId ?? null,
    count: selected.length,
    providers: selected.map((p) => ({ providerId: p.id, name: p.businessName, tier: p.tier })),
  })

  return selected
}

/**
 * Creates Lead records for a service request and updates provider counters.
 * Determines whether each lead is billable based on free lead allowance.
 * Skips providers that already have a lead for this request (deduplication).
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
      const charged = provider.freeLeadsRemaining <= 0

      console.log('[leads] Creating lead', {
        serviceRequestId,
        providerId: provider.id,
        charged,
        price: charged ? LEAD_PRICE : 0,
      })

      await prisma.$transaction([
        prisma.lead.create({
          data: {
            serviceRequestId,
            providerId: provider.id,
            status: LeadStatus.SENT,
            charged,
            price: charged ? LEAD_PRICE : 0,
          },
        }),
        prisma.serviceProvider.update({
          where: { id: provider.id },
          data: {
            leadsReceived: { increment: 1 },
            freeLeadsRemaining: charged
              ? undefined
              : { decrement: 1 },
            totalLeadsCharged: charged
              ? { increment: 1 }
              : undefined,
          },
        }),
      ])

      console.log('[leads] Lead created', {
        serviceRequestId,
        providerId: provider.id,
        status: LeadStatus.SENT,
        charged,
        price: charged ? LEAD_PRICE : 0,
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
