'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PROVIDER_CATEGORIES } from '@/lib/provider-categories'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

export default function NewProviderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    businessName: '',
    city: '',
    state: '',
    providerCategory: 'DIESEL_MECHANIC',
    contactName: '',
    phone: '',
    email: '',
    website: '',
    serviceRadius: '',
    services: '',
    notes: '',
    tier: 'FREE',
    active: true,
  })

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/providers', {
        method: 'POST',
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
        router.push('/admin/providers')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to create provider')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-gray-800 bg-black/90 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🚛</span>
              <span className="font-bold text-lg text-white">
                Diesel<span className="text-blue-500">Repair</span>Finder
              </span>
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/admin" className="text-gray-400 hover:text-white text-sm transition-colors">
              Dashboard
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/admin/providers" className="text-gray-400 hover:text-white text-sm transition-colors">
              Providers
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold mb-6">Add New Provider</h1>

        {error && (
          <div className="bg-red-950 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Required fields */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Required</h2>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Business Name *</label>
              <input
                required
                value={form.businessName}
                onChange={(e) => set('businessName', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">City *</label>
                <input
                  required
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
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
                  <option value="">Select…</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Category *</label>
              <select
                required
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

          {/* Contact info */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Contact Info</h2>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Contact Name</label>
              <input
                value={form.contactName}
                onChange={(e) => set('contactName', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
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
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Additional details */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Details</h2>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Service Radius (miles)</label>
              <input
                type="number"
                min="0"
                value={form.serviceRadius}
                onChange={(e) => set('serviceRadius', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Services <span className="text-gray-600">(comma-separated)</span>
              </label>
              <input
                value={form.services}
                onChange={(e) => set('services', e.target.value)}
                placeholder="Engine repair, Brake service, DEF system"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

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
              <label className="block text-sm text-gray-400 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                checked={form.active}
                onChange={(e) => set('active', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="active" className="text-sm text-gray-300">
                Active (show publicly)
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Creating…' : 'Create Provider'}
            </button>
            <Link
              href="/admin/providers"
              className="px-6 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
