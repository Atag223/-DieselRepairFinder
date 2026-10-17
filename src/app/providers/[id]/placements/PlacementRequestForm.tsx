'use client'

import { useEffect, useState } from 'react'

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA',
  'RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

export default function PlacementRequestForm({ providerId }: { providerId: string }) {
  const [tier, setTier] = useState<'FEATURED' | 'PREMIUM'>('FEATURED')
  const [state, setState] = useState('')
  const [available, setAvailable] = useState<boolean | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!state) {
      setAvailable(null)
      return
    }
    let cancelled = false
    fetch(`/api/providers/placements?providerId=${encodeURIComponent(providerId)}&state=${state}&tier=${tier}`)
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? 'Unable to check placement availability.')
        if (!cancelled) setAvailable(Boolean(result.available))
      })
      .catch((error) => {
        if (!cancelled) {
          setAvailable(false)
          setMessage(error.message)
        }
      })
    return () => { cancelled = true }
  }, [providerId, state, tier])

  async function submit() {
    if (!state || !available) return
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/providers/placements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, state, tier }),
      })
      const result = await response.json()
      setMessage(result.message ?? result.error ?? 'Unable to submit request.')
      if (response.ok) setAvailable(false)
    } catch {
      setMessage('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const price = tier === 'FEATURED' ? '$1,250/year' : '$1,500/year'
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-400">
        Request an annual advertising placement. Administration will confirm availability, approve
        the request, and arrange payment. It stays inactive until both approval and payment are confirmed.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['FEATURED', 'PREMIUM'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => { setTier(option); setAvailable(null); setMessage('') }}
            className={`rounded-xl border p-4 text-left ${tier === option ? 'border-blue-500 bg-blue-950/40' : 'border-gray-700 bg-gray-900'}`}
          >
            <span className="block font-semibold">{option === 'FEATURED' ? 'Featured' : 'Premium'} State Placement</span>
            <span className="text-sm text-gray-400">{option === 'FEATURED' ? '$1,250/year' : '$1,500/year'}</span>
          </button>
        ))}
      </div>
      <label className="block text-sm text-gray-300">
        Select placement state
        <select
          value={state}
          onChange={(event) => { setState(event.target.value); setAvailable(null); setMessage('') }}
          className="mt-2 block w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white"
        >
          <option value="">Choose a state</option>
          {STATES.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      {state && (
        <p role="status" className="text-sm">
          {available === null ? 'Checking availability…' : available ? `${tier} placement is available in ${state}.` : 'This placement is unavailable in the selected state.'}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={!available || loading}
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Sending request…' : `Request ${tier === 'FEATURED' ? 'Featured' : 'Premium'} Placement — ${price}`}
      </button>
      {message && <p role="status" className="text-sm text-gray-300">{message}</p>}
    </div>
  )
}
