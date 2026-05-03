import { prisma } from '@/lib/prisma'
import { getProviderLeadStats } from '@/lib/leads'
import Link from 'next/link'
import { ClaimRequestStatus } from '@prisma/client'
import AdminLogout from './AdminLogout'

export const dynamic = 'force-dynamic'

const CLAIM_STATUS_STYLE: Record<ClaimRequestStatus, string> = {
  NEW: 'bg-blue-500/20 text-blue-400',
  CONTACTED: 'bg-yellow-500/20 text-yellow-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  DECLINED: 'bg-red-500/20 text-red-400',
}

export default async function AdminPage() {
  let stats: Awaited<ReturnType<typeof getProviderLeadStats>> = []
  let claimRequests: Awaited<ReturnType<typeof fetchClaimRequests>> = []
  let providerSummary: Awaited<ReturnType<typeof fetchProviderSummary>> | null = null
  let error: string | null = null

  try {
    ;[stats, claimRequests, providerSummary] = await Promise.all([
      getProviderLeadStats(),
      fetchClaimRequests(),
      fetchProviderSummary(),
    ])
  } catch (err) {
    console.error('Admin page error:', err)
    error = 'Unable to load data. Check your database connection.'
  }

  const totalLeadsSent = stats.reduce((sum, p) => sum + p.leadsReceived, 0)
  const totalRevenue = stats.reduce((sum, p) => sum + p.estimatedRevenue, 0)
  const totalCharged = stats.reduce((sum, p) => sum + p.totalLeadsCharged, 0)

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-gray-800 bg-black/90 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🚛</span>
            <span className="font-bold text-lg text-white">
              Diesel<span className="text-blue-500">Repair</span>Finder
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/providers"
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              Manage Providers
            </Link>
            <AdminLogout />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {error ? (
          <div className="bg-red-950 border border-red-700 rounded-xl p-6 text-red-300">
            {error}
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold mb-2">Admin Dashboard</h1>
            <p className="text-gray-400 mb-8">Provider overview, leads, and claim requests.</p>

            {/* Summary cards */}
            <div className="grid sm:grid-cols-4 gap-4 mb-10">
              {[
                { label: 'Total Providers', value: providerSummary?.total ?? '–' },
                { label: 'Total Leads Sent', value: totalLeadsSent },
                { label: 'Paid Leads', value: totalCharged },
                { label: 'Est. Revenue', value: `$${totalRevenue.toLocaleString()}` },
              ].map((card) => (
                <div
                  key={card.label}
                  className="bg-gray-950 border border-gray-800 rounded-xl p-5"
                >
                  <div className="text-2xl font-extrabold text-blue-400">{card.value}</div>
                  <div className="text-gray-400 text-sm mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Provider breakdown */}
            {providerSummary && (
              <div className="mb-10">
                <h2 className="text-xl font-bold mb-4">Provider Summary</h2>
                <div className="grid sm:grid-cols-3 gap-4 mb-4">
                  {[
                    { label: 'Diesel Mechanics', value: providerSummary.byCategory.DIESEL_MECHANIC, icon: '🔧' },
                    { label: 'Mobile Tire Services', value: providerSummary.byCategory.MOBILE_TIRE_SERVICE, icon: '🛞' },
                    { label: 'Heavy-Duty Wreckers', value: providerSummary.byCategory.HEAVY_DUTY_WRECKER, icon: '🚨' },
                  ].map((c) => (
                    <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{c.icon}</span>
                        <span className="text-gray-400 text-sm">{c.label}</span>
                      </div>
                      <div className="text-xl font-bold text-white">{c.value}</div>
                    </div>
                  ))}
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Verified', value: providerSummary.byVerification.verified, cls: 'text-green-400' },
                    { label: 'Unverified', value: providerSummary.byVerification.unverified, cls: 'text-gray-400' },
                    { label: 'Claimed', value: providerSummary.byClaim.claimed, cls: 'text-blue-400' },
                  ].map((c) => (
                    <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="text-sm text-gray-400 mb-1">{c.label}</div>
                      <div className={`text-xl font-bold ${c.cls}`}>{c.value}</div>
                    </div>
                  ))}
                </div>
                <div className="grid sm:grid-cols-3 gap-4 mt-4">
                  {[
                    { label: 'Active', value: providerSummary.total, cls: 'text-green-400' },
                    { label: 'Suspended', value: providerSummary.suspended, cls: 'text-yellow-400' },
                    { label: 'Unclaimed', value: providerSummary.byClaim.unclaimed, cls: 'text-gray-400' },
                  ].map((c) => (
                    <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="text-sm text-gray-400 mb-1">{c.label}</div>
                      <div className={`text-xl font-bold ${c.cls}`}>{c.value}</div>
                    </div>
                  ))}
                </div>

                {/* By state */}
                {providerSummary.byState.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Top States</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {providerSummary.byState.map((s) => (
                        <div key={s.state} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
                          <div className="text-base font-bold text-white">{s.count}</div>
                          <div className="text-xs text-gray-400">{s.state}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Claim Requests */}
            <div className="mb-10">
              <h2 className="text-xl font-bold mb-4">
                Claim Requests
                {claimRequests.length > 0 && (
                  <span className="text-sm text-blue-400 font-normal ml-2">
                    ({claimRequests.length})
                  </span>
                )}
              </h2>
              {claimRequests.length === 0 ? (
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 text-gray-500 text-sm">
                  No claim requests yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-800">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900 text-gray-400 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Business</th>
                        <th className="px-4 py-3 font-medium">Contact</th>
                        <th className="px-4 py-3 font-medium">Phone</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Notes</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {claimRequests.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-900/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{r.businessName}</div>
                            <div className="text-gray-500 text-xs">
                              {r.provider.city}, {r.provider.state}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{r.contactName}</td>
                          <td className="px-4 py-3 text-gray-300">{r.phone}</td>
                          <td className="px-4 py-3 text-gray-300">{r.email}</td>
                          <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">
                            {r.notes ?? '–'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${CLAIM_STATUS_STYLE[r.status]}`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {r.createdAt.toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Lead Stats Table */}
            <div>
              <h2 className="text-xl font-bold mb-4">Provider Lead Stats</h2>
              {stats.length === 0 ? (
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
                  No providers found.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-800">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900 text-gray-400 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Provider</th>
                        <th className="px-4 py-3 font-medium">City</th>
                        <th className="px-4 py-3 font-medium">State</th>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium">Tier</th>
                        <th className="px-4 py-3 font-medium">Verification</th>
                        <th className="px-4 py-3 font-medium">Leads</th>
                        <th className="px-4 py-3 font-medium">Free Left</th>
                        <th className="px-4 py-3 font-medium">Paid</th>
                        <th className="px-4 py-3 font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {stats.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-900/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-white">{p.businessName}</td>
                          <td className="px-4 py-3 text-gray-400">{p.city}</td>
                          <td className="px-4 py-3 text-gray-400">{p.state}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{p.category}</td>
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
                          <td className="px-4 py-3 text-gray-200">{p.leadsReceived}</td>
                          <td className="px-4 py-3">
                            <span
                              className={p.freeLeadsRemaining > 0 ? 'text-green-400' : 'text-red-400'}
                            >
                              {p.freeLeadsRemaining}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-200">{p.totalLeadsCharged}</td>
                          <td className="px-4 py-3 text-green-400">
                            ${p.estimatedRevenue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

async function fetchClaimRequests() {
  return prisma.providerClaimRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      provider: { select: { city: true, state: true } },
    },
  })
}

async function fetchProviderSummary() {
  const [total, totalAll, suspended, byCategory, byVerification, byClaim, byState] = await Promise.all([
    prisma.serviceProvider.count({ where: { active: true, deletedAt: null } }),
    prisma.serviceProvider.count({ where: { deletedAt: null } }),
    prisma.serviceProvider.count({ where: { active: false, suspendedAt: { not: null }, deletedAt: null } }),
    prisma.serviceProvider.groupBy({
      by: ['providerCategory'],
      where: { active: true, deletedAt: null },
      _count: true,
    }),
    prisma.serviceProvider.groupBy({
      by: ['verificationStatus'],
      where: { active: true, deletedAt: null },
      _count: true,
    }),
    prisma.serviceProvider.groupBy({
      by: ['claimStatus'],
      where: { active: true, deletedAt: null },
      _count: true,
    }),
    prisma.serviceProvider.groupBy({
      by: ['state'],
      where: { active: true, deletedAt: null },
      _count: true,
      orderBy: { _count: { state: 'desc' } },
      take: 10,
    }),
  ])

  const catMap = Object.fromEntries(byCategory.map((r) => [r.providerCategory, r._count]))
  const verMap = Object.fromEntries(byVerification.map((r) => [r.verificationStatus, r._count]))
  const claimMap = Object.fromEntries(byClaim.map((r) => [r.claimStatus, r._count]))

  return {
    total,
    totalAll,
    suspended,
    byCategory: {
      DIESEL_MECHANIC: catMap.DIESEL_MECHANIC ?? 0,
      MOBILE_TIRE_SERVICE: catMap.MOBILE_TIRE_SERVICE ?? 0,
      HEAVY_DUTY_WRECKER: catMap.HEAVY_DUTY_WRECKER ?? 0,
    },
    byVerification: {
      verified: verMap.VERIFIED ?? 0,
      unverified: verMap.UNVERIFIED ?? 0,
      rejected: verMap.REJECTED ?? 0,
    },
    byClaim: {
      unclaimed: claimMap.UNCLAIMED ?? 0,
      pending: claimMap.PENDING ?? 0,
      claimed: claimMap.CLAIMED ?? 0,
    },
    byState: byState.map((r) => ({ state: r.state, count: r._count })),
  }
}
