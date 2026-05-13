'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV',
  'WI','WY',
]

interface Location {
  id: string
  locationName: string | null
  city: string
  state: string
  zip: string | null
  address: string | null
  serviceRadius: number
  phone: string | null
  contactName: string | null
  notes: string | null
  isPrimary: boolean
  active: boolean
  latitude: number | null
  longitude: number | null
}

interface Props {
  providerId: string
  initialLocations: Location[]
}

const emptyForm = {
  locationName: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  serviceRadius: '50',
  phone: '',
  contactName: '',
  notes: '',
  isPrimary: false,
}

export default function AdminLocationManager({ providerId, initialLocations }: Props) {
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>(initialLocations)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.city || !form.state) {
      setError('City and state are required.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          serviceRadius: Number(form.serviceRadius) || 50,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to add location')
        return
      }
      setLocations((prev) => [...prev, data.location])
      setForm(emptyForm)
      setShowForm(false)
      setSuccess('Location added.')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(loc: Location) {
    setError('')
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/locations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: loc.id, active: !loc.active }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to update location')
        return
      }
      setLocations((prev) => prev.map((l) => (l.id === loc.id ? data.location : l)))
    } catch {
      setError('Network error.')
    }
  }

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
        Service Locations
      </h2>

      {error && (
        <div className="bg-red-950 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-950 border border-green-700 text-green-300 rounded-lg px-3 py-2 text-sm">
          {success}
        </div>
      )}

      {/* Location list */}
      {locations.length === 0 ? (
        <p className="text-gray-500 text-sm">No locations yet.</p>
      ) : (
        <div className="space-y-2">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2.5 text-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white truncate">
                    {loc.locationName || `${loc.city}, ${loc.state}`}
                  </span>
                  {loc.isPrimary && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                      Primary
                    </span>
                  )}
                  {!loc.active && (
                    <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="text-gray-500 text-xs mt-0.5">
                  {loc.city}, {loc.state}
                  {loc.zip && ` ${loc.zip}`}
                  {' · '}
                  {loc.serviceRadius} mi radius
                  {loc.phone && ` · ${loc.phone}`}
                </div>
              </div>
              <button
                onClick={() => toggleActive(loc)}
                className={`ml-3 text-xs px-2 py-1 rounded-lg border transition-colors ${
                  loc.active
                    ? 'border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-700'
                    : 'border-green-700 text-green-400 hover:bg-green-950'
                }`}
              >
                {loc.active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add location */}
      {showForm ? (
        <form onSubmit={handleAdd} className="space-y-4 border-t border-gray-800 pt-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Add Location
          </h3>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Location Name (optional)</label>
              <input
                type="text"
                name="locationName"
                value={form.locationName}
                onChange={handleChange}
                placeholder="e.g. Houston Office"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Contact Name (optional)</label>
              <input
                type="text"
                name="contactName"
                value={form.contactName}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Address (optional)</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs text-gray-400 mb-1">
                City <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                State <span className="text-red-400">*</span>
              </label>
              <select
                name="state"
                value={form.state}
                onChange={handleChange}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">--</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">ZIP</label>
              <input
                type="text"
                name="zip"
                value={form.zip}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Phone (optional)</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Service Radius (miles)</label>
              <input
                type="number"
                name="serviceRadius"
                value={form.serviceRadius}
                onChange={handleChange}
                min="1"
                max="500"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              name="isPrimary"
              checked={form.isPrimary}
              onChange={handleChange}
              className="w-4 h-4 accent-blue-500"
            />
            Mark as primary location
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Add Location'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(emptyForm); setError('') }}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="border border-dashed border-gray-700 hover:border-blue-500/50 text-gray-500 hover:text-blue-400 text-sm w-full py-2 rounded-lg transition-colors"
        >
          + Add Location
        </button>
      )}
    </div>
  )
}
