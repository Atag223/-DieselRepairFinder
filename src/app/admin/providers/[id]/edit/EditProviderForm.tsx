'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ServiceProvider } from '@prisma/client'
import { PROVIDER_CATEGORIES } from '@/lib/provider-categories'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

interface Props {
  provider: ServiceProvider
}

export default function EditProviderForm({ provider }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    businessName: provider.businessName,
    contactName: provider.contactName ?? '',
    phone: provider.phone ?? '',
    email: provider.email ?? '',
    website: provider.website ?? '',
    city: provider.city,
    state: provider.state,
    serviceRadius: provider.serviceRadius?.toString() ?? '',
    services: provider.services.join(', '),
    providerCategory: provider.providerCategory,
    tier: provider.tier,
    verificationStatus: provider.verificationStatus,
    isVerified: provider.isVerified,
    claimStatus: provider.claimStatus,
    notes: provider.notes ?? '',
    active: provider.active,
  })

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setLoading(true)

    try {
      const res = await fetch(`/api/admin/providers/${provider.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          services: form.services
            ? form.services.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          serviceRadius: form.serviceRadius ? Number(form.serviceRadius) : null,
        }),
      })

      if (res.ok) {
        setSaved(true)
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to update provider')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-950 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-950 border border-green-700 text-green-300 rounded-lg px-4 py-3 text-sm">
          Provider updated successfully.
        </div>
      )}

      {/* Core fields */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Business Info</h2>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Business Name *</label>
          <input
            required
            value={form.businessName}
            onChange={(e) => set('businessName', e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">City *</label>
            <input
              required
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">State *</label>
            <select
              required
              value={form.state}
              onChange={(e) => set('state', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
            >
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Category *</label>
          <select
            value={form.providerCategory}
            onChange={(e) => set('providerCategory', e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
          >
            {PROVIDER_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Contact</h2>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Contact Name</label>
          <input
            value={form.contactName}
            onChange={(e) => set('contactName', e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Website</label>
          <input
            type="url"
            value={form.website}
            onChange={(e) => set('website', e.target.value)}
            placeholder="https://"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Service details */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Service Details</h2>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Service Radius (miles)</label>
          <input
            type="number"
            min="0"
            value={form.serviceRadius}
            onChange={(e) => set('serviceRadius', e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Services <span className="text-gray-600">(comma-separated)</span>
          </label>
          <input
            value={form.services}
            onChange={(e) => set('services', e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm resize-none"
          />
        </div>
      </div>

      {/* Admin controls */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Admin Controls</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tier</label>
            <select
              value={form.tier}
              onChange={(e) => set('tier', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
            >
              <option value="FREE">Free</option>
              <option value="FEATURED">Featured</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Verification Status</label>
            <select
              value={form.verificationStatus}
              onChange={(e) => set('verificationStatus', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
            >
              <option value="UNVERIFIED">Unverified</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Claim Status</label>
            <select
              value={form.claimStatus}
              onChange={(e) => set('claimStatus', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
            >
              <option value="UNCLAIMED">Unclaimed</option>
              <option value="PENDING">Pending</option>
              <option value="CLAIMED">Claimed</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              id="isVerified"
              type="checkbox"
              checked={form.isVerified}
              onChange={(e) => set('isVerified', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isVerified" className="text-sm text-gray-300">Is Verified</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={form.active}
              onChange={(e) => set('active', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="active" className="text-sm text-gray-300">Active</label>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
        <Link
          href="/admin/providers"
          className="px-6 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
