import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { BILLING_PACKAGES, PLACEMENT_PRICES_CENTS } from '@/lib/billing'

async function completePlacementCheckout(session: Stripe.Checkout.Session) {
  const providerId = session.metadata?.providerId
  const placementId = session.metadata?.placementId
  const state = session.metadata?.state
  const tier = session.metadata?.tier
  const stripeCustomerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null

  if (
    !providerId ||
    !placementId ||
    !state ||
    (tier !== 'FEATURED' && tier !== 'PREMIUM') ||
    session.mode !== 'payment' ||
    session.client_reference_id !== providerId ||
    session.currency !== 'usd' ||
    session.amount_total !== PLACEMENT_PRICES_CENTS[tier] ||
    session.payment_status !== 'paid'
  ) {
    throw new Error('Invalid or unpaid placement checkout session')
  }

  return prisma.$transaction(async (transaction) => {
    const placement = await transaction.listingPlacement.findUnique({
      where: { id: placementId },
      select: {
        id: true,
        providerId: true,
        state: true,
        tier: true,
        status: true,
        paymentStatus: true,
        amountCents: true,
        stripeCheckoutSessionId: true,
        checkoutExpiresAt: true,
        provider: { select: { stripeCustomerId: true } },
      },
    })
    if (
      !placement ||
      placement.providerId !== providerId ||
      placement.state !== state ||
      placement.tier !== tier ||
      placement.amountCents !== session.amount_total ||
      placement.stripeCheckoutSessionId !== session.id ||
      placement.provider.stripeCustomerId !== stripeCustomerId
    ) {
      throw new Error('Placement checkout does not match its provider or reservation')
    }
    if (placement.status === 'ACTIVE' && placement.paymentStatus === 'PAID') {
      return { duplicate: true }
    }
    if (
      placement.status !== 'REQUESTED' ||
      placement.paymentStatus !== 'PENDING' ||
      !placement.checkoutExpiresAt ||
      placement.checkoutExpiresAt <= new Date()
    ) {
      throw new Error('Placement reservation has expired or is no longer available')
    }

    const now = new Date()
    await transaction.listingPlacement.updateMany({
      where: {
        state,
        tier,
        id: { not: placementId },
        OR: [
          { status: 'ACTIVE', expiresAt: { lte: now } },
          { status: 'REQUESTED', paymentStatus: 'PENDING', checkoutExpiresAt: { lte: now } },
        ],
      },
      data: { status: 'EXPIRED' },
    })
    const conflict = await transaction.listingPlacement.findFirst({
      where: {
        state,
        tier,
        id: { not: placementId },
        OR: [
          { status: 'APPROVED' },
          { status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          { status: 'REQUESTED', OR: [{ checkoutExpiresAt: null }, { checkoutExpiresAt: { gt: now } }] },
        ],
      },
      select: { id: true },
    })
    if (conflict) throw new Error('Placement is no longer available')

    const startsAt = now
    const expiresAt = new Date(startsAt)
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    const activated = await transaction.listingPlacement.updateMany({
      where: {
        id: placementId,
        providerId,
        state,
        tier,
        status: 'REQUESTED',
        paymentStatus: 'PENDING',
        stripeCheckoutSessionId: session.id,
        checkoutExpiresAt: { gt: now },
      },
      data: {
        status: 'ACTIVE',
        paymentStatus: 'PAID',
        paidAt: startsAt,
        startsAt,
        expiresAt,
      },
    })
    if (activated.count !== 1) {
      const current = await transaction.listingPlacement.findUnique({
        where: { id: placementId },
        select: { status: true, paymentStatus: true },
      })
      if (current?.status === 'ACTIVE' && current.paymentStatus === 'PAID') {
        return { duplicate: true }
      }
      throw new Error('Placement activation was not completed')
    }
    return { duplicate: false }
  })
}

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeSecretKey || !webhookSecret) {
    console.error('[stripe/webhook] Stripe environment variables not configured')
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey)
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  const rawBody = await request.text()

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe/webhook] Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.metadata?.purchaseType === 'placement') {
      try {
        const result = await completePlacementCheckout(session)
        console.log('[stripe/webhook] Placement checkout processed', {
          sessionId: session.id,
          placementId: session.metadata.placementId,
          ...result,
        })
      } catch (err) {
        console.error('[stripe/webhook] Failed to activate placement', {
          sessionId: session.id,
          placementId: session.metadata.placementId,
          err,
        })
        return NextResponse.json({ error: 'Failed to activate placement' }, { status: 500 })
      }
      return NextResponse.json({ received: true })
    }

    const providerId = session.metadata?.providerId
    const packageKey = session.metadata?.packageKey
    const pkg = BILLING_PACKAGES.find((item) => item.key === packageKey)
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null
    const stripeCustomerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null

    if (
      !providerId ||
      !pkg ||
      (session.metadata?.purchaseType && session.metadata.purchaseType !== 'lead_credits') ||
      session.mode !== 'payment' ||
      session.client_reference_id !== providerId ||
      session.currency !== 'usd' ||
      session.amount_total !== pkg.amountCents ||
      session.payment_status !== 'paid'
    ) {
      console.error('[stripe/webhook] Missing metadata on checkout session', {
        sessionId: session.id,
        providerId,
        packageKey,
        amountTotal: session.amount_total,
        paymentStatus: session.payment_status,
      })
      return NextResponse.json({ error: 'Invalid or unpaid checkout session' }, { status: 400 })
    }

    const provider = await prisma.serviceProvider.findUnique({
      where: { id: providerId },
      select: { id: true },
    })

    if (!provider) {
      console.error('[stripe/webhook] Provider not found', { providerId })
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    try {
      const result = await prisma.$transaction(async (transaction) => {
        const existingPayment = await transaction.providerPayment.findUnique({
          where: { stripeCheckoutSessionId: session.id },
          select: { id: true },
        })
        if (existingPayment) return { duplicate: true, awardedCredits: 0, bonusCredits: 0 }

        const currentProvider = await transaction.serviceProvider.findUnique({
          where: { id: providerId },
          select: { stripeCustomerId: true },
        })
        if (!currentProvider || currentProvider.stripeCustomerId !== stripeCustomerId) {
          throw new Error('Checkout customer does not match provider')
        }

        const bonusClaim = await transaction.serviceProvider.updateMany({
          where: { id: providerId, promotionalBonusUsed: false },
          data: { promotionalBonusUsed: true },
        })
        const bonusCredits = bonusClaim.count === 1 ? pkg.bonusCredits : 0
        const awardedCredits = pkg.paidCredits + bonusCredits
        const bonusDesc = bonusCredits > 0 ? ` + ${bonusCredits} promotional bonus credits` : ''

        await transaction.providerPayment.create({
          data: {
            providerId,
            stripePaymentIntentId: paymentIntentId,
            stripeCheckoutSessionId: session.id,
            amountCents: pkg.amountCents,
            creditsPurchased: awardedCredits,
            status: 'COMPLETED',
          },
        })
        await transaction.serviceProvider.update({
          where: { id: providerId },
          data: {
            leadCredits: { increment: awardedCredits },
          },
        })
        await transaction.leadCreditTransaction.create({
          data: {
            providerId,
            amount: awardedCredits,
            type: 'STRIPE_PURCHASE',
            note: `Purchased ${pkg.paidCredits} credits${bonusDesc}`,
            stripePaymentIntentId: paymentIntentId,
          },
        })
        return { duplicate: false, awardedCredits, bonusCredits }
      })

      console.log('[stripe/webhook] Credits added', {
        providerId,
        sessionId: session.id,
        ...result,
        amountCents: pkg.amountCents,
      })
    } catch (err) {
      console.error('[stripe/webhook] Failed to add credits', { providerId, sessionId: session.id, err })
      return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 })
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session
    const placementId = session.metadata?.placementId
    if (session.metadata?.purchaseType === 'placement' && placementId) {
      await prisma.listingPlacement.updateMany({
        where: {
          id: placementId,
          stripeCheckoutSessionId: session.id,
          status: 'REQUESTED',
          paymentStatus: 'PENDING',
        },
        data: { status: 'EXPIRED' },
      })
    }
  }

  return NextResponse.json({ received: true })
}
