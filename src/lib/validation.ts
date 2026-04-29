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

export const VALID_PROVIDER_CATEGORIES = [
  'DIESEL_MECHANIC',
  'MOBILE_TIRE_SERVICE',
  'HEAVY_DUTY_WRECKER',
] as const

export type ProviderCategoryValue = typeof VALID_PROVIDER_CATEGORIES[number]

/**
 * Returns the category if valid, otherwise defaults to DIESEL_MECHANIC.
 */
export function parseProviderCategory(value: unknown): ProviderCategoryValue {
  if (typeof value === 'string' && (VALID_PROVIDER_CATEGORIES as readonly string[]).includes(value)) {
    return value as ProviderCategoryValue
  }
  return 'DIESEL_MECHANIC'
}
