import ProvidersPage from '@/app/providers/page'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mobile Hydraulic Hose Repair Near Me | DieselRepairFinder',
  description:
    'Browse mobile hydraulic hose repair providers for blown hoses, hydraulic line leaks, industrial hydraulic service, and heavy equipment repair.',
}

export default function HydraulicHoseRepairPage() {
  return <ProvidersPage searchParams={Promise.resolve({ category: 'hydraulic-hose-repair' })} />
}
