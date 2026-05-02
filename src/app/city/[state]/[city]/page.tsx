import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProviderTier } from '@prisma/client'
import ProviderCard, { ProviderCardData } from '@/app/providers/ProviderCard'

export const dynamic = 'force-dynamic'

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

function sortProviders(providers: ProviderCardData[]): ProviderCardData[] {
  const tierOrder: Record<ProviderTier, number> = { PREMIUM: 0, FEATURED: 1, FREE: 2 }
  return [...providers].sort((a, b) => {
    const aVerified = a.verificationStatus === 'VERIFIED' || a.isVerified ? 0 : 1
    const bVerified = b.verificationStatus === 'VERIFIED' || b.isVerified ? 0 : 1
    if (aVerified !== bVerified) return aVerified - bVerified
    if (tierOrder[a.tier] !== tierOrder[b.tier]) return tierOrder[a.tier] - tierOrder[b.tier]
    const aScore = (a.rating ?? 0) + (a.reviewCount ?? 0) * 0.1
    const bScore = (b.rating ?? 0) + (b.reviewCount ?? 0) * 0.1
    if (aScore !== bScore) return bScore - aScore
    const aPhone = a.phone ? 0 : 1
    const bPhone = b.phone ? 0 : 1
    return aPhone - bPhone
  })
}

interface Props {
  params: Promise<{ state: string; city: string }>
}

export async function generateMetadata({ params }: Props) {
  const { state: rawState, city: rawCity } = await params
  const state = rawState.toUpperCase()
  const city = decodeURIComponent(rawCity)
  const stateName = STATE_NAMES[state] ?? state
  return {
    title: `Mobile Diesel Repair in ${city}, ${stateName} | DieselRepairFinder`,
    description: `Find mobile diesel mechanics, mobile tire service, and heavy-duty towing in ${city}, ${stateName}. 24/7 roadside truck help near you.`,
  }
}

export default async function CityPage({ params }: Props) {
  const { state: rawState, city: rawCity } = await params
  const state = rawState.toUpperCase()
  const city = decodeURIComponent(rawCity)
  const stateName = STATE_NAMES[state]

  if (!stateName) notFound()

  const rows = await prisma.serviceProvider.findMany({
    where: {
      active: true,
      state,
      city: { equals: city, mode: 'insensitive' },
    },
    select: {
      id: true, businessName: true, phone: true, website: true, city: true, state: true,
      services: true, providerCategory: true, tier: true, verificationStatus: true,
      isVerified: true, rating: true, reviewCount: true, claimStatus: true, is24_7: true,
    },
    take: 200,
  })

  const providers = sortProviders(rows as ProviderCardData[])

  // Count nearby cities too (same state)
  const nearbyCities = await prisma.serviceProvider.findMany({
    where: { active: true, state },
    select: { city: true },
    distinct: ['city'],
    orderBy: { city: 'asc' },
  })

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
            <Link href="/providers" className="text-gray-400 hover:text-white text-sm">
              All Providers
            </Link>
            <Link href="/" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Get Help Now
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/providers" className="hover:text-white">Providers</Link>
          <span className="mx-2">›</span>
          <Link href={`/state/${state}`} className="hover:text-white">{stateName}</Link>
          <span className="mx-2">›</span>
          <span className="text-white">{city}</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
            Mobile Diesel Repair in {city}, {stateName}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Find mobile diesel mechanics, mobile tire service, and heavy-duty towing in{' '}
            {city}, {stateName}. Get roadside truck help 24/7 — no tow required.
          </p>
        </div>

        {/* Provider count */}
        <p className="text-sm text-gray-500 mb-6">
          {providers.length === 0
            ? `No providers listed in ${city} yet.`
            : `${providers.length} provider${providers.length !== 1 ? 's' : ''} in ${city}, ${state}`}
        </p>

        {/* Provider grid */}
        {providers.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {providers.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center mb-12">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-400 mb-4">
              No providers listed in {city} yet. Try browsing all of {stateName}.
            </p>
            <Link href={`/state/${state}`} className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              All Providers in {stateName}
            </Link>
          </div>
        )}

        {/* Nearby cities */}
        {nearbyCities.length > 1 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold mb-3">Other Cities in {stateName}</h2>
            <div className="flex flex-wrap gap-2">
              {nearbyCities
                .filter((c) => c.city.toLowerCase() !== city.toLowerCase())
                .map((c) => (
                  <Link
                    key={c.city}
                    href={`/city/${state}/${encodeURIComponent(c.city)}`}
                    className="text-sm bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {c.city}
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* SEO copy */}
        <div className="border-t border-gray-800 pt-8 text-gray-500 text-sm space-y-3">
          <h2 className="text-white font-semibold">
            Roadside Truck Help in {city}, {stateName}
          </h2>
          <p>
            DieselRepairFinder connects truck drivers and fleet operators with local mobile diesel
            repair, mobile tire service, and heavy-duty towing in {city}, {stateName}. Our
            providers come to you — roadside, truckstop, or job site. No tow required.
          </p>
          <p>
            Services available in {city}: mobile diesel repair, no-start &amp; engine diagnostics,
            DEF/emissions repair, air brake service, mobile tire service, blowout response, flat
            tire repair, heavy-duty wrecker, and roadside truck recovery.
          </p>
        </div>
      </main>
    </div>
  )
}
