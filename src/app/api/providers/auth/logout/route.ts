import { NextRequest, NextResponse } from 'next/server'
import { hashProviderToken, PROVIDER_SESSION_COOKIE } from '@/lib/provider-auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const token = request.cookies.get(PROVIDER_SESSION_COOKIE)?.value
  if (token) {
    await prisma.providerSession.deleteMany({ where: { tokenHash: hashProviderToken(token) } })
  }
  const response = request.headers.get('accept')?.includes('text/html')
    ? NextResponse.redirect(new URL('/providers/login', request.url), 303)
    : NextResponse.json({ success: true })
  response.cookies.set(PROVIDER_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
