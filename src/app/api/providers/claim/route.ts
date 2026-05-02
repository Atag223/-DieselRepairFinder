import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidEmail } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { providerId, businessName, contactName, phone, email, notes } = body

    // Validate required fields
    if (!providerId || !businessName || !contactName || !phone || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Verify the provider exists
    const provider = await prisma.serviceProvider.findUnique({
      where: { id: providerId },
      select: { id: true, claimStatus: true },
    })

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    if (provider.claimStatus === 'CLAIMED') {
      return NextResponse.json(
        { error: 'This business has already been claimed.' },
        { status: 409 }
      )
    }

    // Create claim request and update provider claim status to PENDING
    await prisma.$transaction([
      prisma.providerClaimRequest.create({
        data: {
          providerId,
          businessName: businessName.trim(),
          contactName: contactName.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          notes: notes?.trim() || null,
        },
      }),
      prisma.serviceProvider.update({
        where: { id: providerId },
        data: { claimStatus: 'PENDING' },
      }),
    ])

    return NextResponse.json(
      { success: true, message: 'Claim request submitted successfully.' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error submitting claim request:', error)
    return NextResponse.json(
      { error: 'Failed to submit claim request. Please try again.' },
      { status: 500 }
    )
  }
}
