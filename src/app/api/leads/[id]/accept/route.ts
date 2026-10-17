import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { LeadStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { LEAD_PRICE } from '@/lib/leads'

type Params = { params: Promise<{ id: string }> }

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  let body: { token?: unknown; action?: unknown }
  try {
    body = await request.json()
  } catch {
    return response({ error: 'Invalid request body' }, 400)
  }

  if (typeof body.token !== 'string' || !/^[A-Za-z0-9_-]{40,60}$/.test(body.token)) {
    return response({ error: 'Invalid or expired lead link' }, 401)
  }

  const tokenHash = createHash('sha256').update(body.token).digest('hex')
  const lead = await prisma.lead.findFirst({
    where: {
      id,
      acceptanceTokenHash: tokenHash,
      acceptanceTokenExpiresAt: { gt: new Date() },
    },
    include: {
      provider: {
        select: { id: true, active: true, suspendedAt: true, deletedAt: true },
      },
      serviceRequest: {
        select: {
          requesterName: true,
          requesterEmail: true,
          requesterPhone: true,
          serviceAddress: true,
          city: true,
          state: true,
          issueType: true,
          issueDetails: true,
          breakdownNow: true,
          truckType: true,
        },
      },
    },
  })

  if (!lead) return response({ error: 'Invalid or expired lead link' }, 401)
  if (body.action !== 'accept' && body.action !== 'decline') {
    return response({ error: 'Choose whether to accept or decline this lead' }, 400)
  }

  if (body.action === 'decline') {
    const declined = await prisma.lead.updateMany({
      where: {
        id: lead.id,
        status: LeadStatus.SENT,
        acceptanceTokenHash: tokenHash,
        acceptanceTokenExpiresAt: { gt: new Date() },
      },
      data: { status: LeadStatus.DECLINED },
    })
    if (declined.count === 0) return response({ error: 'This lead is no longer available' }, 409)
    return response({ success: true, status: 'DECLINED' })
  }

  if (lead.status === LeadStatus.ACCEPTED) {
    return response({ success: true, status: 'ACCEPTED', customer: lead.serviceRequest })
  }
  if (lead.status !== LeadStatus.SENT) {
    return response({ error: 'This lead is no longer available' }, 409)
  }
  if (!lead.provider.active || lead.provider.suspendedAt || lead.provider.deletedAt) {
    return response({ error: 'This provider account is not eligible to accept leads' }, 403)
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const providerDebit = await transaction.serviceProvider.updateMany({
        where: {
          id: lead.providerId,
          active: true,
          suspendedAt: null,
          deletedAt: null,
          leadCredits: { gt: 0 },
        },
        data: {
          leadCredits: { decrement: 1 },
          leadsReceived: { increment: 1 },
          totalLeadsCharged: { increment: 1 },
        },
      })
      if (providerDebit.count !== 1) throw new Error('NO_CREDITS')

      const accepted = await transaction.lead.updateMany({
        where: {
          id: lead.id,
          status: LeadStatus.SENT,
          acceptanceTokenHash: tokenHash,
          acceptanceTokenExpiresAt: { gt: new Date() },
        },
        data: {
          status: LeadStatus.ACCEPTED,
          charged: true,
          price: LEAD_PRICE,
          acceptedAt: new Date(),
          acceptedServiceRequestProviderId: `${lead.serviceRequestId}:${lead.providerId}`,
        },
      })
      if (accepted.count !== 1) throw new Error('LEAD_UNAVAILABLE')

      await transaction.leadCreditTransaction.create({
        data: {
          providerId: lead.providerId,
          amount: -1,
          type: 'LEAD_DEBIT',
          note: 'Accepted qualified lead',
        },
      })
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_CREDITS') {
      const latest = await prisma.lead.findUnique({ where: { id: lead.id }, select: { status: true } })
      if (latest?.status === LeadStatus.ACCEPTED) {
        return response({ success: true, status: 'ACCEPTED', customer: lead.serviceRequest })
      }
      return response({ error: 'Purchase lead credits to accept this request' }, 402)
    }
    if (error instanceof Error && error.message === 'LEAD_UNAVAILABLE') {
      const latest = await prisma.lead.findUnique({ where: { id: lead.id }, select: { status: true } })
      if (latest?.status === LeadStatus.ACCEPTED) {
        return response({ success: true, status: 'ACCEPTED', customer: lead.serviceRequest })
      }
      return response({ error: 'This lead is no longer available' }, 409)
    }
    const acceptedSibling = await prisma.lead.findFirst({
      where: {
        serviceRequestId: lead.serviceRequestId,
        providerId: lead.providerId,
        status: LeadStatus.ACCEPTED,
      },
      select: { id: true },
    })
    if (acceptedSibling) return response({ error: 'This request was already accepted' }, 409)
    console.error('[leads] Failed to accept lead', { leadId: lead.id, error })
    return response({ error: 'Could not accept this lead. Please try again.' }, 500)
  }

  return response({ success: true, status: 'ACCEPTED', customer: lead.serviceRequest })
}
