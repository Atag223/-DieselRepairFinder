'use client'

import { useState } from 'react'
import Link from 'next/link'
import SiteNav from './components/SiteNav'

type ProviderCategory = 'DIESEL_MECHANIC' | 'MOBILE_TIRE_SERVICE' | 'HEAVY_DUTY_WRECKER'

const ISSUE_TYPES_BY_CATEGORY: Record<ProviderCategory, string[]> = {
  DIESEL_MECHANIC: [
    'No Start',
    'Engine Problem',
    'Electrical',
    'DEF / Emissions',
    'Air / Brakes',
    'Preventive Maintenance',
    'Other',
  ],
  MOBILE_TIRE_SERVICE: [
    'Steer Tire',
    'Drive Tire',
    'Trailer Tire',
    'Blowout',
    'Flat Repair',
    'Tire Replacement',
    'Other',
  ],
  HEAVY_DUTY_WRECKER: [
    'Semi Truck Tow',
    'Heavy Recovery',
    'Winching',
    'Accident Recovery',
    'Equipment Move',
    'Stuck / Off Road',
    'Other',
  ],
}

const SERVICE_CATEGORIES: { value: ProviderCategory; label: string; icon: string; desc: string }[] = [
  { value: 'DIESEL_MECHANIC', label: 'Diesel Mechanic', icon: '🔧', desc: 'Mobile diesel repair & maintenance' },
  { value: 'MOBILE_TIRE_SERVICE', label: 'Mobile Tire Service', icon: '🛞', desc: 'On-site tire repair & replacement' },
  { value: 'HEAVY_DUTY_WRECKER', label: 'Heavy-Duty Wrecker', icon: '🚨', desc: 'Heavy towing & recovery' },
]

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Submit Your Request',
    description:
      'Fill out the request form with your location and issue details. Takes less than 2 minutes.',
  },
  {
    step: '2',
    title: 'Get Matched Fast',
    description:
      'We connect you with the nearest available provider in your area, 24/7.',
  },
  {
    step: '3',
    title: 'Get Back on the Road',
    description:
      'Your provider comes to you — roadside, truckstop, or job site. No tow required.',
  },
]

const SERVICES = [
  { icon: '🔧', name: 'Engine Repair', desc: 'Diagnostics, overhauls, no-start issues' },
  { icon: '⚡', name: 'Electrical', desc: 'Wiring, batteries, alternators, sensors' },
  { icon: '🛞', name: 'Tires & Wheels', desc: 'Flat repair, tire change, wheel seals' },
  { icon: '🧯', name: 'Brakes', desc: 'Air brakes, drums, shoes, adjustments' },
  { icon: '💧', name: 'Fluid Leaks', desc: 'Oil, coolant, hydraulic, DEF leaks' },
  { icon: '🔋', name: 'No-Start Service', desc: 'Jump starts, fuel delivery, glow plugs' },
  { icon: '🚨', name: 'Heavy Towing', desc: 'Semi truck tow, recovery, winching' },
  { icon: '🚛', name: 'Preventive Maintenance', desc: 'Oil changes, filters, inspections' },
]

const CITIES = [
  { label: 'Dallas, TX', state: 'TX', city: 'Dallas' },
  { label: 'Houston, TX', state: 'TX', city: 'Houston' },
  { label: 'Phoenix, AZ', state: 'AZ', city: 'Phoenix' },
  { label: 'Los Angeles, CA', state: 'CA', city: 'Los Angeles' },
  { label: 'Chicago, IL', state: 'IL', city: 'Chicago' },
  { label: 'Atlanta, GA', state: 'GA', city: 'Atlanta' },
  { label: 'Nashville, TN', state: 'TN', city: 'Nashville' },
  { label: 'Denver, CO', state: 'CO', city: 'Denver' },
  { label: 'Kansas City, MO', state: 'MO', city: 'Kansas City' },
  { label: 'Memphis, TN', state: 'TN', city: 'Memphis' },
  { label: 'Indianapolis, IN', state: 'IN', city: 'Indianapolis' },
  { label: 'Columbus, OH', state: 'OH', city: 'Columbus' },
]

