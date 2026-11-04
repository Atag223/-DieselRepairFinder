import {
  VALID_PROVIDER_CATEGORIES,
  parseProviderCategory,
  type ProviderCategoryValue,
} from '@/lib/provider-categories'

/**
 * Validates an email address using a safe, non-regex string check
 * that avoids polynomial ReDoS vulnerabilities.
 */
export function isValidEmail(email: string): boolean {
  const atIndex = email.indexOf('@')
  return (
    atIndex > 0 &&
    atIndex < email.length - 1 &&
    email.lastIndexOf('@') === atIndex &&
    email.slice(atIndex + 1).includes('.') &&
    !email.includes(' ')
  )
}

/**
 * Parses a services value into an array of strings.
 * Accepts an existing array, a comma-separated string, or falls back to [].
 */
export function parseServices(services: unknown): string[] {
  if (Array.isArray(services)) {
    return services.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
  }
  if (typeof services === 'string' && services.trim().length > 0) {
    return services.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

export type AdditionalLocationInput = {
  city: string
  state: string
  serviceRadius: number
  phone: string | null
}

export function validateAdditionalLocations(
  value: unknown
): { locations: AdditionalLocationInput[] } | { error: string } {
  if (value == null) return { locations: [] }
  if (!Array.isArray(value)) return { error: 'Additional locations must be a list.' }
  if (value.length > 3) return { error: 'A maximum of 3 additional locations are allowed.' }

  const locations: AdditionalLocationInput[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { error: 'Each additional location must include a city and state.' }
    }

    const location = item as Record<string, unknown>
    const city = typeof location.city === 'string' ? location.city.trim() : ''
    const state = typeof location.state === 'string' ? location.state.trim().toUpperCase() : ''
    const radiusInput = location.serviceRadius
    const radius = radiusInput == null || radiusInput === ''
      ? 50
      : Number(radiusInput)
    if (!city || !/^[A-Z]{2}$/.test(state)) {
      return { error: 'Each additional location must include a city and two-letter state.' }
    }
    if (!Number.isInteger(radius) || radius < 1 || radius > 500) {
      return { error: 'Location service radius must be between 1 and 500 miles.' }
    }
    if (location.phone != null && typeof location.phone !== 'string') {
      return { error: 'Location phone numbers must be text.' }
    }
    locations.push({
      city,
      state,
      serviceRadius: radius,
      phone: typeof location.phone === 'string' ? location.phone.trim() || null : null,
    })
  }
  return { locations }
}

export { VALID_PROVIDER_CATEGORIES, parseProviderCategory, type ProviderCategoryValue }
