import { NextRequest } from 'next/server'

export const ADMIN_COOKIE_NAME = 'admin_session'
const SESSION_PAYLOAD = 'diesel-admin-v1'

/**
 * Derives the expected session token from environment variables.
 * Uses the Web Crypto API so it works in both Node.js and Edge runtimes.
 */
export async function getSessionToken(): Promise<string> {
  const secret =
    process.env.ADMIN_SESSION_SECRET ??
    (process.env.ADMIN_EMAIL ?? 'admin') + ':' + (process.env.ADMIN_PASSWORD ?? 'changeme')

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(SESSION_PAYLOAD))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

/**
 * Verifies the admin session cookie in an incoming API request.
 */
export async function verifyAdminRequest(request: NextRequest): Promise<boolean> {
  const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value
  if (!session) return false
  const expected = await getSessionToken()
  return session === expected
}
