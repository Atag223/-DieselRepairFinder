import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMechanicSignupEmail } from '@/lib/email'
import { isValidEmail, parseServices, parseProviderCategory } from '@/lib/validation'

export async function POST(request: NextRequest) {
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
      is24_7,
      services,
      notes,
      providerCategory,
      additionalLocations,
    } = body

    // Validate required fields
    if (!businessName || !contactName || !phone || !email || !city || !state) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Basic email validation
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Check for duplicate email
    const existing = await prisma.serviceProvider.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'An application with this email already exists.' },
        { status: 409 }
      )
    }

    const provider = await prisma.serviceProvider.create({
      data: {
        businessName,
        contactName,
        phone,
        email,
        city,
        state,
        serviceRadius: serviceRadius ? Number(serviceRadius) : null,
        website: website || null,
        is24_7: Boolean(is24_7),
        services: parseServices(services),
        notes: notes || null,
        providerCategory: parseProviderCategory(providerCategory),
        // Application flow defaults — inactive until admin approves
        active: false,
        verificationStatus: 'UNVERIFIED',
        claimStatus: 'PENDING',
        tier: 'FREE',
        source: 'MANUAL',
      },
    })

    // Send email notifications (non-blocking)
    // contactName, email, and phone are validated as required fields above,
    // so they are guaranteed to be non-null at this point.
    sendMechanicSignupEmail({
      businessName: provider.businessName,
      contactName: provider.contactName!,
      email: provider.email!,
      phone: provider.phone!,
      city: provider.city,
      state: provider.state,
    })

    // Create primary ProviderLocation from the main city/state/serviceRadius
    const locationCreates = [
      prisma.providerLocation.create({
        data: {
          providerId: provider.id,
          city: provider.city,
          state: provider.state,
          serviceRadius: provider.serviceRadius ?? 50,
          phone: provider.phone ?? null,
          contactName: provider.contactName ?? null,
          isPrimary: true,
          active: true,
        },
      }),
    ]

    // Additional locations (max 3, matching the join form UI limit)
    const extraLocations: Array<{ city?: string; state?: string; serviceRadius?: number; phone?: string }> =
      Array.isArray(additionalLocations) ? additionalLocations.slice(0, 3) : []

    for (const loc of extraLocations) {
      if (loc.city && loc.state) {
        locationCreates.push(
          prisma.providerLocation.create({
            data: {
              providerId: provider.id,
              city: loc.city,
              state: loc.state,
              serviceRadius: loc.serviceRadius ? Number(loc.serviceRadius) : 50,
              phone: loc.phone || null,
              isPrimary: false,
              active: true,
            },
          })
        )
      }
    }

    await Promise.all(locationCreates)

    return NextResponse.json(
      {
        success: true,
        id: provider.id,
        message: 'Your application has been submitted. We will review it and be in touch soon.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating provider application:', error)
    return NextResponse.json(
      { error: 'Failed to submit application. Please try again.' },
      { status: 500 }
    )
  }
}
