import Link from 'next/link'
import SiteNav from '@/app/components/SiteNav'
import LoginForm from './LoginForm'

export default function ProviderLoginPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <SiteNav />
      <main className="mx-auto max-w-lg px-4 py-14">
        <h1 className="mb-2 text-3xl font-bold">Provider Dashboard Sign In</h1>
        <p className="mb-6 text-gray-400">
          We&apos;ll email a one-time sign-in link to the address on your approved listing.
        </p>
        <div className="rounded-xl border border-gray-800 bg-gray-950 p-6">
          <LoginForm />
        </div>
        <p className="mt-5 text-sm text-gray-500">
          Still waiting for approval? Your free listing application does not require payment.
          <Link href="/join" className="ml-1 text-blue-400">Apply for a free listing.</Link>
        </p>
      </main>
    </div>
  )
}