interface FormData {
  requesterName: string
  requesterEmail: string
  requesterPhone: string
  serviceAddress: string
  issueType: string
  issueDetails: string
  requesterCompany: string
  city: string
  state: string
  breakdownNow: boolean
  truckType: string
  unitNumber: string
  roadsideLocation: string
  specialNotes: string
  paymentMethod: string
  paymentNotes: string
  poNumber: string
  nationalAccountName: string
}

const PAYMENT_METHODS = [
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Fleet / National Account', label: 'Fleet / National Account' },
  { value: 'Purchase Order', label: 'Purchase Order' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Check', label: 'Check' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Other', label: 'Other' },
]

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<ProviderCategory>('DIESEL_MECHANIC')
  const [form, setForm] = useState<FormData>({
    requesterName: '',
    requesterEmail: '',
    requesterPhone: '',
    serviceAddress: '',
    issueType: '',
    issueDetails: '',
    requesterCompany: '',
    city: '',
    state: '',
    breakdownNow: false,
    truckType: '',
    unitNumber: '',
    roadsideLocation: '',
    specialNotes: '',
    paymentMethod: '',
    paymentNotes: '',
    poNumber: '',
    nationalAccountName: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; referenceId?: string; error?: string } | null>(null)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleCategoryChange = (category: ProviderCategory) => {
    setSelectedCategory(category)
    setForm((prev) => ({ ...prev, issueType: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.paymentMethod) {
      setResult({ success: false, error: 'Please select a payment method.' })
      return
    }

    setSubmitting(true)
    setResult(null)

    try {
      const res = await fetch('/api/repair-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, requestedCategory: selectedCategory }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, referenceId: data.referenceId })
        setForm({
          requesterName: '',
          requesterEmail: '',
          requesterPhone: '',
          serviceAddress: '',
          issueType: '',
          issueDetails: '',
          requesterCompany: '',
          city: '',
          state: '',
          breakdownNow: false,
          truckType: '',
          unitNumber: '',
          roadsideLocation: '',
          specialNotes: '',
          paymentMethod: '',
          paymentNotes: '',
          poNumber: '',
          nationalAccountName: '',
        })
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
      <SiteNav />

      {/* Hero */}
      <section className="relative py-24 sm:py-36 px-4 overflow-hidden">
        {/* Background: gradient simulating dark truck/road theme */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,_#0a0a0a_0%,_#0d1a2e_40%,_#0a0f1a_70%,_#000_100%)]" />
        {/* Radial accent */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(30,64,120,0.45),_transparent)]" />
        {/* Dark overlay stripe for readability */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-950/60 border border-blue-800/50 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Providers Available Now — 24/7
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 text-balance">
            Mobile Diesel Repair,{' '}
            <span className="text-blue-500">Tire Service</span>{' '}&{' '}
            <br className="hidden sm:block" />
            Heavy-Duty Towing — Near You
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-10">
            Find verified mobile diesel mechanics, roadside tire service pros, and heavy-duty
            wreckers anywhere in the US. Get back on the road fast — no shop, no tow required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/providers"
              className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold px-8 py-4 rounded-xl transition-colors shadow-lg shadow-blue-900/40"
            >
              🔍 Browse Providers
            </Link>
            <Link
              href="/join"
              className="border border-gray-600 hover:border-gray-400 text-gray-200 hover:text-white text-lg font-semibold px-8 py-4 rounded-xl transition-colors"
            >
              Join as Provider →
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <span>🔧 Diesel Mechanics</span>
            <span className="text-gray-700">|</span>
            <span>🛞 Mobile Tire Service</span>
            <span className="text-gray-700">|</span>
            <span>🚨 Heavy-Duty Towing</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gray-950">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-gray-400 text-center mb-12">Back on the road in 3 simple steps</p>
          <div className="grid sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center hover:border-blue-700 transition-colors"
              >
                <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-extrabold mx-auto mb-5">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Request Form */}
      <section id="request" className="py-20 px-4 bg-black">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Request Roadside Help</h2>
          <p className="text-gray-400 text-center mb-10">
            Fill out the form below and we&apos;ll connect you with a provider fast.
          </p>

          {result?.success ? (
            <div className="bg-green-950 border border-green-700 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-green-400 mb-3">Request Submitted!</h3>
              <p className="text-gray-300 mb-4">
                Your request has been received. A provider will contact you shortly.
              </p>
              <div className="bg-black/50 rounded-xl px-6 py-3 inline-block">
                <span className="text-gray-400 text-sm">Reference ID: </span>
                <span className="font-mono font-bold text-blue-400">{result.referenceId}</span>
              </div>
              <button
                onClick={() => setResult(null)}
                className="block mx-auto mt-6 text-gray-400 hover:text-white text-sm underline"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-gray-950 border border-gray-800 rounded-2xl p-8 space-y-5"
            >
              {result?.error && (
                <div className="bg-red-950 border border-red-700 rounded-xl p-4 text-red-300 text-sm">
                  {result.error}
                </div>
              )}

              {/* Category Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  What do you need help with? <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {SERVICE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => handleCategoryChange(cat.value)}
                      className={`flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl border text-center transition-colors ${
                        selectedCategory === cat.value
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

              {/* Emergency checkbox */}
              <label className="flex items-center gap-3 bg-red-950/40 border border-red-800/50 rounded-xl p-4 cursor-pointer hover:bg-red-950/60 transition-colors">
                <input
                  type="checkbox"
                  name="breakdownNow"
                  checked={form.breakdownNow}
                  onChange={handleChange}
                  className="w-5 h-5 accent-red-500"
                />
                <div>
                  <span className="font-bold text-red-400">🚨 I&apos;m broken down right now</span>
                  <p className="text-gray-400 text-xs mt-0.5">Mark this for priority emergency dispatch</p>
                </div>
              </label>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Your Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="requesterName"
                    value={form.requesterName}
                    onChange={handleChange}
                    required
                    placeholder="John Smith"
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Company (optional)
                  </label>
                  <input
                    type="text"
                    name="requesterCompany"
                    value={form.requesterCompany}
                    onChange={handleChange}
                    placeholder="ABC Trucking Co."
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="requesterEmail"
                    value={form.requesterEmail}
                    onChange={handleChange}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    name="requesterPhone"
                    value={form.requesterPhone}
                    onChange={handleChange}
                    required
                    placeholder="(555) 000-0000"
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Service Address / Location <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="serviceAddress"
                  value={form.serviceAddress}
                  onChange={handleChange}
                  required
                  placeholder="I-40 MM 235, Amarillo TX or 1234 Main St, Dallas TX"
                  className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Issue Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="issueType"
                    value={form.issueType}
                    onChange={handleChange}
                    required
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select issue type</option>
                    {ISSUE_TYPES_BY_CATEGORY[selectedCategory].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Truck / Equipment Type
                  </label>
                  <input
                    type="text"
                    name="truckType"
                    value={form.truckType}
                    onChange={handleChange}
                    placeholder="e.g. Freightliner Cascadia, Kenworth T680"
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Describe the Issue <span className="text-red-400">*</span>
                </label>
                <textarea
                  name="issueDetails"
                  value={form.issueDetails}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Please describe what's happening with your vehicle in as much detail as possible..."
                  className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Unit #</label>
                  <input
                    type="text"
                    name="unitNumber"
                    value={form.unitNumber}
                    onChange={handleChange}
                    placeholder="e.g. Unit 42"
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Roadside Location Details
                  </label>
                  <input
                    type="text"
                    name="roadsideLocation"
                    value={form.roadsideLocation}
                    onChange={handleChange}
                    placeholder="e.g. Shoulder of I-35 northbound"
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Special Notes
                </label>
                <textarea
                  name="specialNotes"
                  value={form.specialNotes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Any other details the provider should know..."
                  className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              {/* Payment Method Section */}
              <div className="border border-gray-700 rounded-xl p-5 space-y-4 bg-gray-900/50">
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-1">
                    How will you pay the service provider? <span className="text-red-400">*</span>
                  </label>
                  <p className="text-gray-500 text-xs mb-3">
                    Payment is handled directly between you and the service provider. DieselRepairFinder uses this information to help providers decide whether to accept the request.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((pm) => (
                      <button
                        key={pm.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, paymentMethod: pm.value, paymentNotes: '', poNumber: '', nationalAccountName: '' }))}
                        className={`text-sm font-medium px-3 py-2.5 rounded-lg border transition-colors text-left ${
                          form.paymentMethod === pm.value
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-black border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                        }`}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional: Fleet / National Account */}
                {form.paymentMethod === 'Fleet / National Account' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      National Account Name
                    </label>
                    <input
                      type="text"
                      name="nationalAccountName"
                      value={form.nationalAccountName}
                      onChange={handleChange}
                      placeholder="e.g. Ryder, Penske, Werner, etc."
                      className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}

                {/* Conditional: Purchase Order */}
                {form.paymentMethod === 'Purchase Order' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      PO Number
                    </label>
                    <input
                      type="text"
                      name="poNumber"
                      value={form.poNumber}
                      onChange={handleChange}
                      placeholder="e.g. PO-12345"
                      className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}

                {/* Conditional: Other */}
                {form.paymentMethod === 'Other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Payment Notes
                    </label>
                    <input
                      type="text"
                      name="paymentNotes"
                      value={form.paymentNotes}
                      onChange={handleChange}
                      placeholder="Describe your payment arrangement..."
                      className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-xl transition-colors shadow-lg shadow-blue-900/40"
              >
                {submitting ? 'Submitting...' : '🔧 Request Help Now'}
              </button>

              <p className="text-gray-500 text-xs text-center">
                By submitting you agree to be contacted by a service provider. No obligation.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Service Categories */}
      <section className="py-20 px-4 bg-gray-950">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Services We Cover</h2>
          <p className="text-gray-400 text-center mb-12">
            Mobile diesel repair, tire service, and heavy-duty towing &amp; recovery
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SERVICES.map((s) => (
              <div
                key={s.name}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-blue-700 transition-colors"
              >
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="font-bold mb-1">{s.name}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Launch Cities */}
      <section className="py-20 px-4 bg-black">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Now Serving These Cities</h2>
          <p className="text-gray-400 text-center mb-12">
            Expanding nationwide — request service in your city today
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {CITIES.map((c) => (
              <Link
                key={c.label}
                href={`/city/${c.state}/${encodeURIComponent(c.city)}`}
                className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-center text-sm font-medium text-gray-300 hover:border-blue-700 hover:text-white transition-colors"
              >
                📍 {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Provider CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-blue-950/30 to-black">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-5">
            Are You a Roadside Service Provider?
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            Join our network of mobile diesel mechanics, tire service pros, and heavy-duty wreckers.
            Set your own hours, work in your territory, and get connected with drivers who need
            your skills — 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/join"
              className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold px-8 py-4 rounded-xl transition-colors shadow-lg shadow-blue-900/40"
            >
              Join as a Provider →
            </Link>
          </div>
          <div className="mt-8 grid sm:grid-cols-3 gap-6 text-center">
            {[
              { stat: 'Free to Join', sub: 'No upfront fees' },
              { stat: '24/7 Dispatch', sub: 'Work when you want' },
              { stat: 'Keep 100%', sub: 'Of your labor rate' },
            ].map((item) => (
              <div key={item.stat} className="bg-gray-950/60 border border-gray-800 rounded-xl p-5">
                <div className="text-xl font-extrabold text-blue-400">{item.stat}</div>
                <div className="text-gray-500 text-sm mt-1">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚛</span>
            <span className="font-semibold text-gray-400">DieselRepairFinder.com</span>
          </div>
          <p>Mobile Diesel Repair · Tire Service · Heavy-Duty Towing</p>
          <div className="flex gap-4">
            <Link href="/join" className="hover:text-gray-400 transition-colors">Join as Provider</Link>
            <a href="#request" className="hover:text-gray-400 transition-colors">Request Help</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
