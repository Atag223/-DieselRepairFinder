'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Confirmation = { state: string; tier: string; expiresAt: string | null }

export default function PlacementCheckoutConfirmation({
  providerId,
  sessionId,
}: {
  providerId: string
  sessionId: string
}) {
  const router = useRouter()
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout>
    async function check() {
      try {
        const response = await fetch(
          `/api/providers/${providerId}/placements/confirmation?session_id=${encodeURIComponent(sessionId)}`,
          { cache: 'no-store' }
        )
        const result = await response.json()
        if (cancelled) return
        if (result.confirmed) {
          setConfirmation(result)
          setChecking(false)
          router.refresh()
          return
        }
      } catch {
        // Stripe's webhook can finish independently of this confirmation check.
      }
      attempts += 1
      if (attempts < 10 && !cancelled) timer = setTimeout(check, 2000)
      else if (!cancelled) setChecking(false)
    }
    void check()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [providerId, router, sessionId])

  if (confirmation) {
    return (
      <div role="status" className="mb-6 rounded-xl border border-green-700 bg-green-950 px-5 py-4 text-sm text-green-300">
        ✓ Stripe payment verified. Your {confirmation.tier} placement in {confirmation.state} is active
        {confirmation.expiresAt ? ` through ${new Date(confirmation.expiresAt).toLocaleDateString()}` : ''}.
      </div>
    )
  }
  return (
    <div role="status" className="mb-6 rounded-xl border border-yellow-700 bg-yellow-950 px-5 py-4 text-sm text-yellow-300">
      {checking
        ? 'Waiting for Stripe to verify your placement payment…'
        : 'Payment is still being verified. Your placement will activate after Stripe confirms it; refresh shortly.'}
    </div>
  )
}
