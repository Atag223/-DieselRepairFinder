'use client'

import { useState } from 'react'

export default function VerifyLogin({ token }: { token: string }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function verify() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/providers/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? 'This sign-in link has expired.')
        return
      }
      window.location.assign(result.redirect)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-6">
      <p className="mb-5 text-gray-300">Confirm to securely open your provider account.</p>
      <button
        type="button"
        disabled={loading || !token}
        onClick={verify}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Continue to provider dashboard'}
      </button>
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      {!token && <p role="alert" className="mt-4 text-sm text-red-300">Invalid sign-in link.</p>}
    </div>
  )
}
