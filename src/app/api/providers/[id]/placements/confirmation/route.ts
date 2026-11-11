import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isProviderSessionValid, PROVIDER_SESSION_COOKIE } from '@/lib/provider-auth'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params
  if (!(await isProviderSessionValid(id, request.cookies.get(PROVIDER_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }
  const sessionId = request.nextUrl.searchParams.get('session_id')
  if (!sessionId || sessionId.length > 255) {
    return NextResponse.json({ confirmed: false }, { headers: { 'Cache-Control': 'no-store' } })
  }
  const placement = await prisma.listingPlacement.findFirst({
    where: {
      providerId: id,
      stripeCheckoutSessionId: sessionId,
      status: 'ACTIVE',
      paymentStatus: 'PAID',
    },
    select: { state: true, tier: true, expiresAt: true },
  })
  return NextResponse.json(
    placement
      ? { confirmed: true, state: placement.state, tier: placement.tier, expiresAt: placement.expiresAt }
      : { confirmed: false },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
