'use client'

import { useState } from 'react'
import Link from 'next/link'

type Customer = {
  requesterName: string
  requesterEmail: string
  requesterPhone: string
  serviceAddress: string
  city: string | null
  state: string | null
  issueType: string
  issueDetails: string
  breakdownNow: boolean
  truckType: string | null
}

export default function LeadAcceptance({ leadId, token }: { leadId: string; token: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [message, setMessage] = useState('')
  const [billingUrl, setBillingUrl] = useState('')
  const [loading, setLoading] = useState(false)

  async function respond(action: 'accept' | 'decline') {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`/api/leads/${leadId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage(result.error ?? 'Unable to process this lead.')
        setBillingUrl(result.billingUrl ?? '')
      } else if (action === 'decline') {
        setMessage('You declined this service request. No credits were used.')
      } else {
        setCustomer(result.customer)
        setMessage('')
      }
    } catch {
      setMessage('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-white">
      <h1 className="mb-2 text-3xl font-bold">Service Request Opportunity</h1>
      <p className="mb-6 text-gray-400">
        Review this request. Customer contact details are shared only after you accept for one credit ($25).
      </p>
      {message && <p role="status" className="mb-5 rounded-lg bg-gray-900 p-4">{message}</p>}
      {billingUrl && (
        <Link href={billingUrl} className="mb-5 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold">
          Fund Your Account · Buy Lead Credits
        </Link>
      )}
      {customer ? (
        <section className="space-y-3 rounded-xl border border-gray-700 bg-gray-900 p-6">
          <h2 className="text-xl font-semibold">Customer contact</h2>
          <p>{customer.requesterName}</p>
          <p><a className="text-blue-400" href={`tel:${customer.requesterPhone}`}>{customer.requesterPhone}</a></p>
          <p><a className="text-blue-400" href={`mailto:${customer.requesterEmail}`}>{customer.requesterEmail}</a></p>
          <p>{customer.serviceAddress}{customer.city ? `, ${customer.city}` : ''}{customer.state ? `, ${customer.state}` : ''}</p>
          <h3 className="pt-2 font-semibold">{customer.issueType}</h3>
          <p className="whitespace-pre-wrap text-gray-300">{customer.issueDetails}</p>
          {customer.truckType && <p>Equipment: {customer.truckType}</p>}
          <p>{customer.breakdownNow ? 'Urgent service requested' : 'Standard urgency'}</p>
        </section>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={loading || !token}
            onClick={() => respond('accept')}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold disabled:opacity-50"
          >
            {loading ? 'Processing…' : 'Accept for 1 credit'}
          </button>
          <button
            type="button"
            disabled={loading || !token}
            onClick={() => respond('decline')}
            className="rounded-lg border border-gray-600 px-5 py-3 font-semibold disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}
      {!token && <p className="mt-5 text-red-300">This lead link is invalid or has expired.</p>}
    </main>
  )
}
