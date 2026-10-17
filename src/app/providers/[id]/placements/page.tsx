import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { isProviderSessionValid, PROVIDER_SESSION_COOKIE } from '@/lib/provider-auth'
import SiteNav from '@/app/components/SiteNav'
import PlacementRequestForm from './PlacementRequestForm'
import PlacementCheckoutConfirmation from './PlacementCheckoutConfirmation'

export default async function ProviderPlacementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session_id?: string; cancelled?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const cookieStore = await cookies()
  if (!(await isProviderSessionValid(id, cookieStore.get(PROVIDER_SESSION_COOKIE)?.value))) {
    redirect('/providers/login')
  }
  const provider = await prisma.serviceProvider.findFirst({
    where: {
      id,
      active: true,
      approvedAt: { not: null },
      suspendedAt: null,
      deletedAt: null,
    },
    select: { id: true, businessName: true },
  })
  if (!provider) notFound()
  return (
    <div className="min-h-screen bg-black text-white">
      <SiteNav />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-12">
        <div>
          <h1 className="text-3xl font-bold">Upgrade Your Listing</h1>
          <p className="text-gray-400">{provider.businessName}</p>
        </div>
        {sp.session_id && (
          <PlacementCheckoutConfirmation providerId={provider.id} sessionId={sp.session_id} />
        )}
        {sp.cancelled === '1' && (
          <div className="rounded-xl border border-yellow-700 bg-yellow-950 px-5 py-4 text-sm text-yellow-300">
            Checkout was cancelled. You were not charged.
          </div>
        )}
        <div className="rounded-xl border border-gray-800 bg-gray-950 p-6">
          <PlacementRequestForm providerId={provider.id} />
        </div>
        <Link className="text-sm text-blue-400 underline" href={`/providers/${provider.id}/billing`}>
          Back to provider dashboard
        </Link>
      </main>
    </div>
  )
}
