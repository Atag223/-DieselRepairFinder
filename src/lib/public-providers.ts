type PublicProvider = {
  tier: 'FREE' | 'FEATURED' | 'PREMIUM'
  businessName?: string
  description?: string | null
  services?: string[]
  phone?: string | null
  email?: string | null
  website?: string | null
  city: string
  state: string
  serviceRadius?: number | null
  locations?: Array<{ city: string; state: string; serviceRadius: number }>
  locationCount?: number
  placements?: Array<{
    state: string
    tier: 'FREE' | 'FEATURED' | 'PREMIUM'
    status: string
    expiresAt: Date | null
  }>
}

export function redactContactDetails(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[contact details hidden]')
    .replace(/(?:https?:\/\/|www\.)[^\s<]+|\b[\w-]+(?:\.[\w-]+)*\.(?:com|net|org|biz|us|co|io|gov|edu)\b(?:\/[^\s<]*)?/gi, '[website hidden]')
    .replace(/\+?\d[\d().\s-]{6,}\d/g, '[contact details hidden]')
}

export function toPublicProvider<T extends PublicProvider>(provider: T, state?: string) {
  const activePlacement = state
    ? provider.placements?.find(
        (placement) =>
          placement.state === state &&
          placement.status === 'ACTIVE' &&
          placement.expiresAt !== null &&
          placement.expiresAt > new Date()
      )
    : undefined
  const { placements: _placements, ...publicProvider } = provider
  const serviceAreas = provider.locations?.length
    ? [...new Set(provider.locations.map(
        (location) => `${location.city}, ${location.state} (${location.serviceRadius} mi)`
      ))]
    : [`${provider.city}, ${provider.state} (${provider.serviceRadius ?? 50} mi)`]

  return {
    ...publicProvider,
    tier: activePlacement?.tier ?? 'FREE',
    ...(provider.businessName
      ? { businessName: redactContactDetails(provider.businessName) }
      : {}),
    ...(provider.description
      ? { description: redactContactDetails(provider.description) }
      : {}),
    ...(provider.services
      ? { services: provider.services.map(redactContactDetails) }
      : {}),
    phone: activePlacement ? provider.phone ?? null : null,
    email: activePlacement ? provider.email ?? null : null,
    website: activePlacement ? provider.website ?? null : null,
    serviceAreas,
  }
}
