import Link from 'next/link'
import SiteNav from '@/app/components/SiteNav'
import { BILLING_PACKAGES } from '@/lib/billing'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <SiteNav />

      <main className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
            Free to List.{' '}
            <span className="text-blue-400">Pay Only for Accepted Leads.</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Create your free company listing and become discoverable by contractors and equipment
            operators nationwide. Activate a prepaid lead account whenever you&apos;re ready to
            receive qualified service requests. No monthly subscriptions. Just $25 per accepted lead.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid sm:grid-cols-3 gap-6 mb-14">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-7 flex flex-col">
            <div className="text-3xl mb-3">🆓</div>
            <h2 className="text-lg font-bold mb-2">Free Listing</h2>
            <p className="text-gray-400 text-sm flex-1">
              Free listings provide directory visibility with company details, service categories,
              coverage areas, capabilities, and verification status. Customers request service
              through DieselRepairFinder; free listings do not display direct contact details.
            </p>
            <div className="mt-4 text-2xl font-extrabold text-white">$0</div>
            <div className="text-gray-500 text-xs">Always free</div>
          </div>

          <div className="bg-blue-950/40 border border-blue-700/60 rounded-2xl p-7 flex flex-col relative">
            <div className="absolute -top-3 left-6 bg-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
              After Approval
            </div>
            <div className="text-3xl mb-3">🎁</div>
            <h2 className="text-lg font-bold mb-2">Activate Lead Participation</h2>
            <p className="text-gray-400 text-sm flex-1">
              Purchase a prepaid package at any time from your provider account to become eligible
              for matching paid service requests. No monthly subscription is required.
            </p>
            <div className="mt-4 text-2xl font-extrabold text-blue-400">Prepaid</div>
            <div className="text-gray-500 text-xs">Credits used on acceptance</div>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-7 flex flex-col">
            <div className="text-3xl mb-3">⚡</div>
            <h2 className="text-lg font-bold mb-2">$25 Per Accepted Lead</h2>
            <p className="text-gray-400 text-sm flex-1">
              Each accepted qualified lead costs one credit ($25). Declining or not responding
              never uses a credit. Customer contact details are shared only after acceptance.
            </p>
            <div className="mt-4 text-2xl font-extrabold text-white">$25</div>
            <div className="text-gray-500 text-xs">Per accepted qualified lead</div>
          </div>
        </div>

        {/* What qualifies */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-8 mb-14">
          <h2 className="text-lg font-bold mb-3">What counts as a qualified lead?</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            A request includes the customer&apos;s contact details, service location, requested
            service category, urgency, and job details. Contact details are revealed only after
            acceptance, and one credit is used only when you accept the lead.
          </p>
        </div>

        {/* Buy credits packages */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-8 mb-14">
          <h2 className="text-xl font-bold mb-1">Buy Lead Credits in Bulk</h2>
          <p className="text-gray-400 text-sm mb-6">
            Bonus credits apply only to the first qualifying package purchase per provider.
            Packages are prepaid; credits are used when a provider accepts a lead.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
          {BILLING_PACKAGES.map((pkg) => {
            return (
              <div
                key={pkg.key}
                className="relative border border-gray-700 bg-gray-900 rounded-xl p-5 text-center"
              >
                {pkg.bonusLabel && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                    {pkg.bonusLabel}
                  </span>
                )}
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {pkg.name}
                </div>
                <div className="text-3xl font-extrabold text-white mb-0.5">{pkg.awardedCredits}</div>
                <div className="text-gray-400 text-xs mb-2">
                  lead credits
                  {pkg.bonusCredits > 0 && (
                    <span className="text-green-400 ml-1">({pkg.paidCredits} + {pkg.bonusCredits} bonus)</span>
                  )}
                </div>
                <div className="text-2xl font-bold text-blue-400">${pkg.amountCents / 100}</div>
                <div className="text-gray-500 text-xs">
                  ${pkg.amountCents / 100 / pkg.paidCredits} per lead
                </div>
              </div>
            )
          })}
          </div>
        </div>

        {/* Feature list */}
        <div className="grid sm:grid-cols-2 gap-6 mb-14">
          {[
            {
              icon: '✅',
              title: 'Free company listing',
              desc: 'Free listings are visible in directory searches, with service requests handled through DieselRepairFinder.',
            },
            {
              icon: '💳',
              title: '$25 per accepted lead',
              desc: 'Pay only when you accept a qualified job request.',
            },
            {
              icon: '🚫',
              title: 'No monthly subscription required',
              desc: 'No monthly fee. No signup fee. You pay as you grow.',
            },
            {
              icon: '💰',
              title: 'You keep 100% of your labor rate',
              desc: 'After accepting a lead, you contact the customer and arrange service directly.',
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

        {/* Optional Placement Upgrades */}
        <div className="mb-14">
          <h2 className="text-xl font-bold mb-1">Optional Placement Upgrades</h2>
          <p className="text-gray-400 text-sm mb-6">
            These are optional annual advertising upgrades — not required subscriptions. Your
            listing and lead credits work the same regardless.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-blue-950/20 border border-blue-800/50 rounded-2xl p-7 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block bg-blue-600/30 text-blue-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Featured
                </span>
                <span className="text-gray-500 text-xs">State Placement</span>
              </div>
              <h3 className="text-lg font-bold mb-2">Featured State Placement</h3>
              <ul className="space-y-1.5 text-sm text-gray-400 flex-1 mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">·</span>
                  Higher placement in selected state pages
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">·</span>
                  Featured badge on your listing
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">·</span>
                  Priority visibility above standard free listings
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-600 mt-0.5">·</span>
                  <span className="text-gray-500">
                    Direct contact display is an advertising benefit; lead acceptance still requires credits
                  </span>
                </li>
              </ul>
              <div className="text-2xl font-extrabold text-blue-400">$1,250<span className="text-base font-medium text-gray-500">/year</span></div>
            </div>

            <div className="bg-yellow-950/20 border border-yellow-700/50 rounded-2xl p-7 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block bg-yellow-500/20 text-yellow-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Premium
                </span>
                <span className="text-gray-500 text-xs">State Placement</span>
              </div>
              <h3 className="text-lg font-bold mb-2">Premium State Placement</h3>
              <ul className="space-y-1.5 text-sm text-gray-400 flex-1 mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">·</span>
                  Top provider placement in selected state pages where available
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">·</span>
                  Premium badge on your listing
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">·</span>
                  Highest visibility above Featured and standard listings
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-600 mt-0.5">·</span>
                  <span className="text-gray-500">
                    Direct contact display is an advertising benefit; lead acceptance still requires credits
                  </span>
                </li>
              </ul>
              <div className="text-2xl font-extrabold text-yellow-400">$1,500<span className="text-base font-medium text-gray-500">/year</span></div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-extrabold">Ready to grow your business?</h2>
          <p className="text-gray-400">
            Get listed for free. Purchase credits whenever you are ready to receive qualified service requests.
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
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-8 mt-14">
          <h2 className="text-xl font-bold mb-3">AI-assisted service discovery</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Swamper Clyde, HydroVacFinder&apos;s AI assistant, helps hydrovac operators locate mobile
            diesel mechanics, mobile tire services, hydraulic hose repair companies, and heavy-duty
            towing providers. Referrals that support online requests are directed into
            DieselRepairFinder&apos;s service-request workflow. Similar AI-assisted discovery is in
            development for IndustrialCleaningFinder.
          </p>
        </div>
      </main>
    </div>
  )
}
