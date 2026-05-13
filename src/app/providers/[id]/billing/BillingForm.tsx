'use client'

import { useState } from 'react'
import { BILLING_PACKAGES, BillingPackage } from '@/lib/billing'

interface Props {
  providerId: string
  businessName: string
  leadCredits: number
  stripeAccountBalanceCents: number
  freeLeadCreditsIssued: boolean
}

export default function BillingForm({
  providerId,
  leadCredits,
  stripeAccountBalanceCents,
  freeLeadCreditsIssued,
}: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedPkg: BillingPackage | undefined = BILLING_PACKAGES.find(
    (p) => p.key === selectedKey
  )

  async function handleCheckout() {
    if (!selectedPkg) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/providers/${providerId}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageKey: selectedPkg.key }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to start checkout')
        return
      }
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Current balance */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Your Account
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-3xl font-extrabold text-blue-400">{leadCredits}</div>
            <div className="text-gray-400 text-sm mt-1">Lead Credits Available</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-green-400">
              ${(stripeAccountBalanceCents / 100).toFixed(2)}
            </div>
            <div className="text-gray-400 text-sm mt-1">Prepaid Balance</div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Free credits issued:{' '}
          <span className={freeLeadCreditsIssued ? 'text-green-400' : 'text-gray-500'}>
            {freeLeadCreditsIssued ? 'Yes ✓' : 'Not yet'}
          </span>
        </div>
      </div>

      {/* Pricing explanation */}
      <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-5 text-sm text-blue-300">
        <p className="font-semibold mb-1">How it works</p>
        <p>
          Your first 3 accepted leads are free after approval. After that, $25 per accepted
          qualified lead. Credits are only used when you accept a qualified lead. Credits never
          expire. No monthly fees.
        </p>
      </div>

      {/* Buy credits */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Buy Lead Credits
        </h2>
        <p className="text-gray-500 text-xs mb-5">
          Bulk packages include bonus lead credits. Select a package to continue.
        </p>

        {error && (
          <div className="bg-red-950 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          {BILLING_PACKAGES.map((pkg) => {
            const isSelected = selectedKey === pkg.key
            return (
              <button
                key={pkg.key}
                type="button"
                onClick={() => setSelectedKey(pkg.key)}
                className={`relative border rounded-xl p-5 flex flex-col items-center text-center transition-colors focus:outline-none ${
                  isSelected
                    ? 'border-blue-500 bg-blue-950/40 ring-2 ring-blue-500/50'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800/60'
                }`}
              >
                {pkg.bonusLabel && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                    {pkg.bonusLabel}
                  </span>
                )}
                <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                  {pkg.name}
                </div>
                <div className="text-4xl font-extrabold text-white mb-0.5">
                  {pkg.awardedCredits}
                </div>
                <div className="text-gray-400 text-xs mb-0.5">
                  lead credits
                  {pkg.bonusCredits > 0 && (
                    <span className="text-green-400 ml-1">
                      ({pkg.paidCredits} + {pkg.bonusCredits} bonus)
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-blue-400 mt-2">
                  ${(pkg.amountCents / 100).toFixed(0)}
                </div>
                <div className="text-gray-500 text-xs">
                  ${(pkg.amountCents / 100 / pkg.paidCredits).toFixed(0)}/lead
                </div>
                {isSelected && (
                  <div className="mt-3 text-xs font-semibold text-blue-400">✓ Selected</div>
                )}
              </button>
            )
          })}
        </div>

        <button
          onClick={handleCheckout}
          disabled={!selectedPkg || loading}
          className="w-full py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white"
        >
          {loading
            ? 'Redirecting to checkout…'
            : selectedPkg
            ? `Buy ${selectedPkg.name} — ${selectedPkg.awardedCredits} credits for $${selectedPkg.amountCents / 100}`
            : 'Select a package to continue'}
        </button>

        <p className="text-gray-600 text-xs text-center mt-3">
          Credits are only used when you accept a qualified lead.
        </p>
      </div>
    </div>
  )
}
