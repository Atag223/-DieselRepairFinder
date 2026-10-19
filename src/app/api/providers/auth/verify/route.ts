import { NextRequest, NextResponse } from 'next/server'
import { createProviderSession, hashProviderToken, PROVIDER_SESSION_COOKIE } from '@/lib/provider-auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  let token: unknown
  try {
    token = (await request.json()).token
  } catch {
    return NextResponse.json({ error: 'Invalid sign-in link' }, { status: 400 })
  }
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    return NextResponse.json({ error: 'Invalid or expired sign-in link' }, { status: 401 })
  }
  const tokenHash = hashProviderToken(token)
  const loginToken = await prisma.providerLoginToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
      provider: {
        active: true,
        approvedAt: { not: null },
        suspendedAt: null,
        deletedAt: null,
      },
    },
    select: { id: true, providerId: true },
  })
  if (!loginToken) {
    return NextResponse.json({ error: 'Invalid or expired sign-in link' }, { status: 401 })
  }

  const used = await prisma.providerLoginToken.updateMany({
    where: { id: loginToken.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  })
  if (used.count !== 1) {
    return NextResponse.json({ error: 'Invalid or expired sign-in link' }, { status: 401 })
  }

  const session = await createProviderSession(loginToken.providerId)
  const response = NextResponse.json(
    { success: true, redirect: `/providers/${loginToken.providerId}/billing` },
    { headers: { 'Cache-Control': 'no-store' } }
  )
  response.cookies.set(PROVIDER_SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: session.expiresAt,
    path: '/',
  })
  return response
}
