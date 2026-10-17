import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminRequest } from '@/lib/admin-auth'
import { sendPlacementApprovalEmail } from '@/lib/email'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  let action: string
  try {
    action = String((await request.json()).action ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const placement = await prisma.listingPlacement.findUnique({
    where: { id },
    include: { provider: { select: { id: true, email: true, businessName: true } } },
  })
  if (!placement) return NextResponse.json({ error: 'Placement request not found.' }, { status: 404 })

  if (action === 'approve' && placement.status === 'REQUESTED') {
    const result = await prisma.listingPlacement.updateMany({
      where: { id, status: 'REQUESTED' },
      data: { status: 'APPROVED', approvedAt: new Date() },
    })
    if (result.count !== 1) return NextResponse.json({ error: 'Placement request has changed.' }, { status: 409 })
    if (placement.provider.email) {
      await sendPlacementApprovalEmail({
        to: placement.provider.email,
        businessName: placement.provider.businessName,
        state: placement.state,
        tier: placement.tier as 'FEATURED' | 'PREMIUM',
      })
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'confirm-payment' && placement.status === 'APPROVED' && placement.paymentStatus !== 'PAID') {
    const startsAt = new Date()
    const expiresAt = new Date(startsAt)
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    const result = await prisma.listingPlacement.updateMany({
      where: { id, status: 'APPROVED', paymentStatus: { not: 'PAID' } },
      data: {
        status: 'ACTIVE',
        paymentStatus: 'PAID',
        paidAt: startsAt,
        startsAt,
        expiresAt,
      },
    })
    if (result.count !== 1) return NextResponse.json({ error: 'Placement request has changed.' }, { status: 409 })
    return NextResponse.json({ success: true })
  }

  if (action === 'decline' && ['REQUESTED', 'APPROVED'].includes(placement.status)) {
    const result = await prisma.listingPlacement.updateMany({
      where: { id, status: placement.status },
      data: { status: 'DECLINED' },
    })
    if (result.count !== 1) return NextResponse.json({ error: 'Placement request has changed.' }, { status: 409 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action for this placement status.' }, { status: 409 })
}
