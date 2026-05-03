import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminRequest } from '@/lib/admin-auth'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json().catch(() => ({}))
    const reason = body.reason ?? null

    const updated = await prisma.serviceProvider.update({
      where: { id },
      data: {
        active: false,
        suspendedAt: new Date(),
        suspendedReason: reason,
      },
    })

    return NextResponse.json({ success: true, provider: updated })
  } catch (err) {
    console.error('Admin suspend provider error:', err)
    return NextResponse.json({ error: 'Failed to suspend provider' }, { status: 500 })
  }
}
