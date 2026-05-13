'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

interface Transaction {
  id: string
  createdAt: string
  amount: number
  type: string
  note: string | null
}

interface Props {
  providerId: string
  leadCredits: number
  stripeAccountBalanceCents: number
  freeLeadCreditsIssued: boolean
  lastCreditGrantAt: string | null
  transactions: Transaction[]
}

const TYPE_LABELS: Record<string, string> = {
  FREE_CREDIT: 'Free Credit',
  ADMIN_GRANT: 'Admin Grant',
  STRIPE_PURCHASE: 'Stripe Purchase',
  LEAD_DEBIT: 'Lead Debit',
  REFUND: 'Refund',
}

export default function AdminCreditManager({
  providerId,
  leadCredits: initialCredits,
  stripeAccountBalanceCents,
  freeLeadCreditsIssued,
  lastCreditGrantAt,
  transactions,
}: Props) {
  const router = useRouter()
  const [credits, setCredits] = useState(initialCredits)
  const [grantAmount, setGrantAmount] = useState('')
  const [grantNote, setGrantNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleGrant(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const amount = Number(grantAmount)
    if (!amount || amount <= 0) {
      setError('Enter a valid credit amount (positive integer).')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/providers/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'grant-credits', amount, note: grantNote }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to grant credits')
        return
      }
      setCredits(data.provider.leadCredits)
      setGrantAmount('')
      setGrantNote('')
      setSuccess(`${amount} credit${amount !== 1 ? 's' : ''} granted successfully.`)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Lead Credits</h2>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-2xl font-extrabold text-blue-400">{credits}</div>
          <div className="text-gray-500 text-xs mt-0.5">Credits available</div>
        </div>
        <div>
          <div className="text-2xl font-extrabold text-green-400">
            ${(stripeAccountBalanceCents / 100).toFixed(2)}
          </div>
          <div className="text-gray-500 text-xs mt-0.5">Stripe prepaid balance</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-gray-500">Free credits issued: </span>
          <span className={freeLeadCreditsIssued ? 'text-green-400' : 'text-gray-400'}>
            {freeLeadCreditsIssued ? 'Yes' : 'No'}
          </span>
        </div>
        {lastCreditGrantAt && (
          <div>
            <span className="text-gray-500">Last grant: </span>
            <span className="text-gray-300">
              {new Date(lastCreditGrantAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Grant credits form */}
      <form onSubmit={handleGrant} className="space-y-3 border-t border-gray-800 pt-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Grant Credits
        </h3>

        {error && (
          <div className="bg-red-950 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-950 border border-green-700 text-green-300 rounded-lg px-3 py-2 text-sm">
            {success}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Credits</label>
            <input
              type="number"
              min="1"
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              placeholder="e.g. 5"
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Note (optional)</label>
            <input
              type="text"
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value)}
              placeholder="Reason for grant"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? 'Granting…' : 'Grant Credits'}
        </button>
      </form>

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div className="border-t border-gray-800 pt-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Credit Transaction History
          </h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`font-bold ${t.amount > 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {t.amount > 0 ? '+' : ''}{t.amount}
                  </span>
                  <span className="text-gray-400">
                    {TYPE_LABELS[t.type] ?? t.type}
                  </span>
                  {t.note && (
                    <span className="text-gray-600 truncate max-w-[160px]">{t.note}</span>
                  )}
                </div>
                <span className="text-gray-600 shrink-0">
                  {new Date(t.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
