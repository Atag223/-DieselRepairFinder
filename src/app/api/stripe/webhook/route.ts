import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

export const config = { api: { bodyParser: false } }

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

    const providerId = session.metadata?.providerId
    const credits = session.metadata?.credits ? Number(session.metadata.credits) : null
    const amountCents = session.metadata?.amountCents ? Number(session.metadata.amountCents) : null
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null

    if (!providerId || !credits || !amountCents) {
      console.error('[stripe/webhook] Missing metadata on checkout session', {
        sessionId: session.id,
        metadata: session.metadata,
      })
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
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
      await prisma.$transaction([
        prisma.providerPayment.create({
          data: {
            providerId,
            stripePaymentIntentId: paymentIntentId,
            amountCents,
            creditsPurchased: credits,
            status: 'COMPLETED',
          },
        }),
        prisma.serviceProvider.update({
          where: { id: providerId },
          data: {
            leadCredits: { increment: credits },
          },
        }),
        prisma.leadCreditTransaction.create({
          data: {
            providerId,
            amount: credits,
            type: 'STRIPE_PURCHASE',
            note: 'Stripe credit purchase',
            stripePaymentIntentId: paymentIntentId,
          },
        }),
      ])

      console.log('[stripe/webhook] Credits added', { providerId, credits, amountCents })
    } catch (err) {
      console.error('[stripe/webhook] Failed to add credits', { providerId, credits, err })
      return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
