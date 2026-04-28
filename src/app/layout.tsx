import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Diesel Repair Finder — Mobile Diesel Mechanics. Anytime. Anywhere.',
  description:
    'Find mobile diesel mechanics near you fast. Emergency roadside diesel repair and service for trucks and commercial vehicles.',
  keywords: 'diesel repair, mobile mechanic, roadside repair, diesel truck repair, emergency diesel service',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        {children}
      </body>
    </html>
  )
}
