import assert from 'node:assert/strict'
import test from 'node:test'
import { renderProviderLeadOpportunityEmail } from '../src/lib/email'

test('pre-acceptance lead emails disclose only coarse request details', () => {
  const html = renderProviderLeadOpportunityEmail({
    to: 'provider@example.com',
    providerName: 'Mobile Diesel Co',
    leadUrl: 'https://dieselrepairfinder.com/leads/lead-id/accept?token=secret',
    category: 'DIESEL_MECHANIC',
    city: 'South Bend',
    state: 'IN',
    issueType: 'Engine repair',
    breakdownNow: true,
  })

  assert.match(html, /South Bend, IN/)
  assert.match(html, /Engine repair/)
  assert.match(html, /Urgent/)
  assert.match(html, /Customer address and request details are withheld until you accept/)
  assert.doesNotMatch(html, /provider@example\.com/)
  assert.doesNotMatch(html, /serviceAddress|issueDetails|requesterEmail|requesterPhone/)
})

test('pre-acceptance lead email redacts contact details in the structured issue label', () => {
  const html = renderProviderLeadOpportunityEmail({
    to: 'provider@example.com',
    providerName: 'Mobile Diesel Co',
    leadUrl: 'https://dieselrepairfinder.com/leads/lead-id/accept?token=secret',
    category: 'DIESEL_MECHANIC',
    city: null,
    state: null,
    issueType: 'Repair - contact 555-123-4567 or customer@example.com',
    breakdownNow: false,
  })

  assert.doesNotMatch(html, /555-123-4567|customer@example\.com/)
  assert.match(html, /contact details withheld/)
})
