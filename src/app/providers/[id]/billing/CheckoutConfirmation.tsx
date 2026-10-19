'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = { providerId: string; sessionId: string }

export default function CheckoutConfirmation({ providerId, sessionId }: Props) {
  const router = useRouter()
  const [confirmation, setConfirmation] = useState<{ credits: number; amountCents: number } | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout>
    async function check() {
      try {
        const response = await fetch(
          `/api/providers/${providerId}/billing/confirmation?session_id=${encodeURIComponent(sessionId)}`,
          { cache: 'no-store' }
        )
        const result = await response.json()
        if (cancelled) return
        if (result.confirmed) {
          setConfirmation({ credits: result.credits, amountCents: result.amountCents })
          setChecking(false)
          router.refresh()
          return
        }
      } catch {
        // The webhook can still complete independently of this confirmation check.
      }
      attempts += 1
      if (attempts < 6 && !cancelled) timer = setTimeout(check, 2000)
      else if (!cancelled) setChecking(false)
    }
    void check()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [providerId, router, sessionId])

  if (confirmation) {
    return (
      <div role="status" className="mb-6 rounded-xl border border-green-700 bg-green-950 px-5 py-4 text-sm text-green-300">
        ✓ Stripe payment verified. {confirmation.credits} credits have been added to your account
        (${(confirmation.amountCents / 100).toFixed(2)}).
      </div>
    )
  }
  return (
    <div role="status" className="mb-6 rounded-xl border border-yellow-700 bg-yellow-950 px-5 py-4 text-sm text-yellow-300">
      {checking
        ? 'Payment received at checkout. Waiting for Stripe verification before updating your credits…'
        : 'Payment is still being verified. Your credits will appear automatically after Stripe confirms payment; refresh this page shortly.'}
    </div>
  )
}
