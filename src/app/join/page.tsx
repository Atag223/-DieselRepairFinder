'use client'

import { useState } from 'react'
import Link from 'next/link'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV',
  'WI','WY',
]

const SERVICE_OPTIONS = [
  'Engine Repair',
  'Electrical Systems',
  'Brake Service',
  'Tire Service',
  'Transmission',
  'Fuel System',
  'DEF / Emissions',
  'Cooling System',
  'Air System / Suspension',
  'Preventive Maintenance',
  'Welding / Fabrication',
  'Emergency No-Start',
]

const PROVIDER_CATEGORIES = [
  { value: 'DIESEL_MECHANIC', label: 'Mobile Diesel Mechanic', icon: '🔧' },
  { value: 'MOBILE_TIRE_SERVICE', label: 'Mobile Tire Service', icon: '🛞' },
  { value: 'HEAVY_DUTY_WRECKER', label: 'Heavy-Duty Wrecker', icon: '🚨' },
]

interface FormData {
  businessName: string
  contactName: string
  phone: string
  email: string
  city: string
  state: string
  serviceRadius: string
  website: string
  is24_7: boolean
  services: string[]
  notes: string
  providerCategory: string
}

export default function JoinPage() {
  const [form, setForm] = useState<FormData>({
    businessName: '',
    contactName: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    serviceRadius: '',
    website: '',
    is24_7: false,
    services: [],
    notes: '',
    providerCategory: 'DIESEL_MECHANIC',
  })

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleServiceToggle = (service: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)

    try {
      const res = await fetch('/api/providers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true })
      } else {
        setResult({ success: false, error: data.error || 'Something went wrong.' })
      }
    } catch {
      setResult({ success: false, error: 'Network error. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-black/90 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🚛</span>
            <span className="font-bold text-lg text-white">
              Diesel<span className="text-blue-500">Repair</span>Finder
            </span>
          </Link>
          <Link
            href="/#request"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
          >
            Request Service
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 sm:py-24 px-4 bg-gradient-to-b from-blue-950/30 to-black text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5">
            Join the <span className="text-blue-500">Diesel Repair Finder</span> Network
          </h1>
          <p className="text-gray-300 text-lg mb-6">
            Connect with drivers who need your skills. Grow your mobile service business with
            steady local leads — on your schedule.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 max-w-xl mx-auto">
            {[
              { stat: 'Free', sub: 'No signup fees' },
              { stat: 'Local Leads', sub: 'In your service area' },
              { stat: 'Your Rate', sub: 'You set your prices' },
            ].map((item) => (
              <div key={item.stat} className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                <div className="text-lg font-extrabold text-blue-400">{item.stat}</div>
                <div className="text-gray-500 text-xs mt-0.5">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          {result?.success ? (
            <div className="bg-green-950 border border-green-700 rounded-2xl p-10 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-green-400 mb-3">Application Submitted!</h2>
              <p className="text-gray-300 mb-6">
                Thanks for applying to the Diesel Repair Finder network. We&apos;ll review your
                application and reach out within 1-2 business days.
              </p>
              <Link
                href="/"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-gray-950 border border-gray-800 rounded-2xl p-8 space-y-6"
            >
              <h2 className="text-2xl font-bold">Provider Application</h2>
              <p className="text-gray-400 text-sm -mt-2">
                All fields marked with <span className="text-red-400">*</span> are required.
              </p>

              {result?.error && (
                <div className="bg-red-950 border border-red-700 rounded-xl p-4 text-red-300 text-sm">
                  {result.error}
                </div>
              )}

              {/* Provider Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Provider Category <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {PROVIDER_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, providerCategory: cat.value }))}
                      className={`flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl border text-center transition-colors ${
                        form.providerCategory === cat.value
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-black border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                      }`}
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="text-xs font-semibold leading-tight">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Business Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={form.businessName}
                    onChange={handleChange}
                    required
                    placeholder="ABC Mobile Diesel LLC"
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Contact Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="contactName"
                    value={form.contactName}
                    onChange={handleChange}
                    required
                    placeholder="John Smith"
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    placeholder="(555) 000-0000"
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    required
                    placeholder="Dallas"
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    State <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    required
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select state</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Service Radius (miles) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    name="serviceRadius"
                    value={form.serviceRadius}
                    onChange={handleChange}
                    required
                    min="1"
                    max="500"
                    placeholder="50"
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Website (optional)
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={form.website}
                    onChange={handleChange}
                    placeholder="https://yourbusiness.com"
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* 24/7 toggle */}
              <label className="flex items-center gap-3 bg-blue-950/30 border border-blue-900/40 rounded-xl p-4 cursor-pointer hover:bg-blue-950/50 transition-colors">
                <input
                  type="checkbox"
                  name="is24_7"
                  checked={form.is24_7}
                  onChange={handleChange}
                  className="w-5 h-5 accent-blue-500"
                />
                <div>
                  <span className="font-bold text-blue-300">Available 24/7 for Emergency Calls</span>
                  <p className="text-gray-500 text-xs mt-0.5">Check if you accept emergency overnight dispatch</p>
                </div>
              </label>

              {/* Services */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Services Offered (select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICE_OPTIONS.map((service) => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => handleServiceToggle(service)}
                      className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        form.services.includes(service)
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-black border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {form.services.includes(service) ? '✓ ' : ''}{service}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Tell us more about your experience, certifications, or equipment..."
                  className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-xl transition-colors shadow-lg shadow-blue-900/40"
              >
                {submitting ? 'Submitting...' : 'Submit Application →'}
              </button>

              <p className="text-gray-500 text-xs text-center">
                By submitting you agree to be contacted by our team to verify your application.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-8 px-4 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg">🚛</span>
            <span className="font-semibold text-gray-400">DieselRepairFinder.com</span>
          </Link>
          <p>Mobile Diesel Repair · Tire Service · Heavy-Duty Towing</p>
        </div>
      </footer>
    </div>
  )
}
