'use client'

import { useState } from 'react'

export default function PlacementActions({ id, status }: { id: string; status: string }) {
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
      {status === 'REQUESTED' && (
        <button disabled={loading} onClick={() => act('approve')} className="rounded bg-blue-700 px-3 py-2 text-xs disabled:opacity-50">
          Approve &amp; arrange payment
        </button>
      )}
      {status === 'APPROVED' && (
        <button disabled={loading} onClick={() => act('confirm-payment')} className="rounded bg-green-700 px-3 py-2 text-xs disabled:opacity-50">
          Confirm payment &amp; activate
        </button>
      )}
      {['REQUESTED', 'APPROVED'].includes(status) && (
        <button disabled={loading} onClick={() => act('decline')} className="rounded border border-red-700 px-3 py-2 text-xs text-red-300 disabled:opacity-50">
          Decline
        </button>
      )}
      {error && <p role="alert" className="w-full text-xs text-red-300">{error}</p>}
    </div>
  )
}
