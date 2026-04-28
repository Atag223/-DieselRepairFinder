import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMechanicSignupEmail } from '@/lib/email'

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
    } = body

    // Validate required fields
    if (!businessName || !contactName || !phone || !email || !city || !state || !serviceRadius) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Basic email validation
    const atIndex = email.indexOf('@')
    const isValidEmail =
      atIndex > 0 &&
      atIndex < email.length - 1 &&
      email.lastIndexOf('@') === atIndex &&
      email.slice(atIndex + 1).includes('.') &&
      !email.includes(' ')
    if (!isValidEmail) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Check for duplicate email
    const existing = await prisma.dieselMechanic.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'An application with this email already exists.' },
        { status: 409 }
      )
    }

    const mechanic = await prisma.dieselMechanic.create({
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
        services: Array.isArray(services)
          ? services
          : typeof services === 'string'
          ? services.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
        notes: notes || null,
      },
    })

    // Send email notifications (non-blocking)
    sendMechanicSignupEmail({
      businessName: mechanic.businessName,
      contactName: mechanic.contactName,
      email: mechanic.email,
      phone: mechanic.phone,
      city: mechanic.city,
      state: mechanic.state,
    })

    return NextResponse.json(
      {
        success: true,
        id: mechanic.id,
        message: 'Your application has been submitted. We will review it and be in touch soon.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating mechanic application:', error)
    return NextResponse.json(
      { error: 'Failed to submit application. Please try again.' },
      { status: 500 }
    )
  }
}
