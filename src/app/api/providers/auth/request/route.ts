import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { issueProviderLoginLink } from '@/lib/provider-auth'
import { getProviderLoginEmail } from '@/lib/provider-account'

export async function POST(request: NextRequest) {
  let email: unknown
  try {
    email = (await request.json()).email
  } catch {
    return NextResponse.json({ error: 'Enter the email associated with your approved listing.' }, { status: 400 })
  }
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const eligibility = {
    active: true,
    approvedAt: { not: null },
    suspendedAt: null,
    deletedAt: null,
  }
  const accounts = await prisma.serviceProvider.findMany({
    where: {
      ...eligibility,
      OR: [
        {
          claimedByEmail: { equals: normalizedEmail, mode: 'insensitive' },
          claimRequests: {
            some: {
              email: { equals: normalizedEmail, mode: 'insensitive' },
              status: 'APPROVED',
              emailVerifiedAt: { not: null },
            },
          },
        },
        {
          claimedByEmail: null,
          email: { equals: normalizedEmail, mode: 'insensitive' },
        },
      ],
    },
    select: { id: true, email: true, claimedByEmail: true },
    take: 2,
  })
  if (accounts.length === 1) {
    const loginEmail = getProviderLoginEmail(accounts[0], normalizedEmail)
    if (loginEmail) await issueProviderLoginLink(accounts[0].id, loginEmail)
  } else if (accounts.length > 1) {
    console.error('Provider sign-in blocked: multiple approved claims share one login email')
  }

  return NextResponse.json({
    success: true,
    message: 'If an approved listing matches that email, a sign-in link will arrive shortly.',
  })
}
