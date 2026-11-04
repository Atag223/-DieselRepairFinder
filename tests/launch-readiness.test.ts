import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  renderProviderClaimVerificationEmail,
  renderRepairRequestConfirmationEmail,
} from '../src/lib/email'
import {
  canReverifyExistingClaim,
  getProviderLoginEmail,
  normalizeClaimLoginEmail,
} from '../src/lib/provider-account'
import { getRepairRequestConfirmationMessage } from '../src/lib/request-routing'
import { validateAdditionalLocations } from '../src/lib/validation'

test('approved claim email becomes the login address without replacing listing contact email', () => {
  const provider = {
    email: 'directory-contact@example.com',
    claimedByEmail: normalizeClaimLoginEmail(' Verified.Owner@Example.com '),
  }

  assert.equal(getProviderLoginEmail(provider, 'verified.owner@example.com'), 'verified.owner@example.com')
  assert.equal(getProviderLoginEmail(provider), null)
  assert.equal(provider.email, 'directory-contact@example.com')
})

test('legacy claimed accounts can only reverify the email already on the claim', () => {
  const legacyClaim = { claimStatus: 'CLAIMED', claimedByEmail: 'owner@example.com' }
  assert.equal(canReverifyExistingClaim(legacyClaim, ' OWNER@example.com '), true)
  assert.equal(canReverifyExistingClaim(legacyClaim, 'attacker@example.com'), false)
  assert.equal(canReverifyExistingClaim({ claimStatus: 'PENDING', claimedByEmail: null }, 'owner@example.com'), false)
})

test('claim verification email requires ownership and admin approval before login changes', () => {
  const html = renderProviderClaimVerificationEmail({ token: 'secure_token' })
  assert.match(html, /\/api\/providers\/claim\/verify\?token=secure_token/)
  assert.match(html, /expires in 30 minutes/)
  assert.match(html, /unless an administrator approves/)
})

test('additional locations are fully normalized and bounded before writes', () => {
  assert.deepEqual(validateAdditionalLocations([{
    city: '  Boise ',
    state: 'id',
    serviceRadius: '75',
    phone: ' (208) 555-0100 ',
  }]), {
    locations: [{
      city: 'Boise',
      state: 'ID',
      serviceRadius: 75,
      phone: '(208) 555-0100',
    }],
  })
  assert.deepEqual(validateAdditionalLocations(undefined), { locations: [] })
  const missingCity = validateAdditionalLocations([{ city: '', state: 'ID' }])
  const invalidRadius = validateAdditionalLocations([{ city: 'Boise', state: 'ID', serviceRadius: 501 }])
  const tooMany = validateAdditionalLocations([{}, {}, {}, {}])
  assert.match('error' in missingCity ? missingCity.error : '', /city and two-letter state/)
  assert.match('error' in invalidRadius ? invalidRadius.error : '', /between 1 and 500/)
  assert.match('error' in tooMany ? tooMany.error : '', /maximum of 3/)
})

test('repair request confirmation says only what routing actually did', () => {
  assert.match(getRepairRequestConfirmationMessage(2, false), /sent to matching providers/)
  assert.match(getRepairRequestConfirmationMessage(0, true), /team has been alerted/)
  assert.match(getRepairRequestConfirmationMessage(0, false), /no provider has been notified/)
  assert.doesNotMatch(getRepairRequestConfirmationMessage(0, false), /will be in touch|will respond/)
  assert.match(renderRepairRequestConfirmationEmail({
    requesterName: 'Customer',
    referenceId: 'ref-1',
    issueType: 'Repair',
    dispatchedCount: 0,
    adminNotified: false,
  }), /Please contact our team/)
})

test('rehearsal workflow is manual, protected, and fixed to the isolated project', () => {
  const workflow = readFileSync('.github/workflows/production-rehearsal.yml', 'utf8')
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /environment: production-rehearsal/)
  assert.match(workflow, /EXPECTED_PROJECT_REF: hgilnwvxvtryhdndbelk/)
  assert.match(workflow, /github\.ref == 'refs\/heads\/copilot\/copilotconsolidated-launch-from-production-schema'/)
  assert.match(workflow, /REHEARSAL_DIRECT_URL/)
  assert.match(workflow, /REHEARSAL_DATABASE_URL/)
  assert.match(workflow, /prisma migrate deploy/)
})
