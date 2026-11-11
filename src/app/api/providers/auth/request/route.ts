import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { issueProviderLoginLink } from '@/lib/provider-auth'

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

  const provider = await prisma.serviceProvider.findFirst({
    where: {
      email: { equals: email.trim(), mode: 'insensitive' },
      active: true,
      approvedAt: { not: null },
      suspendedAt: null,
      deletedAt: null,
    },
    select: { id: true, email: true },
  })
  if (provider?.email) await issueProviderLoginLink(provider.id, provider.email)

  return NextResponse.json({
    success: true,
    message: 'If an approved listing matches that email, a sign-in link will arrive shortly.',
  })
}
