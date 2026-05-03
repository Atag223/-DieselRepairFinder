import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ProviderCategory } from '@prisma/client'
import AdminProviderActions from './AdminProviderActions'
import AdminLogout from '../AdminLogout'

export const dynamic = 'force-dynamic'

const CATEGORY_LABEL: Record<ProviderCategory, string> = {
  DIESEL_MECHANIC: 'Diesel Mechanic',
  MOBILE_TIRE_SERVICE: 'Mobile Tire',
  HEAVY_DUTY_WRECKER: 'Wrecker',
}

interface SearchParams {
  search?: string
  state?: string
  city?: string
  category?: string
  showDeleted?: string
}

async function getProviders(filters: SearchParams) {
  const where: Record<string, unknown> = {}

  // By default, hide soft-deleted providers; show them only when showDeleted=1
  if (filters.showDeleted !== '1') {
    where.deletedAt = null
  }

  if (filters.search) {
    where.businessName = { contains: filters.search, mode: 'insensitive' }
  }
  if (filters.state) where.state = filters.state
  if (filters.city) where.city = { equals: filters.city, mode: 'insensitive' }
  if (filters.category) where.providerCategory = filters.category as ProviderCategory

  return prisma.serviceProvider.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      businessName: true,
      city: true,
      state: true,
      providerCategory: true,
      tier: true,
      active: true,
      verificationStatus: true,
      claimStatus: true,
      suspendedAt: true,
      suspendedReason: true,
      deletedAt: true,
      phone: true,
      email: true,
      createdAt: true,
    },
  })
}

export default async function AdminProvidersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const providers = await getProviders(params)

  const states = await prisma.serviceProvider.findMany({
    select: { state: true },
    distinct: ['state'],
    orderBy: { state: 'asc' },
  })

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-gray-800 bg-black/90 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🚛</span>
              <span className="font-bold text-lg text-white">
                Diesel<span className="text-blue-500">Repair</span>Finder
              </span>
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/admin" className="text-gray-400 hover:text-white text-sm transition-colors">
              Dashboard
            </Link>
          </div>
          <AdminLogout />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold">Manage Providers</h1>
            <p className="text-gray-400 text-sm mt-1">
              {providers.length} provider{providers.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <Link
            href="/admin/providers/new"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Add Provider
          </Link>
        </div>

        {/* Filters */}
        <form method="GET" className="flex flex-wrap gap-3 mb-6">
          <input
            name="search"
            defaultValue={params.search ?? ''}
            placeholder="Search by name…"
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-48"
          />
          <select
            name="state"
            defaultValue={params.state ?? ''}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All States</option>
            {states.map((s) => (
              <option key={s.state} value={s.state}>
                {s.state}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue={params.category ?? ''}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Categories</option>
            <option value="DIESEL_MECHANIC">Diesel Mechanic</option>
            <option value="MOBILE_TIRE_SERVICE">Mobile Tire Service</option>
            <option value="HEAVY_DUTY_WRECKER">Heavy-Duty Wrecker</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer px-1">
            <input
              type="checkbox"
              name="showDeleted"
              value="1"
              defaultChecked={params.showDeleted === '1'}
              className="accent-red-500"
            />
            Show deleted
          </label>
          <button
            type="submit"
            className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Filter
          </button>
          {(params.search || params.state || params.city || params.category || params.showDeleted) && (
            <a
              href="/admin/providers"
              className="text-gray-400 hover:text-white text-sm px-3 py-2 transition-colors"
            >
              Clear
            </a>
          )}
        </form>

        {/* Table */}
        {providers.length === 0 ? (
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-10 text-center text-gray-500">
            No providers found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Verify</th>
                  <th className="px-4 py-3 font-medium">Claim</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {providers.map((p) => {
                  const isDeleted = !!p.deletedAt
                  const isSuspended = !p.active && !!p.suspendedAt && !isDeleted

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-900/50 transition-colors ${
                        isDeleted
                          ? 'opacity-40'
                          : isSuspended
                          ? 'opacity-60'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{p.businessName}</div>
                        {p.phone && <div className="text-gray-500 text-xs">{p.phone}</div>}
                        {p.email && <div className="text-gray-500 text-xs">{p.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {p.city}, {p.state}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {CATEGORY_LABEL[p.providerCategory]}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                            p.tier === 'PREMIUM'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : p.tier === 'FEATURED'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {p.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isDeleted ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-red-900/60 text-red-400">
                            Deleted
                          </span>
                        ) : isSuspended ? (
                          <span
                            className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-yellow-900/60 text-yellow-400"
                            title={p.suspendedReason ?? undefined}
                          >
                            Suspended
                          </span>
                        ) : p.active ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-900/60 text-green-400">
                            Active
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-gray-700 text-gray-400">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                            p.verificationStatus === 'VERIFIED'
                              ? 'bg-green-500/20 text-green-400'
                              : p.verificationStatus === 'REJECTED'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {p.verificationStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                            p.claimStatus === 'CLAIMED'
                              ? 'bg-blue-500/20 text-blue-400'
                              : p.claimStatus === 'PENDING'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {p.claimStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {p.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <AdminProviderActions
                          providerId={p.id}
                          isActive={p.active}
                          isSuspended={isSuspended}
                          isDeleted={isDeleted}
                          isPending={!p.active && !isSuspended && !isDeleted}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
