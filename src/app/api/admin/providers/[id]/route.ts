import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminRequest } from '@/lib/admin-auth'
import { ProviderCategory, ProviderTier, VerificationStatus, ClaimStatus } from '@prisma/client'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { action, ...fields } = body

    // Handle special actions
    if (action === 'suspend') {
      const updated = await prisma.serviceProvider.update({
        where: { id },
        data: {
          active: false,
          suspendedAt: new Date(),
          suspendedReason: fields.reason || null,
        },
      })
      return NextResponse.json({ success: true, provider: updated })
    }

    if (action === 'approve') {
      const updated = await prisma.serviceProvider.update({
        where: { id },
        data: {
          active: true,
          verificationStatus: 'VERIFIED',
          claimStatus: 'CLAIMED',
          suspendedAt: null,
          suspendedReason: null,
          deletedAt: null,
        },
      })
      return NextResponse.json({ success: true, provider: updated })
    }

    if (action === 'reactivate') {
      const updated = await prisma.serviceProvider.update({
        where: { id },
        data: {
          active: true,
          suspendedAt: null,
          suspendedReason: null,
          deletedAt: null,
        },
      })
      return NextResponse.json({ success: true, provider: updated })
    }

    // General field update
    const {
      businessName,
      contactName,
      phone,
      email,
      website,
      city,
      state,
      serviceRadius,
      services,
      providerCategory,
      tier,
      verificationStatus,
      isVerified,
      claimStatus,
      notes,
      active,
    } = fields

    const data: Record<string, unknown> = {}
    if (businessName !== undefined) data.businessName = businessName
    if (contactName !== undefined) data.contactName = contactName || null
    if (phone !== undefined) data.phone = phone || null
    if (email !== undefined) data.email = email || null
    if (website !== undefined) data.website = website || null
    if (city !== undefined) data.city = city
    if (state !== undefined) data.state = state
    if (serviceRadius !== undefined) data.serviceRadius = serviceRadius ? Number(serviceRadius) : null
    if (services !== undefined) data.services = Array.isArray(services) ? services : (services ? [services] : [])
    if (providerCategory !== undefined) data.providerCategory = providerCategory as ProviderCategory
    if (tier !== undefined) data.tier = tier as ProviderTier
    if (verificationStatus !== undefined) data.verificationStatus = verificationStatus as VerificationStatus
    if (isVerified !== undefined) data.isVerified = Boolean(isVerified)
    if (claimStatus !== undefined) data.claimStatus = claimStatus as ClaimStatus
    if (notes !== undefined) data.notes = notes || null
    if (active !== undefined) data.active = Boolean(active)

    const updated = await prisma.serviceProvider.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, provider: updated })
  } catch (err) {
    console.error('Admin update provider error:', err)
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // Soft delete: mark inactive and set deletedAt
    await prisma.serviceProvider.update({
      where: { id },
      data: {
        active: false,
        deletedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Admin delete provider error:', err)
    return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 })
  }
}
