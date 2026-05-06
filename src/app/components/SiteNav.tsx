'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/providers', label: 'Browse Providers' },
  { href: '/join', label: 'Join as Provider' },
  { href: '/#request', label: 'Request Service' },
]

export default function SiteNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    // Hash-only links (e.g. /#request) are never highlighted as active
    if (href.includes('#')) return false
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="border-b border-gray-800 bg-black/90 sticky top-0 z-50 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Branding */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🚛</span>
          <span className="font-bold text-lg text-white">
            Diesel<span className="text-blue-500">Repair</span>Finder
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                isActive(link.href)
                  ? 'text-blue-400 font-semibold'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/admin/login"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Admin
          </Link>
        </div>

        {/* Right-side CTA(s) */}
        <div className="flex items-center gap-2">
          {/* Mobile: show key links */}
          <Link
            href="/providers"
            className="md:hidden text-sm text-gray-300 hover:text-white transition-colors px-2 py-1"
          >
            Browse
          </Link>
          <Link
            href="/join"
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
              isActive('/join')
                ? 'bg-blue-500 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Join as Provider
          </Link>
        </div>
      </div>
    </nav>
  )
}
