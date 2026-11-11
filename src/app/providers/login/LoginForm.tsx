'use client'

import { useState } from 'react'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/providers/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = await response.json()
      setMessage(result.message ?? result.error ?? 'Unable to request a sign-in link.')
    } catch {
      setMessage('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label htmlFor="provider-email" className="block text-sm text-gray-300">
        Email associated with your approved provider listing
      </label>
      <input
        id="provider-email"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 text-white"
      />
      <button
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Email me a secure sign-in link'}
      </button>
      {message && <p role="status" className="text-sm text-gray-300">{message}</p>}
    </form>
  )
}
