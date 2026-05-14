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
  params: Promise<{ state: string; city: string }>
}

export async function generateMetadata({ params }: Props) {
  const { state: rawState, city: rawCity } = await params
  const state = rawState.toUpperCase()
  const city = decodeURIComponent(rawCity)
  const stateName = STATE_NAMES[state] ?? state
  return {
    title: `24/7 Hydraulic Hose Service in ${city}, ${stateName} | DieselRepairFinder`,
    description: `Find mobile hydraulic hose repair, on-site hydraulic repair, and heavy equipment hydraulic service in ${city}, ${stateName}.`,
  }
}

export default async function HydraulicHoseRepairCityPage({ params }: Props) {
  const { state: rawState, city: rawCity } = await params
  const state = rawState.toUpperCase()
  const city = decodeURIComponent(rawCity)
  const stateName = STATE_NAMES[state]

  if (!stateName) notFound()

  const rows = await prisma.serviceProvider.findMany({
    where: {
      active: true,
      deletedAt: null,
      providerCategory: 'HYDRAULIC_HOSE_REPAIR',
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

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteNav />

      <main className="max-w-7xl mx-auto px-4 py-10">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/hydraulic-hose-repair" className="hover:text-white">Hydraulic Hose Repair</Link>
          <span className="mx-2">›</span>
          <Link href={`/hydraulic-hose-repair/${state}`} className="hover:text-white">{stateName}</Link>
          <span className="mx-2">›</span>
          <span className="text-white">{city}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
            Mobile Hydraulic Hose Repair in {city}, {stateName}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Browse emergency hydraulic hose repair providers for blown hoses, leaking hydraulic
            lines, hydraulic fitting repair, and heavy equipment hydraulic issues in {city}.
          </p>
        </div>

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
              No hydraulic hose repair providers are listed in {city} yet.
            </p>
            <Link
              href="/?category=hydraulic-hose-repair#request"
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Send Job Request
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
