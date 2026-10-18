import { NextRequest, NextResponse } from 'next/server'
import { ProviderTier } from '@prisma/client'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { isProviderSessionValid, PROVIDER_SESSION_COOKIE } from '@/lib/provider-auth'
import { sendPlacementRequestEmail } from '@/lib/email'
import { PLACEMENT_PRICES_CENTS } from '@/lib/billing'

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
  'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
  'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
])
const RESERVED_STATUSES = ['REQUESTED', 'APPROVED', 'ACTIVE']

async function releaseExpiredPlacements(state: string, tier: ProviderTier) {
  const now = new Date()
  await prisma.listingPlacement.updateMany({
    where: {
      state,
      tier,
      OR: [
        { status: 'ACTIVE', expiresAt: { lte: now } },
        { status: 'REQUESTED', paymentStatus: 'PENDING', checkoutExpiresAt: { lte: now } },
      ],
    },
    data: { status: 'EXPIRED' },
  })
}

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
      stripeCustomerId: true,
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
  const now = new Date()
  const current = await prisma.listingPlacement.findFirst({
    where: {
      state,
      tier,
      OR: [
        { status: 'APPROVED' },
        { status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { status: 'REQUESTED', OR: [{ checkoutExpiresAt: null }, { checkoutExpiresAt: { gt: now } }] },
      ],
    },
    select: { id: true },
  })
  return NextResponse.json({ available: !current })
}

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

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

  await releaseExpiredPlacements(state, tier)
  const existing = await prisma.listingPlacement.findFirst({
    where: { state, tier, status: { in: RESERVED_STATUSES } },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'That placement is currently unavailable.' }, { status: 409 })
  }

  const stripe = new Stripe(stripeSecretKey)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  let stripeCustomerId = provider.stripeCustomerId
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: provider.email ?? undefined,
      name: provider.businessName,
      metadata: { providerId: provider.id },
    })
    const savedCustomer = await prisma.serviceProvider.updateMany({
      where: { id: provider.id, stripeCustomerId: null },
      data: { stripeCustomerId: customer.id },
    })
    if (savedCustomer.count === 1) {
      stripeCustomerId = customer.id
    } else {
      const currentProvider = await prisma.serviceProvider.findUnique({
        where: { id: provider.id },
        select: { stripeCustomerId: true },
      })
      if (!currentProvider?.stripeCustomerId) {
        return NextResponse.json({ error: 'Could not initialize billing account' }, { status: 500 })
      }
      stripeCustomerId = currentProvider.stripeCustomerId
    }
  }

  const now = Math.floor(Date.now() / 1000)
  const checkoutExpiresAt = new Date((now + 60 * 60) * 1000)
  const amountCents = PLACEMENT_PRICES_CENTS[tier as 'FEATURED' | 'PREMIUM']
  let placementId: string
  try {
    const placement = await prisma.listingPlacement.create({
      data: {
        providerId,
        state,
        tier,
        status: 'REQUESTED',
        paymentStatus: 'PENDING',
        amountCents,
        checkoutExpiresAt,
      },
      select: { id: true },
    })
    placementId = placement.id
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'That placement is currently unavailable.' }, { status: 409 })
    }
    console.error('[placements] Failed to reserve placement', error)
    return NextResponse.json({ error: 'Unable to reserve placement.' }, { status: 500 })
  }

  let session: Stripe.Checkout.Session | null = null
  try {
    session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      client_reference_id: provider.id,
      payment_method_types: ['card'],
      mode: 'payment',
      expires_at: now + 60 * 60,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: `DieselRepairFinder ${tier === 'FEATURED' ? 'Featured' : 'Premium'} State Placement — ${state}`,
              description: 'One-time payment for 12 months of state placement. This purchase does not include lead credits.',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        purchaseType: 'placement',
        placementId,
        providerId: provider.id,
        state,
        tier,
      },
      success_url: `${appUrl}/providers/${provider.id}/placements?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/providers/${provider.id}/placements?cancelled=1`,
    })
    if (!session.url) throw new Error('Stripe did not return a hosted checkout URL')
    await prisma.listingPlacement.update({
      where: { id: placementId },
      data: { stripeCheckoutSessionId: session.id },
    })
    await sendPlacementRequestEmail({
      businessName: provider.businessName,
      providerEmail: provider.email!,
      state,
      tier: tier as 'FEATURED' | 'PREMIUM',
    })
    return NextResponse.json({ url: session.url }, { status: 201 })
  } catch (error) {
    if (session?.status === 'open') {
      try {
        await stripe.checkout.sessions.expire(session.id)
      } catch (expireError) {
        console.error('[placements] Failed to expire incomplete Stripe Checkout Session', expireError)
      }
    }
    await prisma.listingPlacement.updateMany({
      where: { id: placementId, status: 'REQUESTED', paymentStatus: 'PENDING' },
      data: { status: 'FAILED' },
    })
    console.error('[placements] Failed to create Stripe Checkout Session', error)
    return NextResponse.json({ error: 'Unable to start placement checkout.' }, { status: 500 })
  }
}
