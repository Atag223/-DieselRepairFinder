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

export { VALID_PROVIDER_CATEGORIES, parseProviderCategory, type ProviderCategoryValue }
