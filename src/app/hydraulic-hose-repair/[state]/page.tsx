import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProviderTier } from '@prisma/client'
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
    title: `Emergency Hydraulic Hose Repair in ${stateName} | DieselRepairFinder`,
    description: `Find mobile hydraulic hose repair, on-site hydraulic repair, and heavy equipment hydraulic service in ${stateName}.`,
  }
}

export default async function HydraulicHoseRepairStatePage({ params }: Props) {
  const { state: rawState } = await params
  const state = rawState.toUpperCase()
  const stateName = STATE_NAMES[state]

  if (!stateName) notFound()

  const rows = await prisma.serviceProvider.findMany({
    where: {
      active: true,
      deletedAt: null,
      providerCategory: 'HYDRAULIC_HOSE_REPAIR',
      OR: [{ state }, { locations: { some: { state, active: true } } }],
    },
    select: {
      id: true, businessName: true, phone: true, website: true, city: true, state: true,
      services: true, providerCategory: true, tier: true, verificationStatus: true,
      isVerified: true, rating: true, reviewCount: true, claimStatus: true, is24_7: true,
    },
    take: 300,
  })

  const providers = sortProviders(rows as ProviderCardData[])
  const cities = [...new Set(providers.map((p) => p.city))].sort()

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteNav />

      <main className="max-w-7xl mx-auto px-4 py-10">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/hydraulic-hose-repair" className="hover:text-white">Hydraulic Hose Repair</Link>
          <span className="mx-2">›</span>
          <span className="text-white">{stateName}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
            Mobile Hydraulic Hose Repair in {stateName}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Find on-site hydraulic hose repair, emergency hydraulic line service, and heavy
            equipment hydraulic specialists across {stateName}.
          </p>
        </div>

        {cities.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold mb-3">Browse Hydraulic Hose Repair by City</h2>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <Link
                  key={city}
                  href={`/hydraulic-hose-repair/${state}/${encodeURIComponent(city)}`}
                  className="text-sm bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  {city}
                </Link>
              ))}
            </div>
          </div>
        )}

        {providers.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-400 mb-4">
              No hydraulic hose repair providers are listed in {stateName} yet.
            </p>
            <Link
              href="/?category=hydraulic-hose-repair#request"
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Request Hydraulic Hose Repair
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
