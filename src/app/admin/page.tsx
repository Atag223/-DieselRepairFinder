import { getProviderLeadStats } from '@/lib/leads'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  let stats: Awaited<ReturnType<typeof getProviderLeadStats>> = []
  let error: string | null = null

  try {
    stats = await getProviderLeadStats()
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
          <span className="text-gray-400 text-sm">Admin · Lead Dashboard</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-extrabold mb-2">Lead Dashboard</h1>
        <p className="text-gray-400 mb-8">Provider lead usage and billing overview.</p>

        {error ? (
          <div className="bg-red-950 border border-red-700 rounded-xl p-6 text-red-300">
            {error}
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid sm:grid-cols-3 gap-4 mb-10">
              {[
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

            {/* Provider table */}
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
                      <th className="px-4 py-3 font-medium">State</th>
                      <th className="px-4 py-3 font-medium">Tier</th>
                      <th className="px-4 py-3 font-medium">Leads Received</th>
                      <th className="px-4 py-3 font-medium">Free Remaining</th>
                      <th className="px-4 py-3 font-medium">Paid Leads</th>
                      <th className="px-4 py-3 font-medium">Est. Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {stats.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-900/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{p.businessName}</td>
                        <td className="px-4 py-3 text-gray-400">{p.state}</td>
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
                        <td className="px-4 py-3 text-gray-200">{p.leadsReceived}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              p.freeLeadsRemaining > 0 ? 'text-green-400' : 'text-red-400'
                            }
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
          </>
        )}
      </main>
    </div>
  )
}
