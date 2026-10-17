import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { isProviderSessionValid, PROVIDER_SESSION_COOKIE } from '@/lib/provider-auth'
import SiteNav from '@/app/components/SiteNav'
import PlacementRequestForm from './PlacementRequestForm'

export default async function ProviderPlacementsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
