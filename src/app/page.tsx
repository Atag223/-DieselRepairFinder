'use client'

import { useState } from 'react'
import Link from 'next/link'

const ISSUE_TYPES = [
  'Engine Won\'t Start',
  'Engine Overheating',
  'Electrical Issue',
  'Flat Tire / Tire Change',
  'Brake Problem',
  'Transmission Issue',
  'Fuel System Problem',
  'DEF / Emissions System',
  'Air System / Suspension',
  'Battery Dead / Jump Start',
  'Oil Leak',
  'Coolant Leak',
  'Other',
]

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Submit Your Request',
    description:
      'Fill out the repair request form with your location and issue details. Takes less than 2 minutes.',
  },
  {
    step: '2',
    title: 'Get Matched Fast',
    description:
      'We connect you with the nearest available mobile diesel mechanic in your area, 24/7.',
  },
  {
    step: '3',
    title: 'Get Back on the Road',
    description:
      'Your mechanic comes to you — roadside, truckstop, or job site. No tow required.',
  },
]

const SERVICES = [
  { icon: '🔧', name: 'Engine Repair', desc: 'Diagnostics, overhauls, no-start issues' },
  { icon: '⚡', name: 'Electrical', desc: 'Wiring, batteries, alternators, sensors' },
  { icon: '🛞', name: 'Tires & Wheels', desc: 'Flat repair, tire change, wheel seals' },
  { icon: '🧯', name: 'Brakes', desc: 'Air brakes, drums, shoes, adjustments' },
  { icon: '💧', name: 'Fluid Leaks', desc: 'Oil, coolant, hydraulic, DEF leaks' },
  { icon: '🔋', name: 'No-Start Service', desc: 'Jump starts, fuel delivery, glow plugs' },
  { icon: '🌡️', name: 'Cooling System', desc: 'Overheating, radiator, thermostat, fans' },
  { icon: '🚛', name: 'Preventive Maintenance', desc: 'Oil changes, filters, inspections' },
]

const CITIES = [
  'Dallas, TX', 'Houston, TX', 'Phoenix, AZ', 'Los Angeles, CA',
  'Chicago, IL', 'Atlanta, GA', 'Nashville, TN', 'Denver, CO',
  'Kansas City, MO', 'Memphis, TN', 'Indianapolis, IN', 'Columbus, OH',
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
}

export default function HomePage() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)

    try {
      const res = await fetch('/api/repair-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-black/90 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚛</span>
            <span className="font-bold text-lg text-white">
              Diesel<span className="text-blue-500">Repair</span>Finder
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#request" className="hidden sm:block text-gray-300 hover:text-white transition-colors">
              Request Repair
            </a>
            <Link
              href="/join"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
            >
              Join as a Mechanic
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-20 sm:py-28 px-4 bg-gradient-to-b from-gray-950 to-black overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/40 via-black to-black pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-950/60 border border-blue-800/50 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Mechanics Available Now
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 text-balance">
            Find Mobile Diesel Repair
            <br />
            <span className="text-blue-500">Near You — Fast</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-10">
            Broken down on the road? Don&apos;t wait for a tow. Our network of certified mobile
            diesel mechanics comes to you — roadside, truckstop, or job site. Available 24/7 for
            emergency diesel repair and service.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#request"
              className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold px-8 py-4 rounded-xl transition-colors shadow-lg shadow-blue-900/40"
            >
              🔧 Request Diesel Repair
            </a>
            <Link
              href="/join"
              className="border border-gray-600 hover:border-gray-400 text-gray-200 hover:text-white text-lg font-semibold px-8 py-4 rounded-xl transition-colors"
            >
              Join as a Mechanic →
            </Link>
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

      {/* Repair Request Form */}
      <section id="request" className="py-20 px-4 bg-black">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Request Diesel Repair</h2>
          <p className="text-gray-400 text-center mb-10">
            Fill out the form below and we&apos;ll connect you with a mobile mechanic fast.
          </p>

          {result?.success ? (
            <div className="bg-green-950 border border-green-700 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-green-400 mb-3">Request Submitted!</h3>
              <p className="text-gray-300 mb-4">
                Your repair request has been received. A mobile mechanic will contact you shortly.
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
                    {ISSUE_TYPES.map((t) => (
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
                  placeholder="Any other details the mechanic should know..."
                  className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-xl transition-colors shadow-lg shadow-blue-900/40"
              >
                {submitting ? 'Submitting...' : '🔧 Request Diesel Repair'}
              </button>

              <p className="text-gray-500 text-xs text-center">
                By submitting you agree to be contacted by a mobile diesel mechanic. No obligation.
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
            Mobile diesel mechanics ready for any roadside situation
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
            {CITIES.map((city) => (
              <div
                key={city}
                className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-center text-sm font-medium text-gray-300 hover:border-blue-700 hover:text-white transition-colors"
              >
                📍 {city}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mechanic CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-blue-950/30 to-black">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-5">
            Are You a Diesel Mechanic?
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            Join our network of mobile diesel mechanics. Set your own hours, work in your territory,
            and get connected with drivers who need your skills — 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/join"
              className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold px-8 py-4 rounded-xl transition-colors shadow-lg shadow-blue-900/40"
            >
              Join as a Mechanic →
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
          <p>Mobile Diesel Mechanics. Anytime. Anywhere.</p>
          <div className="flex gap-4">
            <Link href="/join" className="hover:text-gray-400 transition-colors">Join as Mechanic</Link>
            <a href="#request" className="hover:text-gray-400 transition-colors">Request Repair</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
