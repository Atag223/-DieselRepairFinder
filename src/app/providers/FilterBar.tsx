'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { PROVIDER_CATEGORIES, parseProviderCategoryInput, providerCategoryToSlug } from '@/lib/provider-categories'

const US_STATES = [
  { abbr: 'AL', name: 'Alabama' }, { abbr: 'AK', name: 'Alaska' },
  { abbr: 'AZ', name: 'Arizona' }, { abbr: 'AR', name: 'Arkansas' },
  { abbr: 'CA', name: 'California' }, { abbr: 'CO', name: 'Colorado' },
  { abbr: 'CT', name: 'Connecticut' }, { abbr: 'DE', name: 'Delaware' },
  { abbr: 'FL', name: 'Florida' }, { abbr: 'GA', name: 'Georgia' },
  { abbr: 'HI', name: 'Hawaii' }, { abbr: 'ID', name: 'Idaho' },
  { abbr: 'IL', name: 'Illinois' }, { abbr: 'IN', name: 'Indiana' },
  { abbr: 'IA', name: 'Iowa' }, { abbr: 'KS', name: 'Kansas' },
  { abbr: 'KY', name: 'Kentucky' }, { abbr: 'LA', name: 'Louisiana' },
  { abbr: 'ME', name: 'Maine' }, { abbr: 'MD', name: 'Maryland' },
  { abbr: 'MA', name: 'Massachusetts' }, { abbr: 'MI', name: 'Michigan' },
  { abbr: 'MN', name: 'Minnesota' }, { abbr: 'MS', name: 'Mississippi' },
  { abbr: 'MO', name: 'Missouri' }, { abbr: 'MT', name: 'Montana' },
  { abbr: 'NE', name: 'Nebraska' }, { abbr: 'NV', name: 'Nevada' },
  { abbr: 'NH', name: 'New Hampshire' }, { abbr: 'NJ', name: 'New Jersey' },
  { abbr: 'NM', name: 'New Mexico' }, { abbr: 'NY', name: 'New York' },
  { abbr: 'NC', name: 'North Carolina' }, { abbr: 'ND', name: 'North Dakota' },
  { abbr: 'OH', name: 'Ohio' }, { abbr: 'OK', name: 'Oklahoma' },
  { abbr: 'OR', name: 'Oregon' }, { abbr: 'PA', name: 'Pennsylvania' },
  { abbr: 'RI', name: 'Rhode Island' }, { abbr: 'SC', name: 'South Carolina' },
  { abbr: 'SD', name: 'South Dakota' }, { abbr: 'TN', name: 'Tennessee' },
  { abbr: 'TX', name: 'Texas' }, { abbr: 'UT', name: 'Utah' },
  { abbr: 'VT', name: 'Vermont' }, { abbr: 'VA', name: 'Virginia' },
  { abbr: 'WA', name: 'Washington' }, { abbr: 'WV', name: 'West Virginia' },
  { abbr: 'WI', name: 'Wisconsin' }, { abbr: 'WY', name: 'Wyoming' },
]

interface FilterBarProps {
  cities: string[]
}

export default function FilterBar({ cities }: FilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentState = searchParams.get('state') ?? ''
  const currentCity = searchParams.get('city') ?? ''
  const currentCategoryValue = parseProviderCategoryInput(searchParams.get('category'))
  const currentCategory = currentCategoryValue ? providerCategoryToSlug(currentCategoryValue) : ''

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // Clear city when state changes
    if (key === 'state') params.delete('city')
    startTransition(() => {
      router.push(`/providers?${params.toString()}`)
    })
  }

  function clearFilters() {
    startTransition(() => {
      router.push('/providers')
    })
  }

  const hasFilters = currentState || currentCity || currentCategory

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-8">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Category */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-gray-400 mb-1 font-medium">Service Type</label>
          <select
            value={currentCategory}
            onChange={(e) => update('category', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {PROVIDER_CATEGORIES.map((c) => (
              <option key={c.value} value={c.slug}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* State */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-gray-400 mb-1 font-medium">State</label>
          <select
            value={currentState}
            onChange={(e) => update('state', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All States</option>
            {US_STATES.map((s) => (
              <option key={s.abbr} value={s.abbr}>
                {s.abbr} – {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* City */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-gray-400 mb-1 font-medium">City</label>
          <select
            value={currentCity}
            onChange={(e) => update('city', e.target.value)}
            disabled={!currentState}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      {isPending && (
        <p className="text-xs text-blue-400 mt-2">Loading providers…</p>
      )}
    </div>
  )
}
