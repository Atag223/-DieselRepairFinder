import assert from 'node:assert/strict'
import test from 'node:test'
import {
  apiKeysMatch,
  buildEmergencyProviderWhere,
  EmergencyProvider,
  mapAndRankEmergencyProviders,
} from '../src/lib/hvf-emergency-providers'

test('internal API key comparison accepts only the configured secret', () => {
  assert.equal(apiKeysMatch('same-length-secret', 'same-length-secret'), true)
  assert.equal(apiKeysMatch('different-secret-', 'same-length-secret'), false)
  assert.equal(apiKeysMatch('short', 'same-length-secret'), false)
})

function provider(overrides: Partial<EmergencyProvider> = {}): EmergencyProvider {
  return {
    id: 'provider-1',
    businessName: 'Mobile Diesel Co',
    contactName: 'Alex Mechanic',
    phone: '574-555-0100',
    email: 'dispatch@example.com',
    website: 'https://example.com',
    city: 'South Bend',
    state: 'IN',
    serviceRadius: 100,
    formattedAddress: '123 Main St, South Bend, IN 46601, USA',
    latitude: 41.6764,
    longitude: -86.252,
    providerCategory: 'DIESEL_MECHANIC',
    services: ['Mobile diesel repair'],
    is24_7: true,
    tier: 'FREE',
    verificationStatus: 'UNVERIFIED',
    rating: null,
    locations: [],
    ...overrides,
  }
}

test('nationwide discovery includes active free and imported listings without billing or verification requirements', () => {
  const where = buildEmergencyProviderWhere({ radiusMiles: 100 })
  assert.equal(where.active, true)
  assert.equal(where.deletedAt, null)
  assert.equal(where.suspendedAt, null)
  assert.equal(where.leadCredits, undefined)
  assert.equal(where.approvedAt, undefined)
  assert.equal(where.verificationStatus, undefined)
  assert.equal(where.source, undefined)

  const result = mapAndRankEmergencyProviders(
    [provider({ tier: 'FREE', verificationStatus: 'UNVERIFIED' })],
    { radiusMiles: 100, limit: 50, appUrl: 'https://dieselrepairfinder.com' }
  )
  assert.equal(result.providers.length, 1)
  assert.equal(result.providers[0].tier, 'FREE')
})

test('state, city, category, and origin filters include matching active branch locations', () => {
  const where = buildEmergencyProviderWhere({
    city: 'Mishawaka',
    state: 'IN',
    category: 'MOBILE_TIRE_SERVICE',
    latitude: 41.66,
    longitude: -86.16,
    radiusMiles: 100,
  })
  assert.equal(where.active, true)
  assert.deepEqual(where.providerCategory, 'MOBILE_TIRE_SERVICE')
  const conditions = where.AND as Array<Record<string, unknown>>
  assert.equal(conditions.length, 2)
  const locationFilter = conditions[0].OR as Array<Record<string, unknown>>
  assert.deepEqual(locationFilter[1], {
    locations: {
      some: {
        active: true,
        city: { equals: 'Mishawaka', mode: 'insensitive' },
        state: { equals: 'IN', mode: 'insensitive' },
      },
    },
  })
  assert.ok(conditions[1].OR)
})

test('private response retains provider and branch contacts, service fields, and category', () => {
  const branch = {
    id: 'loc-1',
    locationName: 'Mishawaka depot',
    address: '456 Depot Rd',
    city: 'Mishawaka',
    state: 'IN',
    zip: '46544',
    serviceRadius: 80,
    phone: '574-555-0123',
    email: 'branch@example.com',
    contactName: 'Branch Manager',
    isPrimary: false,
    latitude: 41.66,
    longitude: -86.16,
  }
  const result = mapAndRankEmergencyProviders(
    [provider({ latitude: null, longitude: null, locations: [branch] })],
    {
      latitude: 41.66,
      longitude: -86.16,
      radiusMiles: 100,
      limit: 50,
      appUrl: 'https://dieselrepairfinder.com',
    }
  )
  const returned = result.providers[0]
  assert.equal(returned.name, 'Mobile Diesel Co')
  assert.equal(returned.phone, '574-555-0100')
  assert.equal(returned.email, 'dispatch@example.com')
  assert.equal(returned.website, 'https://example.com')
  assert.equal(returned.contactName, 'Alex Mechanic')
  assert.equal(returned.category, 'DIESEL_MECHANIC')
  assert.deepEqual(returned.services, ['Mobile diesel repair'])
  assert.equal(returned.locations[0].email, 'branch@example.com')
  assert.equal(returned.nearestLocation?.phone, '574-555-0123')
  for (const legacyField of [
    'id',
    'name',
    'category',
    'city',
    'state',
    'address',
    'primaryCity',
    'primaryState',
    'locationMismatch',
    'services',
    'is24_7',
    'tier',
    'verificationStatus',
    'rating',
    'distanceMiles',
    'distanceFromMainAddress',
    'nearestLocation',
    'source',
    'serviceRequestUrl',
  ]) {
    assert.ok(legacyField in returned, `Expected established response field ${legacyField}`)
  }
})

test('distance ranking uses the closest active branch, filters radius, then limits nationwide candidates', () => {
  const near = provider({
    id: 'near',
    businessName: 'Near Provider',
    latitude: null,
    longitude: null,
    locations: [{
      id: 'near-location',
      locationName: null,
      address: null,
      city: 'Mishawaka',
      state: 'IN',
      zip: null,
      serviceRadius: 50,
      phone: null,
      email: null,
      contactName: null,
      isPrimary: true,
      latitude: 41.66,
      longitude: -86.16,
    }],
  })
  const far = provider({ id: 'far', businessName: 'Far Provider', latitude: 39.76, longitude: -86.16 })
  const outside = provider({ id: 'outside', businessName: 'Outside Provider', latitude: 35.0, longitude: -86.16 })
  const result = mapAndRankEmergencyProviders([far, outside, near], {
    latitude: 41.66,
    longitude: -86.16,
    radiusMiles: 100,
    limit: 1,
    appUrl: 'https://dieselrepairfinder.com',
  })
  assert.equal(result.distanceRanked, true)
  assert.equal(result.providers.length, 1)
  assert.equal(result.providers[0].id, 'near')
  assert.equal(result.providers[0].distanceFromMainAddress, false)
  assert.equal(result.candidatesConsidered, 3)
})
