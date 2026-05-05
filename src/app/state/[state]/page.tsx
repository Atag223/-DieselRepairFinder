import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProviderTier, ProviderCategory } from '@prisma/client'
import ProviderCard, { ProviderCardData } from '@/app/providers/ProviderCard'
import SiteNav from '@/app/components/SiteNav'

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
  params: Promise<{ state: string }>
}

export async function generateMetadata({ params }: Props) {
  const { state } = await params
  const stateName = STATE_NAMES[state.toUpperCase()] ?? state.toUpperCase()
  return {
    title: `Mobile Diesel Repair & Roadside Truck Help in ${stateName} | DieselRepairFinder`,
    description: `Find mobile diesel mechanics, mobile tire service, and heavy-duty towing in ${stateName}. 24/7 roadside truck help near you.`,
  }
}

export default async function StatePage({ params }: Props) {
  const { state: rawState } = await params
  const state = rawState.toUpperCase()
  const stateName = STATE_NAMES[state]

  if (!stateName) notFound()

  const rows = await prisma.serviceProvider.findMany({
    where: { active: true, deletedAt: null, state },
    select: {
      id: true, businessName: true, phone: true, website: true, city: true, state: true,
      services: true, providerCategory: true, tier: true, verificationStatus: true,
      isVerified: true, rating: true, reviewCount: true, claimStatus: true, is24_7: true,
    },
    take: 300,
  })

  const providers = sortProviders(rows as ProviderCardData[])

  // Group by city for SEO section
  const cities = [...new Set(providers.map((p) => p.city))].sort()

  // Group by category
  const byCategory = {
    DIESEL_MECHANIC: providers.filter((p) => p.providerCategory === ProviderCategory.DIESEL_MECHANIC),
    MOBILE_TIRE_SERVICE: providers.filter((p) => p.providerCategory === ProviderCategory.MOBILE_TIRE_SERVICE),
    HEAVY_DUTY_WRECKER: providers.filter((p) => p.providerCategory === ProviderCategory.HEAVY_DUTY_WRECKER),
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteNav />

      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/providers" className="hover:text-white">Providers</Link>
          <span className="mx-2">›</span>
          <span className="text-white">{stateName}</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
            Mobile Diesel Repair in {stateName}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Find mobile diesel mechanics, mobile tire service, and heavy-duty towing in{' '}
            {stateName}. Get roadside truck help 24/7 — no tow required.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Diesel Mechanics', value: byCategory.DIESEL_MECHANIC.length, icon: '🔧' },
            { label: 'Mobile Tire Services', value: byCategory.MOBILE_TIRE_SERVICE.length, icon: '🛞' },
            { label: 'Heavy-Duty Wreckers', value: byCategory.HEAVY_DUTY_WRECKER.length, icon: '🚨' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-extrabold text-blue-400">{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Cities links */}
        {cities.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold mb-3">Browse by City in {stateName}</h2>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <Link
                  key={city}
                  href={`/city/${state}/${encodeURIComponent(city)}`}
                  className="text-sm bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  {city}
                </Link>
              ))}
            </div>
          </div>
        )}

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
              No providers listed in {stateName} yet.
            </p>
            <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              Submit a Service Request
            </Link>
          </div>
        )}

        {/* SEO copy */}
        <div className="mt-16 border-t border-gray-800 pt-8 text-gray-500 text-sm space-y-3">
          <h2 className="text-white font-semibold">Mobile Diesel Repair in {stateName}</h2>
          <p>
            DieselRepairFinder lists mobile diesel repair services, mobile tire service providers,
            and heavy-duty towing companies across {stateName}. Whether your truck breaks down on
            the interstate or at a job site, our network of verified roadside truck help providers
            can come to you.
          </p>
          <p>
            Our {stateName} providers offer: mobile diesel repair, no-start assistance, engine
            diagnostics, DEF/emissions repair, air brake service, tire changes, blowout response,
            and heavy-duty wrecker &amp; recovery services.
          </p>
        </div>
      </main>
    </div>
  )
}
