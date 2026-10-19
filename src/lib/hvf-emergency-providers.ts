import { Prisma } from '@prisma/client'
import { timingSafeEqual } from 'node:crypto'
import { calculateDistanceMiles, getBoundingBoxMiles } from '@/lib/distance'

export function apiKeysMatch(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided)
  const expectedBytes = Buffer.from(expected)
  if (providedBytes.length !== expectedBytes.length) return false
  return timingSafeEqual(providedBytes, expectedBytes)
}

export type EmergencyProviderFilters = {
  city?: string
  state?: string
  category?: string
  latitude?: number
  longitude?: number
  radiusMiles: number
}

export function buildEmergencyProviderWhere(
  filters: EmergencyProviderFilters
): Prisma.ServiceProviderWhereInput {
  const where: Prisma.ServiceProviderWhereInput = {
    active: true,
    deletedAt: null,
    suspendedAt: null,
  }
  if (filters.category) {
    where.providerCategory = filters.category as Prisma.EnumProviderCategoryFilter['equals']
  }

  const conditions: Prisma.ServiceProviderWhereInput[] = []
  if (filters.city || filters.state) {
    const primaryLocation: Prisma.ServiceProviderWhereInput = {}
    const branchLocation: Prisma.ProviderLocationWhereInput = { active: true }
    if (filters.city) {
      primaryLocation.city = { equals: filters.city, mode: 'insensitive' }
      branchLocation.city = { equals: filters.city, mode: 'insensitive' }
    }
    if (filters.state) {
      primaryLocation.state = { equals: filters.state, mode: 'insensitive' }
      branchLocation.state = { equals: filters.state, mode: 'insensitive' }
    }
    conditions.push({
      OR: [
        primaryLocation,
        { locations: { some: branchLocation } },
      ],
    })
  }

  const hasOrigin =
    typeof filters.latitude === 'number' &&
    Number.isFinite(filters.latitude) &&
    typeof filters.longitude === 'number' &&
    Number.isFinite(filters.longitude)
  if (hasOrigin) {
    const bbox = getBoundingBoxMiles(filters.latitude!, filters.longitude!, filters.radiusMiles)
    const latRange = { gte: bbox.minLat, lte: bbox.maxLat }
    const lngRange = { gte: bbox.minLng, lte: bbox.maxLng }
    conditions.push({
      OR: [
        { latitude: latRange, longitude: lngRange },
        {
          locations: {
            some: { active: true, latitude: latRange, longitude: lngRange },
          },
        },
      ],
    })
  }

  if (conditions.length) where.AND = conditions
  return where
}

export type EmergencyProviderLocation = {
  id: string
  locationName: string | null
  address: string | null
  city: string
  state: string
  zip: string | null
  serviceRadius: number
  phone: string | null
  email: string | null
  contactName: string | null
  isPrimary: boolean
  latitude: number | null
  longitude: number | null
}

export type EmergencyProvider = {
  id: string
  businessName: string
  contactName: string | null
  phone: string | null
  email: string | null
  website: string | null
  city: string
  state: string
  serviceRadius: number | null
  formattedAddress: string | null
  latitude: number | null
  longitude: number | null
  providerCategory: string
  services: string[]
  is24_7: boolean
  tier: string
  verificationStatus: string
  rating: number | null
  locations: EmergencyProviderLocation[]
}

function parseUsCityState(
  formattedAddress: string | null
): { city: string; state: string } | null {
  if (!formattedAddress) return null
  const parts = formattedAddress.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length < 3) return null
  const countryTail = /^(usa|united states)$/i.test(parts[parts.length - 1])
  const stateIndex = parts.length - (countryTail ? 2 : 1)
  const stateMatch = parts[stateIndex]?.match(/^([A-Za-z]{2})\b/)
  const city = parts[stateIndex - 1]
  if (!stateMatch || !city) return null
  return { city, state: stateMatch[1].toUpperCase() }
}

export function mapAndRankEmergencyProviders(
  providers: EmergencyProvider[],
  options: {
    latitude?: number
    longitude?: number
    radiusMiles: number
    limit: number
    appUrl: string
  }
) {
  const hasOrigin =
    typeof options.latitude === 'number' &&
    Number.isFinite(options.latitude) &&
    typeof options.longitude === 'number' &&
    Number.isFinite(options.longitude)

  const mapped = providers.map((provider) => {
    let distanceMiles: number | null = null
    let nearestLocation: EmergencyProviderLocation | null = null
    let nearestIsMainCoords = false
    if (hasOrigin) {
      const originLat = options.latitude!
      const originLng = options.longitude!
      if (typeof provider.latitude === 'number' && typeof provider.longitude === 'number') {
        distanceMiles =
          Math.round(calculateDistanceMiles(originLat, originLng, provider.latitude, provider.longitude) * 10) / 10
        nearestIsMainCoords = true
      }
      for (const location of provider.locations) {
        if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') continue
        const distance =
          Math.round(calculateDistanceMiles(originLat, originLng, location.latitude, location.longitude) * 10) / 10
        if (distanceMiles === null || distance < distanceMiles) {
          distanceMiles = distance
          nearestLocation = location
          nearestIsMainCoords = false
        }
      }
    }

    const parsed = parseUsCityState(provider.formattedAddress)
    const city = nearestLocation?.city ?? parsed?.city ?? provider.city
    const state = nearestLocation?.state ?? parsed?.state ?? provider.state
    return {
      id: provider.id,
      name: provider.businessName,
      businessName: provider.businessName,
      contactName: provider.contactName,
      phone: provider.phone,
      email: provider.email,
      website: provider.website,
      category: provider.providerCategory,
      city,
      state,
      address: nearestLocation?.address ?? provider.formattedAddress,
      primaryCity: provider.city,
      primaryState: provider.state,
      locationMismatch:
        !nearestLocation && Boolean(parsed) && (parsed?.city !== provider.city || parsed?.state !== provider.state),
      services: provider.services,
      is24_7: provider.is24_7,
      tier: provider.tier,
      verificationStatus: provider.verificationStatus,
      rating: provider.rating,
      distanceMiles,
      distanceFromMainAddress: nearestIsMainCoords,
      nearestLocation: nearestLocation
        ? {
            id: nearestLocation.id,
            locationName: nearestLocation.locationName,
            address: nearestLocation.address,
            city: nearestLocation.city,
            state: nearestLocation.state,
            zip: nearestLocation.zip,
            serviceRadius: nearestLocation.serviceRadius,
            isPrimary: nearestLocation.isPrimary,
            phone: nearestLocation.phone,
            email: nearestLocation.email,
            contactName: nearestLocation.contactName,
          }
        : null,
      locations: provider.locations,
      source: 'DieselRepairFinder.com' as const,
      serviceRequestUrl: `${options.appUrl}/?category=${encodeURIComponent(provider.providerCategory)}#request`,
    }
  })

  let results = mapped
  if (hasOrigin) {
    results = mapped
      .filter(
        (provider): provider is typeof provider & { distanceMiles: number } =>
          provider.distanceMiles !== null && provider.distanceMiles <= options.radiusMiles
      )
      .sort((a, b) => a.distanceMiles - b.distanceMiles || a.name.localeCompare(b.name))
  }
  return {
    providers: results.slice(0, options.limit),
    distanceRanked: hasOrigin,
    radiusMilesUsed: hasOrigin ? options.radiusMiles : null,
    candidatesConsidered: providers.length,
  }
}
