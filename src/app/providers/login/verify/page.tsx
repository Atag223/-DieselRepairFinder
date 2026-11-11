import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SiteNav from '@/app/components/SiteNav'
import VerifyLogin from './VerifyLogin'

export const metadata: Metadata = {
  title: 'Provider Sign In | DieselRepairFinder',
  robots: { index: false, follow: false, noarchive: true },
}

export default async function VerifyLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (token && !/^[A-Za-z0-9_-]{40,60}$/.test(token)) notFound()
  return (
    <div className="min-h-screen bg-black text-white">
      <SiteNav />
      <main className="mx-auto max-w-lg px-4 py-14">
        <h1 className="mb-5 text-3xl font-bold">Sign in to your provider account</h1>
        <VerifyLogin token={token ?? ''} />
      </main>
    </div>
  )
}
