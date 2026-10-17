'use client'

import { useState } from 'react'

export default function PlacementActions({
  id,
  status,
  stripeCheckoutSessionId,
}: {
  id: string
  status: string
  stripeCheckoutSessionId: string | null
}) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function act(action: string) {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/placements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (response.ok) {
        window.location.reload()
        return
      }
      const result = await response.json()
      setError(result.error ?? 'Unable to update placement.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {stripeCheckoutSessionId && status === 'REQUESTED' && (
        <p className="text-xs text-yellow-300">Stripe Checkout pending; payment confirmation activates the placement.</p>
      )}
      {!stripeCheckoutSessionId && status === 'REQUESTED' && (
        <button disabled={loading} onClick={() => act('approve')} className="rounded bg-blue-700 px-3 py-2 text-xs disabled:opacity-50">
          Approve &amp; arrange payment
        </button>
      )}
      {!stripeCheckoutSessionId && status === 'APPROVED' && (
        <button disabled={loading} onClick={() => act('confirm-payment')} className="rounded bg-green-700 px-3 py-2 text-xs disabled:opacity-50">
          Confirm payment &amp; activate
        </button>
      )}
      {!stripeCheckoutSessionId && ['REQUESTED', 'APPROVED'].includes(status) && (
        <button disabled={loading} onClick={() => act('decline')} className="rounded border border-red-700 px-3 py-2 text-xs text-red-300 disabled:opacity-50">
          Decline
        </button>
      )}
      {error && <p role="alert" className="w-full text-xs text-red-300">{error}</p>}
    </div>
  )
}
