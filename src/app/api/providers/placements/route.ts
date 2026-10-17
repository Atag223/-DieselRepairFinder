import { NextRequest, NextResponse } from 'next/server'
import { ProviderTier } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { isProviderSessionValid, PROVIDER_SESSION_COOKIE } from '@/lib/provider-auth'
import { sendPlacementRequestEmail } from '@/lib/email'

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
  'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
  'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
])
const RESERVED_STATUSES = ['REQUESTED', 'APPROVED', 'ACTIVE']

async function authenticatedProvider(request: NextRequest, providerId: string) {
  if (!(await isProviderSessionValid(providerId, request.cookies.get(PROVIDER_SESSION_COOKIE)?.value))) {
    return null
  }
  return prisma.serviceProvider.findFirst({
    where: {
      id: providerId,
      active: true,
      approvedAt: { not: null },
      suspendedAt: null,
      deletedAt: null,
      email: { not: null },
    },
    select: {
      id: true,
      businessName: true,
      email: true,
      state: true,
      locations: { where: { active: true }, select: { state: true } },
    },
  })
}

export async function GET(request: NextRequest) {
  const providerId = request.nextUrl.searchParams.get('providerId') ?? ''
  const state = request.nextUrl.searchParams.get('state')?.toUpperCase() ?? ''
  const tier = request.nextUrl.searchParams.get('tier') as ProviderTier
  const provider = await authenticatedProvider(request, providerId)
  if (!provider) {
    return NextResponse.json({ error: 'Sign in to your approved provider account.' }, { status: 401 })
  }
  if (!US_STATES.has(state) || !['FEATURED', 'PREMIUM'].includes(tier)) {
    return NextResponse.json({ error: 'Select a valid state and placement.' }, { status: 400 })
  }
  if (provider.state !== state && !provider.locations.some((location) => location.state === state)) {
    return NextResponse.json({ error: 'Select a state where your provider business has an active service location.' }, { status: 400 })
  }
  const current = await prisma.listingPlacement.findFirst({
    where: {
      state,
      tier,
      status: { in: RESERVED_STATUSES },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  })
  return NextResponse.json({ available: !current })
}

export async function POST(request: NextRequest) {
  let providerId: string
  let state: string
  let tier: ProviderTier
  try {
    const body = await request.json()
    providerId = String(body.providerId ?? '')
    state = String(body.state ?? '').toUpperCase()
    tier = body.tier as ProviderTier
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const provider = await authenticatedProvider(request, providerId)
  if (!provider) {
    return NextResponse.json({ error: 'Sign in to your approved provider account.' }, { status: 401 })
  }
  if (!US_STATES.has(state) || !['FEATURED', 'PREMIUM'].includes(tier)) {
    return NextResponse.json({ error: 'Select a valid state and placement.' }, { status: 400 })
  }
  const eligibleState = await prisma.serviceProvider.findFirst({
    where: {
      id: providerId,
      OR: [
        { state },
        { locations: { some: { state, active: true } } },
      ],
    },
    select: { id: true },
  })
  if (!eligibleState) {
    return NextResponse.json({ error: 'Select a state where your provider business has an active service location.' }, { status: 400 })
  }

  await prisma.listingPlacement.updateMany({
    where: {
      state,
      tier,
      status: 'ACTIVE',
      expiresAt: { lte: new Date() },
    },
    data: { status: 'EXPIRED' },
  })
  const existing = await prisma.listingPlacement.findFirst({
    where: { state, tier, status: { in: RESERVED_STATUSES } },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'That placement is currently unavailable.' }, { status: 409 })
  }

  try {
    const placement = await prisma.listingPlacement.create({
      data: { providerId, state, tier, status: 'REQUESTED', paymentStatus: 'PENDING' },
      select: { id: true },
    })
    await sendPlacementRequestEmail({
      businessName: provider.businessName,
      providerEmail: provider.email!,
      state,
      tier: tier as 'FEATURED' | 'PREMIUM',
    })
    return NextResponse.json({
      success: true,
      id: placement.id,
      message: 'Request sent to DieselRepairFinder. Administration will confirm availability, approval, and payment arrangements.',
    }, { status: 201 })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'That placement is currently unavailable.' }, { status: 409 })
    }
    console.error('[placements] Failed to create request', error)
    return NextResponse.json({ error: 'Unable to send placement request.' }, { status: 500 })
  }
}
