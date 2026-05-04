import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ClaimForm from './ClaimForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClaimPage({ params }: Props) {
  const { id } = await params

  const provider = await prisma.serviceProvider.findUnique({
    where: { id },
    select: {
      id: true,
      businessName: true,
      city: true,
      state: true,
      claimStatus: true,
      deletedAt: true,
    },
  })

  if (!provider || provider.deletedAt) notFound()

  const alreadyClaimed = provider.claimStatus === 'CLAIMED'

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-black/90 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🚛</span>
            <span className="font-bold text-lg text-white">
              Diesel<span className="text-blue-500">Repair</span>Finder
            </span>
          </Link>
          <Link href="/providers" className="text-blue-400 text-sm">
            ← Back to Directory
          </Link>
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold mb-1">Claim This Business</h1>
          <p className="text-gray-400">
            Claiming{' '}
            <span className="text-white font-semibold">{provider.businessName}</span> in{' '}
            {provider.city}, {provider.state}
          </p>
        </div>

        {alreadyClaimed ? (
          <div className="bg-yellow-950 border border-yellow-700 rounded-xl p-8 text-center">
            <div className="text-3xl mb-3">🏢</div>
            <h2 className="text-lg font-bold text-yellow-300 mb-2">Already Claimed</h2>
            <p className="text-yellow-400 text-sm mb-4">
              This business has already been claimed. If you believe this is an error, contact us.
            </p>
            <Link
              href="/providers"
              className="inline-block text-sm text-gray-400 hover:text-white underline"
            >
              Back to Directory
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-4 mb-6 text-sm text-blue-300">
              <strong>Why claim your listing?</strong> Verified owners can update contact info,
              add photos, respond to reviews, and access premium placement options.
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <ClaimForm
                providerId={provider.id}
                businessName={provider.businessName}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
