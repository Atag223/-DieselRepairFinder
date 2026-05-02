'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ClaimFormProps {
  providerId: string
  businessName: string
}

interface FormState {
  businessName: string
  contactName: string
  phone: string
  email: string
  notes: string
}

export default function ClaimForm({ providerId, businessName }: ClaimFormProps) {
  const [form, setForm] = useState<FormState>({
    businessName,
    contactName: '',
    phone: '',
    email: '',
    notes: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/providers/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, ...form }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }

      setStatus('success')
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-green-950 border border-green-700 rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-green-300 mb-2">Claim Request Submitted</h2>
        <p className="text-green-400 mb-6">
          We received your claim for <strong>{businessName}</strong>. Our team will review it and
          contact you within 1–2 business days.
        </p>
        <Link
          href="/providers"
          className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Back to Directory
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Business name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Business Name</label>
        <input
          name="businessName"
          value={form.businessName}
          onChange={handleChange}
          required
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Contact name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Your Name *</label>
        <input
          name="contactName"
          value={form.contactName}
          onChange={handleChange}
          required
          placeholder="John Smith"
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number *</label>
        <input
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          required
          placeholder="(555) 555-5555"
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Email Address *</label>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          placeholder="you@example.com"
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Notes / proof */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Proof / Additional Notes
        </label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={4}
          placeholder="Describe how you can verify ownership — e.g. business license, website, EIN, etc."
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Error */}
      {status === 'error' && (
        <div className="bg-red-950 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors text-sm"
      >
        {status === 'submitting' ? 'Submitting…' : 'Submit Claim Request'}
      </button>
    </form>
  )
}
