import Link from 'next/link'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { ProviderCategory, ProviderTier, VerificationStatus } from '@prisma/client'
import ProviderCard, { ProviderCardData } from './ProviderCard'
import FilterBar from './FilterBar'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Find Mobile Diesel Repair, Tire Service & Towing Providers | DieselRepairFinder',
  description:
    'Browse verified mobile diesel mechanics, mobile tire service providers, and heavy-duty tow trucks near you. Find roadside truck help 24/7.',
}

// Sort providers: verified first, then by tier, then rating/reviews, then has phone, then recently updated
function sortProviders(providers: ProviderCardData[]): ProviderCardData[] {
  const tierOrder: Record<ProviderTier, number> = { PREMIUM: 0, FEATURED: 1, FREE: 2 }
  return [...providers].sort((a, b) => {
    // 1. Verified first
    const aVerified = a.verificationStatus === 'VERIFIED' || a.isVerified ? 0 : 1
    const bVerified = b.verificationStatus === 'VERIFIED' || b.isVerified ? 0 : 1
    if (aVerified !== bVerified) return aVerified - bVerified
    // 2. Tier
    if (tierOrder[a.tier] !== tierOrder[b.tier]) return tierOrder[a.tier] - tierOrder[b.tier]
    // 3. Rating / review count
    const aScore = (a.rating ?? 0) + (a.reviewCount ?? 0) * 0.1
    const bScore = (b.rating ?? 0) + (b.reviewCount ?? 0) * 0.1
    if (aScore !== bScore) return bScore - aScore
    // 4. Has phone
    const aPhone = a.phone ? 0 : 1
    const bPhone = b.phone ? 0 : 1
    if (aPhone !== bPhone) return aPhone - bPhone
    return 0
  })
}

async function getProviders(state: string, city: string, category: string) {
  const where: Record<string, unknown> = { active: true }
  if (state) where.state = state
  if (city) where.city = { equals: city, mode: 'insensitive' }
  if (category) where.providerCategory = category as ProviderCategory

  const rows = await prisma.serviceProvider.findMany({
    where,
    select: {
      id: true,
      businessName: true,
      phone: true,
      website: true,
      city: true,
      state: true,
      services: true,
      providerCategory: true,
      tier: true,
      verificationStatus: true,
      isVerified: true,
      rating: true,
      reviewCount: true,
      claimStatus: true,
      is24_7: true,
    },
    take: 200,
  })

  return sortProviders(rows as ProviderCardData[])
}

async function getCitiesForState(state: string): Promise<string[]> {
  if (!state) return []
  const rows = await prisma.serviceProvider.findMany({
    where: { active: true, state },
    select: { city: true },
    distinct: ['city'],
    orderBy: { city: 'asc' },
  })
  return rows.map((r) => r.city)
}

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; city?: string; category?: string }>
}) {
  const params = await searchParams
  const state = params.state ?? ''
  const city = params.city ?? ''
  const category = params.category ?? ''

  const [providers, cities] = await Promise.all([
    getProviders(state, city, category),
    getCitiesForState(state),
  ])

  const categoryLabel =
    category === 'DIESEL_MECHANIC'
      ? 'Diesel Mechanics'
      : category === 'MOBILE_TIRE_SERVICE'
      ? 'Mobile Tire Services'
      : category === 'HEAVY_DUTY_WRECKER'
      ? 'Heavy-Duty Wreckers'
      : 'Service Providers'

  const heading = [
    categoryLabel,
    city ? `in ${city}` : '',
    state ? `(${state})` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-black/90 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🚛</span>
            <span className="font-bold text-lg text-white">
              Diesel<span className="text-blue-500">Repair</span>Finder
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/providers" className="text-blue-400 text-sm font-medium">
              Browse Providers
            </Link>
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Get Help Now
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
            {heading || 'Find Mobile Diesel Repair Near You'}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Browse verified providers offering mobile diesel repair, mobile tire service, and
            heavy-duty towing. Roadside truck help available 24/7 across the US.
          </p>
        </div>

        {/* Filter bar */}
        <Suspense>
          <FilterBar cities={cities} />
        </Suspense>

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-4">
          {providers.length === 0
            ? 'No providers found for the selected filters.'
            : `${providers.length} provider${providers.length !== 1 ? 's' : ''} found`}
        </p>

        {/* Provider grid */}
        {providers.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-400 mb-4">
              No providers found in that area yet. Try a different state or category.
            </p>
            <Link
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Submit a Service Request
            </Link>
          </div>
        )}

        {/* SEO text footer */}
        <div className="mt-16 border-t border-gray-800 pt-8 text-gray-500 text-sm space-y-2">
          <p>
            DieselRepairFinder connects truck drivers and fleet operators with local mobile diesel
            repair, mobile tire service, and heavy-duty towing providers. Whether you need roadside
            truck help, a mobile mechanic, or a heavy-duty wrecker, our directory covers providers
            across all 50 states.
          </p>
          <p>
            Find a verified mobile diesel mechanic near you — available for no-start issues, engine
            repair, DEF / emissions work, brake service, and more. Mobile tire service providers in
            our directory can handle flat repairs, tire replacements, and blowouts on-site.
            Heavy-duty towing and roadside truck recovery specialists are also listed.
          </p>
        </div>
      </main>
    </div>
  )
}
