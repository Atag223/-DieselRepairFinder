import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export const PROVIDER_SESSION_COOKIE = 'provider_session'
const SESSION_TTL_DAYS = 30

export function hashProviderToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function issueProviderLoginLink(providerId: string, email: string) {
  await prisma.providerLoginToken.deleteMany({
    where: { providerId, expiresAt: { lt: new Date() } },
  })
  const recentToken = await prisma.providerLoginToken.findFirst({
    where: { providerId, createdAt: { gte: new Date(Date.now() - 60_000) } },
    select: { id: true },
  })
  if (recentToken) return false

  const token = randomBytes(32).toString('base64url')
  await prisma.providerLoginToken.create({
    data: {
      providerId,
      tokenHash: hashProviderToken(token),
      expiresAt: new Date(Date.now() + 15 * 60_000),
    },
  })
  const { sendProviderLoginEmail } = await import('@/lib/email')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  await sendProviderLoginEmail({
    to: email,
    loginUrl: `${appUrl}/providers/login/verify?token=${encodeURIComponent(token)}`,
  })
  return true
}

export async function createProviderSession(providerId: string) {
  await prisma.providerSession.deleteMany({
    where: { providerId, expiresAt: { lt: new Date() } },
  })
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60_000)
  await prisma.providerSession.create({
    data: { providerId, tokenHash: hashProviderToken(token), expiresAt },
  })
  return { token, expiresAt }
}

export async function isProviderSessionValid(providerId: string, token?: string): Promise<boolean> {
  if (!token || !providerId) return false
  const session = await prisma.providerSession.findFirst({
    where: {
      providerId,
      tokenHash: hashProviderToken(token),
      expiresAt: { gt: new Date() },
      provider: {
        active: true,
        approvedAt: { not: null },
        suspendedAt: null,
        deletedAt: null,
      },
    },
    select: { id: true },
  })
  return Boolean(session)
}
