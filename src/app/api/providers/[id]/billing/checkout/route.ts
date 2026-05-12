import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const PACKAGES = [
  { credits: 5, amountCents: 12500, label: '5 leads – $125' },
  { credits: 10, amountCents: 25000, label: '10 leads – $250' },
  { credits: 20, amountCents: 50000, label: '20 leads – $500' },
]

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

  let credits: number
  try {
    const body = await request.json()
    credits = Number(body.credits)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const pkg = PACKAGES.find((p) => p.credits === credits)
  if (!pkg) {
    return NextResponse.json(
      { error: `Invalid credit package. Choose 5, 10, or 20 credits.` },
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
            name: `DieselRepairFinder Lead Credits – ${pkg.credits} leads`,
            description: `${pkg.credits} qualified lead credits at $${pkg.amountCents / 100 / pkg.credits} each`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      providerId: provider.id,
      credits: String(pkg.credits),
      amountCents: String(pkg.amountCents),
    },
    success_url: `${appUrl}/providers/${provider.id}/billing?success=1`,
    cancel_url: `${appUrl}/providers/${provider.id}/billing?cancelled=1`,
  })

  return NextResponse.json({ url: session.url })
}
