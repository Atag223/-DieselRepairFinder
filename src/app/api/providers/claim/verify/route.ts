import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    return NextResponse.json({ error: 'Invalid or expired verification link.' }, { status: 400 })
  }

  const verified = await prisma.providerClaimRequest.updateMany({
    where: {
      emailVerificationTokenHash: createHash('sha256').update(token).digest('hex'),
      emailVerificationExpiresAt: { gt: new Date() },
      emailVerifiedAt: null,
      status: 'NEW',
    },
    data: { emailVerifiedAt: new Date() },
  })

  if (verified.count !== 1) {
    return NextResponse.json(
      { error: 'Invalid or expired verification link.' },
      { status: 400, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Email verified. An administrator must still review and approve the provider claim.',
  }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
}
