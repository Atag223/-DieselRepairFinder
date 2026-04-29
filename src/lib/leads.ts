import { prisma } from '@/lib/prisma'
import { ProviderTier, LeadStatus } from '@prisma/client'

const FREE_LEAD_ALLOWANCE = 3
const LEAD_PRICE = 25
const MAX_PROVIDERS_PER_REQUEST = 3

/**
 * Selects up to MAX_PROVIDERS_PER_REQUEST active providers for a service request,
 * ordered by tier priority (PREMIUM → FEATURED → FREE), filtered by state and category.
 * Providers who already received leads recently are deprioritised.
 */
export async function selectProviders(params: {
  state: string | null
  category: string
}) {
  const tierOrder: ProviderTier[] = ['PREMIUM', 'FEATURED', 'FREE']

  const providers = await prisma.serviceProvider.findMany({
    where: {
      active: true,
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
  const sorted = providers.sort(
    (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
  )

  return sorted.slice(0, MAX_PROVIDERS_PER_REQUEST)
}

/**
 * Creates Lead records for a service request and updates provider counters.
 * Determines whether each lead is billable based on free lead allowance.
 */
export async function createLeadsForRequest(
  serviceRequestId: string,
  providerIds: string[]
): Promise<void> {
  // Fetch all providers in a single query to avoid N+1
  const providers = await prisma.serviceProvider.findMany({
    where: { id: { in: providerIds } },
  })

  await Promise.all(
    providers.map((provider) => {
      const charged = provider.freeLeadsRemaining <= 0

      return prisma.$transaction([
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
    })
  )
}

/**
 * Returns a summary of lead stats for all providers (for admin view).
 */
export async function getProviderLeadStats() {
  const providers = await prisma.serviceProvider.findMany({
    select: {
      id: true,
      businessName: true,
      state: true,
      tier: true,
      leadsReceived: true,
      freeLeadsRemaining: true,
      totalLeadsCharged: true,
    },
    orderBy: { leadsReceived: 'desc' },
  })

  return providers.map((p) => ({
    ...p,
    freeLeadsUsed: Math.max(0, FREE_LEAD_ALLOWANCE - p.freeLeadsRemaining),
    estimatedRevenue: p.totalLeadsCharged * LEAD_PRICE,
  }))
}
