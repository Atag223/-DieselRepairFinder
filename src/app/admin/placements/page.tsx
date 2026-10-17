import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import BrandLogo from '@/app/components/BrandLogo'
import PlacementActions from './PlacementActions'

export const dynamic = 'force-dynamic'

export default async function AdminPlacementsPage() {
  const placements = await prisma.listingPlacement.findMany({
    include: { provider: { select: { businessName: true, email: true } } },
    orderBy: { requestedAt: 'desc' },
  })
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-gray-800 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/admin"><BrandLogo /></Link>
          <Link href="/admin" className="text-sm text-blue-400">Admin dashboard</Link>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-2 text-3xl font-bold">State Placement Requests</h1>
        <p className="mb-8 text-gray-400">Approve requests and arrange payment. Confirm payment only after receipt is verified; placement activation starts its one-year period.</p>
        <div className="space-y-4">
          {placements.map((placement) => (
            <article key={placement.id} className="rounded-xl border border-gray-800 bg-gray-950 p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <h2 className="text-lg font-semibold">{placement.tier} · {placement.state} · {placement.tier === 'FEATURED' ? '$1,250/year' : '$1,500/year'}</h2>
                  <p className="text-sm text-gray-300">{placement.provider.businessName} · {placement.provider.email}</p>
                  <p className="text-sm text-gray-400">Status: {placement.status} · Payment: {placement.paymentStatus}</p>
                  <p className="text-xs text-gray-500">Requested {placement.requestedAt.toLocaleString()}{placement.expiresAt ? ` · Expires ${placement.expiresAt.toLocaleDateString()}` : ''}</p>
                </div>
                <PlacementActions id={placement.id} status={placement.status} />
              </div>
            </article>
          ))}
          {placements.length === 0 && <p className="text-gray-400">No placement requests yet.</p>}
        </div>
      </main>
    </div>
  )
}
