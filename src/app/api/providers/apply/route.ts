import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMechanicSignupEmail } from '@/lib/email'
import { isValidEmail, parseServices, parseProviderCategory, validateAdditionalLocations } from '@/lib/validation'

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
      description,
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

    const additionalLocationValidation = validateAdditionalLocations(additionalLocations)
    if ('error' in additionalLocationValidation) {
      return NextResponse.json({ error: additionalLocationValidation.error }, { status: 400 })
    }

    // Check for duplicate email
    const existing = await prisma.serviceProvider.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (existing) {
      return NextResponse.json(
        { error: 'An application with this email already exists.' },
        { status: 409 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()
    const provider = await prisma.$transaction(async (tx) => {
      const createdProvider = await tx.serviceProvider.create({
        data: {
          businessName: businessName.trim(),
          contactName: contactName.trim(),
          phone: phone.trim(),
          email: normalizedEmail,
          city: city.trim(),
          state: state.trim().toUpperCase(),
          serviceRadius: serviceRadius ? Number(serviceRadius) : null,
          website: website || null,
          description: description || null,
          is24_7: Boolean(is24_7),
          services: parseServices(services),
          notes: notes || null,
          providerCategory: parseProviderCategory(providerCategory),
          active: false,
          verificationStatus: 'UNVERIFIED',
          claimStatus: 'PENDING',
          tier: 'FREE',
          source: 'MANUAL',
        },
      })

      await tx.providerLocation.createMany({
        data: [
          {
            providerId: createdProvider.id,
            city: createdProvider.city,
            state: createdProvider.state,
            serviceRadius: createdProvider.serviceRadius ?? 50,
            phone: createdProvider.phone,
            contactName: createdProvider.contactName,
            isPrimary: true,
            active: true,
          },
          ...additionalLocationValidation.locations.map((location) => ({
            providerId: createdProvider.id,
            city: location.city,
            state: location.state,
            serviceRadius: location.serviceRadius,
            phone: location.phone,
            isPrimary: false,
            active: true,
          })),
        ],
      })
      return createdProvider
    })

    const notificationResult = await sendMechanicSignupEmail({
      businessName: provider.businessName,
      contactName: provider.contactName!,
      email: provider.email!,
      phone: provider.phone!,
      city: provider.city,
      state: provider.state,
    })
    if (!notificationResult.adminNotified || !notificationResult.applicantNotified) {
      console.error('Provider application email delivery incomplete', {
        providerId: provider.id,
        ...notificationResult,
      })
    }

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
