import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import SiteNav from '@/app/components/SiteNav'
import BillingForm from './BillingForm'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; cancelled?: string }>
}

export const dynamic = 'force-dynamic'

export default async function ProviderBillingPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams

  const provider = await prisma.serviceProvider.findUnique({
    where: { id },
    select: {
      id: true,
      businessName: true,
      leadCredits: true,
      stripeAccountBalanceCents: true,
      freeLeadCreditsIssued: true,
      deletedAt: true,
    },
  })

  if (!provider || provider.deletedAt) notFound()

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteNav />

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold mb-1">Lead Credits & Billing</h1>
          <p className="text-gray-400">{provider.businessName}</p>
        </div>

        {sp.success === '1' && (
          <div className="bg-green-950 border border-green-700 text-green-300 rounded-xl px-5 py-4 mb-6 text-sm">
            ✓ Payment successful! Your credits have been added to your account.
          </div>
        )}

        {sp.cancelled === '1' && (
          <div className="bg-yellow-950 border border-yellow-700 text-yellow-300 rounded-xl px-5 py-4 mb-6 text-sm">
            Payment cancelled. Your account was not charged.
          </div>
        )}

        <BillingForm
          providerId={provider.id}
          businessName={provider.businessName}
          leadCredits={provider.leadCredits}
          stripeAccountBalanceCents={provider.stripeAccountBalanceCents}
          freeLeadCreditsIssued={provider.freeLeadCreditsIssued}
        />

        <div className="mt-6 text-center">
          <Link
            href={`/providers/${provider.id}`}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Back to your listing
          </Link>
        </div>
      </main>
    </div>
  )
}
