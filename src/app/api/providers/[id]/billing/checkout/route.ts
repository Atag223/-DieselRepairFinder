import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { BILLING_PACKAGES } from '@/lib/billing'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  const { id } = await params

  const provider = await prisma.serviceProvider.findUnique({
    where: { id },
    select: { id: true, businessName: true, email: true, stripeCustomerId: true, deletedAt: true },
  })

  if (!provider || provider.deletedAt) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  }

  let packageKey: string
  try {
    const body = await request.json()
    packageKey = String(body.packageKey ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const pkg = BILLING_PACKAGES.find((p) => p.key === packageKey)
  if (!pkg) {
    return NextResponse.json(
      { error: `Invalid package. Choose starter, growth, or pro.` },
      { status: 400 }
    )
  }

  const stripe = new Stripe(stripeSecretKey)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Ensure or retrieve a Stripe customer for this provider
  let stripeCustomerId = provider.stripeCustomerId
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: provider.email ?? undefined,
      name: provider.businessName,
      metadata: { providerId: provider.id },
    })
    stripeCustomerId = customer.id
    await prisma.serviceProvider.update({
      where: { id },
      data: { stripeCustomerId },
    })
  }

  const bonusDesc =
    pkg.bonusCredits > 0
      ? ` + ${pkg.bonusCredits} bonus credit${pkg.bonusCredits > 1 ? 's' : ''}`
      : ''

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: pkg.amountCents,
          product_data: {
            name: `DieselRepairFinder – ${pkg.name} (${pkg.awardedCredits} lead credits)`,
            description: `${pkg.paidCredits} paid leads${bonusDesc}. Credits used only when you accept a qualified lead.`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      providerId: provider.id,
      packageKey: pkg.key,
      paidCredits: String(pkg.paidCredits),
      awardedCredits: String(pkg.awardedCredits),
      bonusCredits: String(pkg.bonusCredits),
      amountCents: String(pkg.amountCents),
    },
    success_url: `${appUrl}/providers/${provider.id}/billing?success=1`,
    cancel_url: `${appUrl}/providers/${provider.id}/billing?cancelled=1`,
  })

  return NextResponse.json({ url: session.url })
}
