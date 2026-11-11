import assert from 'node:assert/strict'
import test from 'node:test'
import { BILLING_PACKAGES } from '../src/lib/billing'
import { toPublicProvider } from '../src/lib/public-providers'

test('published prepaid packages match the approved prices and first-purchase bonuses', () => {
  assert.deepEqual(
    BILLING_PACKAGES.map(({ key, paidCredits, bonusCredits, awardedCredits, amountCents }) => ({
      key,
      paidCredits,
      bonusCredits,
      awardedCredits,
      amountCents,
    })),
    [
      { key: 'starter', paidCredits: 4, bonusCredits: 2, awardedCredits: 6, amountCents: 10000 },
      { key: 'growth', paidCredits: 10, bonusCredits: 4, awardedCredits: 14, amountCents: 25000 },
      { key: 'pro', paidCredits: 20, bonusCredits: 8, awardedCredits: 28, amountCents: 50000 },
    ]
  )
})

test('free listings hide contact details while redacting contacts from public copy', () => {
  const result = toPublicProvider({
    tier: 'PREMIUM' as const,
    businessName: 'Call 555-123-4567',
    description: 'Email service@example.com or visit https://example.com',
    services: ['Call 555-123-4567'],
    phone: '555-123-4567',
    email: 'service@example.com',
    website: 'https://example.com',
    city: 'South Bend',
    state: 'IN',
    serviceRadius: 50,
  })

  assert.equal(result.tier, 'FREE')
  assert.equal(result.phone, null)
  assert.equal(result.email, null)
  assert.equal(result.website, null)
  assert.doesNotMatch(result.businessName ?? '', /555-123-4567/)
  assert.doesNotMatch(result.description ?? '', /service@example\.com|example\.com/)
  assert.doesNotMatch(result.services?.[0] ?? '', /555-123-4567/)
})

test('only an unexpired placement in the requested state discloses contacts', () => {
  const expiresAt = new Date(Date.now() + 60_000)
  const result = toPublicProvider({
    tier: 'FREE' as const,
    businessName: 'Mobile Diesel Co',
    phone: '555-123-4567',
    email: 'service@example.com',
    website: 'https://example.com',
    city: 'South Bend',
    state: 'IN',
    placements: [
      { state: 'OH', tier: 'PREMIUM', status: 'ACTIVE', expiresAt },
      { state: 'IN', tier: 'FEATURED', status: 'ACTIVE', expiresAt: new Date(Date.now() - 60_000) },
      { state: 'IN', tier: 'PREMIUM', status: 'ACTIVE', expiresAt },
    ],
  }, 'IN')

  assert.equal(result.tier, 'PREMIUM')
  assert.equal(result.phone, '555-123-4567')
  assert.equal(result.email, 'service@example.com')
  assert.equal(result.website, 'https://example.com')
  assert.equal('placements' in result, false)
})
