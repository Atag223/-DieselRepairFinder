import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMechanicSignupEmail } from '@/lib/email'
import { isValidEmail, parseServices } from '@/lib/validation'

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
    } = body

    // Validate required fields
    if (!businessName || !contactName || !phone || !email || !city || !state || !serviceRadius) {
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

    const validCategories = ['DIESEL_MECHANIC', 'MOBILE_TIRE_SERVICE', 'HEAVY_DUTY_WRECKER']
    const category = validCategories.includes(providerCategory) ? providerCategory : 'DIESEL_MECHANIC'

    const provider = await prisma.serviceProvider.create({
      data: {
        businessName,
        contactName,
        phone,
        email,
        city,
        state,
        serviceRadius: Number(serviceRadius),
        website: website || null,
        is24_7: Boolean(is24_7),
        services: parseServices(services),
        notes: notes || null,
        providerCategory: category,
      },
    })

    // Send email notifications (non-blocking)
    sendMechanicSignupEmail({
      businessName: provider.businessName,
      contactName: provider.contactName,
      email: provider.email,
      phone: provider.phone,
      city: provider.city,
      state: provider.state,
    })

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
