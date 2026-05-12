import Link from 'next/link'
import SiteNav from '@/app/components/SiteNav'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <SiteNav />

      <main className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
            Free to list.{' '}
            <span className="text-blue-400">Pay only for qualified leads.</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            No monthly fees. No hidden costs. Get listed on DieselRepairFinder today and only
            pay when a real customer reaches out.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid sm:grid-cols-3 gap-6 mb-14">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-7 flex flex-col">
            <div className="text-3xl mb-3">🆓</div>
            <h2 className="text-lg font-bold mb-2">Free Listing</h2>
            <p className="text-gray-400 text-sm flex-1">
              Your company is listed publicly at no cost. Customers can find and contact you
              directly from your profile.
            </p>
            <div className="mt-4 text-2xl font-extrabold text-white">$0</div>
            <div className="text-gray-500 text-xs">Always free</div>
          </div>

          <div className="bg-blue-950/40 border border-blue-700/60 rounded-2xl p-7 flex flex-col relative">
            <div className="absolute -top-3 left-6 bg-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
              After Approval
            </div>
            <div className="text-3xl mb-3">🎁</div>
            <h2 className="text-lg font-bold mb-2">3 Free Lead Credits</h2>
            <p className="text-gray-400 text-sm flex-1">
              Every approved provider receives 3 free lead credits once — after your listing is
              approved or your claim is verified.
            </p>
            <div className="mt-4 text-2xl font-extrabold text-blue-400">$0</div>
            <div className="text-gray-500 text-xs">One time, after approval</div>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-7 flex flex-col">
            <div className="text-3xl mb-3">⚡</div>
            <h2 className="text-lg font-bold mb-2">$25 Per Qualified Lead</h2>
            <p className="text-gray-400 text-sm flex-1">
              After your free credits, each qualified lead costs $25. You only pay when a real
              customer request is routed to you.
            </p>
            <div className="mt-4 text-2xl font-extrabold text-white">$25</div>
            <div className="text-gray-500 text-xs">Per qualified lead</div>
          </div>
        </div>

        {/* Buy credits packages */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-8 mb-14">
          <h2 className="text-xl font-bold mb-1">Buy Lead Credits in Bulk</h2>
          <p className="text-gray-400 text-sm mb-6">
            Fund your account whenever you need. Credits never expire.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { credits: 5, price: 125 },
              { credits: 10, price: 250, popular: true },
              { credits: 20, price: 500 },
            ].map((pkg) => (
              <div
                key={pkg.credits}
                className={`relative border rounded-xl p-5 text-center ${
                  pkg.popular
                    ? 'border-blue-500 bg-blue-950/30'
                    : 'border-gray-700 bg-gray-900'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                    Most Popular
                  </span>
                )}
                <div className="text-3xl font-extrabold text-white mb-1">{pkg.credits}</div>
                <div className="text-gray-400 text-sm mb-2">leads</div>
                <div className="text-2xl font-bold text-blue-400">${pkg.price}</div>
                <div className="text-gray-500 text-xs">${pkg.price / pkg.credits} per lead</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature list */}
        <div className="grid sm:grid-cols-2 gap-6 mb-14">
          {[
            {
              icon: '✅',
              title: 'Free company listing',
              desc: 'Your business shows up in our directory at no charge.',
            },
            {
              icon: '🎁',
              title: 'First 3 leads free after approval',
              desc: 'Every new approved provider gets a head start.',
            },
            {
              icon: '💳',
              title: '$25 per qualified lead after free credits',
              desc: 'Only pay for real customer requests routed to you.',
            },
            {
              icon: '🚫',
              title: 'No monthly fee required',
              desc: 'There is no subscription. You pay as you grow.',
            },
            {
              icon: '💰',
              title: 'You keep 100% of your labor rate',
              desc: 'We never take a cut of the job. You negotiate directly with the customer.',
            },
            {
              icon: '♾️',
              title: 'Credits never expire',
              desc: 'Buy credits when you need them. Use them whenever.',
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-4">
              <div className="text-2xl shrink-0">{item.icon}</div>
              <div>
                <div className="font-semibold text-white text-sm">{item.title}</div>
                <div className="text-gray-400 text-sm">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-extrabold">Ready to grow your business?</h2>
          <p className="text-gray-400">
            Get listed for free and start receiving qualified diesel repair leads.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-6">
            <Link
              href="/join"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl text-base transition-colors"
            >
              Join as Provider
            </Link>
            <Link
              href="/providers"
              className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-8 py-3 rounded-xl text-base transition-colors"
            >
              Claim Your Listing
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
