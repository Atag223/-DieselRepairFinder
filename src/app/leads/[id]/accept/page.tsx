import LeadAcceptance from './LeadAcceptance'

export default async function LeadAcceptancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const [{ id }, { token }] = await Promise.all([params, searchParams])
  return (
    <div className="min-h-screen bg-black">
      <LeadAcceptance leadId={id} token={token ?? ''} />
    </div>
  )
}
