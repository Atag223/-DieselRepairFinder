import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import SiteNav from '@/app/components/SiteNav'
import BillingForm from './BillingForm'
import { isProviderSessionValid, PROVIDER_SESSION_COOKIE } from '@/lib/provider-auth'
import CheckoutConfirmation from './CheckoutConfirmation'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session_id?: string; cancelled?: string }>
}

export const dynamic = 'force-dynamic'

export default async function ProviderBillingPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(PROVIDER_SESSION_COOKIE)?.value
  if (!(await isProviderSessionValid(id, sessionToken))) redirect('/providers/login')

  const provider = await prisma.serviceProvider.findUnique({
    where: { id },
    select: {
      id: true,
      businessName: true,
      leadCredits: true,
      promotionalBonusUsed: true,
      deletedAt: true,
      approvedAt: true,
      tier: true,
      state: true,
      placements: { orderBy: { requestedAt: 'desc' } },
      payments: { orderBy: { createdAt: 'desc' }, take: 20 },
      creditTransactions: { orderBy: { createdAt: 'desc' }, take: 20 },
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
          <div className="mt-3 rounded-xl border border-green-800 bg-green-950/40 p-4">
            <p className="font-semibold text-green-300">Your listing is approved!</p>
            <p className="mt-1 text-sm text-gray-300">
              Your company is now listed on DieselRepairFinder. Activate your prepaid lead account
              to begin receiving qualified service opportunities. Your free listing stays active
              if you choose to continue without lead participation.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a href="#buy-lead-credits" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold">
                Fund Your Lead Account
              </a>
              <Link href="/providers" className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold">
                Continue With Free Listing
              </Link>
            </div>
          </div>
          <form action="/api/providers/auth/logout" method="post" className="mt-3">
            <button className="text-sm text-gray-400 underline">Sign out</button>
          </form>
        </div>

        {sp.session_id && <CheckoutConfirmation providerId={provider.id} sessionId={sp.session_id} />}

        {sp.cancelled === '1' && (
          <div className="bg-yellow-950 border border-yellow-700 text-yellow-300 rounded-xl px-5 py-4 mb-6 text-sm">
            Payment cancelled. Your account was not charged.
          </div>
        )}

        {provider.leadCredits === 0 && (
          <div className="mb-6 rounded-xl border border-blue-700 bg-blue-950/40 p-5">
            <p className="font-semibold">Your lead account has no credits.</p>
            <p className="mt-1 text-sm text-gray-300">Fund your account to become eligible for matching service requests.</p>
            <a href="#buy-lead-credits" className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold">
              Fund Your Account · Buy Lead Credits
            </a>
          </div>
        )}

        <BillingForm
          providerId={provider.id}
          leadCredits={provider.leadCredits}
          promotionalBonusUsed={provider.promotionalBonusUsed}
        />

        <section className="mt-10 rounded-xl border border-gray-800 bg-gray-950 p-6">
          <h2 className="mb-2 text-xl font-bold">Upgrade Your Listing</h2>
          <p className="mb-4 text-sm text-gray-400">
            Annual featured and premium state advertising is separate from lead credits.
          </p>
          <Link href={`/providers/${provider.id}/placements`} className="inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold">
            Request a State Placement
          </Link>
          {provider.placements.length > 0 && (
            <div className="mt-5 space-y-3">
              <h3 className="font-semibold">State placements</h3>
              {provider.placements.map((placement) => (
                <div key={placement.id} className="rounded-lg border border-gray-800 p-3 text-sm">
                  <p>{placement.tier} · {placement.state} · {placement.status}</p>
                  <p className="text-gray-400">Payment: {placement.paymentStatus}</p>
                  {placement.expiresAt && <p className="text-gray-400">Expires {placement.expiresAt.toLocaleDateString()}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-gray-800 bg-gray-950 p-6">
          <h2 className="mb-4 text-xl font-bold">Purchase History</h2>
          {provider.payments.length === 0 ? (
            <p className="text-sm text-gray-400">No credit purchases yet.</p>
          ) : (
            <div className="space-y-3">
              {provider.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between gap-4 border-b border-gray-800 pb-3 text-sm">
                  <span>{payment.createdAt.toLocaleDateString()} · {payment.creditsPurchased} credits · {payment.status}</span>
                  <span>${(payment.amountCents / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          {provider.creditTransactions.length > 0 && (
            <div className="mt-5 space-y-2">
              <h3 className="font-semibold">Recent credit transactions</h3>
              {provider.creditTransactions.map((transaction) => (
                <p key={transaction.id} className="text-sm text-gray-400">
                  {transaction.createdAt.toLocaleDateString()} · {transaction.amount > 0 ? '+' : ''}{transaction.amount} · {transaction.note ?? transaction.type}
                </p>
              ))}
            </div>
          )}
        </section>

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
