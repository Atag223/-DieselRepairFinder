'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Package {
  credits: number
  amountCents: number
  label: string
  popular?: boolean
}

const PACKAGES: Package[] = [
  { credits: 5, amountCents: 12500, label: '5 leads – $125' },
  { credits: 10, amountCents: 25000, label: '10 leads – $250', popular: true },
  { credits: 20, amountCents: 50000, label: '20 leads – $500' },
]

interface Props {
  providerId: string
  businessName: string
  leadCredits: number
  stripeAccountBalanceCents: number
  freeLeadCreditsIssued: boolean
}

export default function BillingForm({
  providerId,
  businessName,
  leadCredits,
  stripeAccountBalanceCents,
  freeLeadCreditsIssued,
}: Props) {
  const [loading, setLoading] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function handleBuy(credits: number) {
    setLoading(credits)
    setError('')
    try {
      const res = await fetch(`/api/providers/${providerId}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits }),
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
      setLoading(null)
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
          Your first 3 leads are free after approval. After that, each qualified lead costs $25.
          Credits never expire. No monthly fees.
        </p>
      </div>

      {/* Buy credits */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Buy Lead Credits
        </h2>

        {error && (
          <div className="bg-red-950 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.credits}
              className={`relative border rounded-xl p-5 flex flex-col items-center text-center ${
                pkg.popular
                  ? 'border-blue-500 bg-blue-950/30'
                  : 'border-gray-700 bg-gray-900'
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                  Most Popular
                </span>
              )}
              <div className="text-4xl font-extrabold text-white mb-1">{pkg.credits}</div>
              <div className="text-gray-400 text-sm mb-1">leads</div>
              <div className="text-2xl font-bold text-blue-400 mb-1">
                ${(pkg.amountCents / 100).toFixed(0)}
              </div>
              <div className="text-gray-500 text-xs mb-4">
                ${(pkg.amountCents / 100 / pkg.credits).toFixed(0)} per lead
              </div>
              <button
                onClick={() => handleBuy(pkg.credits)}
                disabled={loading !== null}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                  pkg.popular
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-white'
                }`}
              >
                {loading === pkg.credits ? 'Redirecting…' : `Buy ${pkg.credits} Credits`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
