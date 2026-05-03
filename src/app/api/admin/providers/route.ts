import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminRequest } from '@/lib/admin-auth'
import { ProviderCategory, ProviderTier, VerificationStatus, ClaimStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      businessName,
      contactName,
      phone,
      email,
      city,
      state,
      serviceRadius,
      website,
      services,
      providerCategory,
      tier,
      verificationStatus,
      isVerified,
      claimStatus,
      notes,
      active,
    } = body

    if (!businessName || !city || !state || !providerCategory) {
      return NextResponse.json({ error: 'Missing required fields: businessName, city, state, providerCategory' }, { status: 400 })
    }

    const provider = await prisma.serviceProvider.create({
      data: {
        businessName,
        contactName: contactName || null,
        phone: phone || null,
        email: email || null,
        city,
        state,
        serviceRadius: serviceRadius ? Number(serviceRadius) : null,
        website: website || null,
        services: Array.isArray(services) ? services : (services ? [services] : []),
        notes: notes || null,
        providerCategory: providerCategory as ProviderCategory,
        tier: (tier as ProviderTier) || 'FREE',
        verificationStatus: (verificationStatus as VerificationStatus) || 'UNVERIFIED',
        isVerified: Boolean(isVerified),
        claimStatus: (claimStatus as ClaimStatus) || 'UNCLAIMED',
        active: active !== undefined ? Boolean(active) : true,
      },
    })

    return NextResponse.json({ success: true, id: provider.id }, { status: 201 })
  } catch (err) {
    console.error('Admin create provider error:', err)
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 })
  }
}
