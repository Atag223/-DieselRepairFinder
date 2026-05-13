import Link from 'next/link'
import { ProviderCategory, ProviderTier, VerificationStatus, ClaimStatus } from '@prisma/client'

export interface ProviderCardData {
  id: string
  businessName: string
  phone: string | null
  website: string | null
  city: string
  state: string
  services: string[]
  providerCategory: ProviderCategory
  tier: ProviderTier
  verificationStatus: VerificationStatus
  isVerified: boolean
  rating: number | null
  reviewCount: number
  claimStatus: ClaimStatus
  is24_7: boolean
  locationCount?: number
}

const CATEGORY_LABELS: Record<ProviderCategory, { label: string; icon: string }> = {
  DIESEL_MECHANIC: { label: 'Diesel Mechanic', icon: '🔧' },
  MOBILE_TIRE_SERVICE: { label: 'Mobile Tire Service', icon: '🛞' },
  HEAVY_DUTY_WRECKER: { label: 'Heavy-Duty Wrecker', icon: '🚨' },
}

const TIER_BADGE: Record<ProviderTier, { label: string; cls: string } | null> = {
  PREMIUM: { label: '⭐ Premium', cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  FEATURED: { label: '✦ Featured', cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  FREE: null,
}

export default function ProviderCard({ provider }: { provider: ProviderCardData }) {
  const cat = CATEGORY_LABELS[provider.providerCategory]
  const tierBadge = TIER_BADGE[provider.tier]
  const verified =
    provider.verificationStatus === 'VERIFIED' || provider.isVerified
  const unclaimed = provider.claimStatus === 'UNCLAIMED'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3 hover:border-gray-700 transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-lg">{cat.icon}</span>
            <h2 className="font-bold text-white text-base truncate">{provider.businessName}</h2>
            {tierBadge && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tierBadge.cls}`}>
                {tierBadge.label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">
            {provider.city}, {provider.state} &middot; {cat.label}
          </p>
        </div>
        {/* Verification badge */}
        {verified ? (
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-semibold">
            ✓ Verified
          </span>
        ) : (
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-500 border border-gray-700 font-medium">
            Unverified
          </span>
        )}
      </div>

      {/* Rating */}
      {provider.rating != null && (
        <div className="flex items-center gap-1 text-sm text-yellow-400">
          <span>★</span>
          <span className="font-semibold">{provider.rating.toFixed(1)}</span>
          {provider.reviewCount > 0 && (
            <span className="text-gray-500 text-xs">({provider.reviewCount} reviews)</span>
          )}
        </div>
      )}

      {/* Services */}
      {provider.services.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {provider.services.slice(0, 5).map((s) => (
            <span
              key={s}
              className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full border border-gray-700"
            >
              {s}
            </span>
          ))}
          {provider.services.length > 5 && (
            <span className="text-xs text-gray-500 px-2 py-0.5">
              +{provider.services.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Contact info */}
      <div className="flex flex-wrap gap-3 text-sm text-gray-400">
        {provider.phone && (
          <span className="flex items-center gap-1">
            <span>📞</span>
            <span>{provider.phone}</span>
          </span>
        )}
        {provider.website && (
          <a
            href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-400 hover:underline"
          >
            <span>🌐</span>
            <span className="truncate max-w-[160px]">Website</span>
          </a>
        )}
        {provider.is24_7 && (
          <span className="flex items-center gap-1 text-green-400">
            <span>🕐</span>
            <span>24/7</span>
          </span>
        )}
        {provider.locationCount != null && provider.locationCount > 1 && (
          <span className="flex items-center gap-1 text-blue-400">
            <span>📍</span>
            <span>Multiple locations</span>
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        {provider.phone && (
          <a
            href={`tel:${provider.phone.replace(/\D/g, '')}`}
            className="flex-1 min-w-[100px] text-center bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            📞 Call Now
          </a>
        )}
        <Link
          href={`/?category=${provider.providerCategory}`}
          className="flex-1 min-w-[100px] text-center bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold px-3 py-2 rounded-lg border border-gray-700 transition-colors"
        >
          🚛 Request Help
        </Link>
      </div>

      {/* Claim CTA */}
      {unclaimed && (
        <Link
          href={`/providers/${provider.id}/claim`}
          className="text-center text-xs text-gray-500 hover:text-blue-400 border border-dashed border-gray-700 hover:border-blue-500/50 rounded-lg py-2 transition-colors"
        >
          🏢 Claim this business
        </Link>
      )}
    </div>
  )
}
