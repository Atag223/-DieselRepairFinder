import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import EditProviderForm from './EditProviderForm'
import AdminCreditManager from './AdminCreditManager'
import Link from 'next/link'

type Props = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export default async function EditProviderPage({ params }: Props) {
  const { id } = await params

  const provider = await prisma.serviceProvider.findUnique({
    where: { id },
    include: {
      creditTransactions: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          createdAt: true,
          amount: true,
          type: true,
          note: true,
        },
      },
    },
  })
  if (!provider) notFound()

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-gray-800 bg-black/90 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🚛</span>
              <span className="font-bold text-lg text-white">
                Diesel<span className="text-blue-500">Repair</span>Finder
              </span>
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/admin" className="text-gray-400 hover:text-white text-sm transition-colors">
              Dashboard
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/admin/providers" className="text-gray-400 hover:text-white text-sm transition-colors">
              Providers
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold mb-2">Edit Provider</h1>
          <p className="text-gray-400 text-sm">{provider.businessName}</p>
        </div>

        <EditProviderForm provider={provider} />

        <AdminCreditManager
          providerId={provider.id}
          leadCredits={provider.leadCredits}
          stripeAccountBalanceCents={provider.stripeAccountBalanceCents}
          freeLeadCreditsIssued={provider.freeLeadCreditsIssued}
          lastCreditGrantAt={provider.lastCreditGrantAt?.toISOString() ?? null}
          transactions={provider.creditTransactions.map((t) => ({
            ...t,
            createdAt: t.createdAt.toISOString(),
            type: t.type as string,
          }))}
        />
      </main>
    </div>
  )
}
