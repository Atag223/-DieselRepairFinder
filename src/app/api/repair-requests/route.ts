import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendRepairRequestEmail } from '@/lib/email'
import { isValidEmail, parseProviderCategory } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      requesterName,
      requesterEmail,
      requesterPhone,
      serviceAddress,
      issueType,
      issueDetails,
      requesterCompany,
      city,
      state,
      breakdownNow,
      truckType,
      unitNumber,
      roadsideLocation,
      specialNotes,
      requestedCategory,
    } = body

    // Validate required fields
    if (
      !requesterName ||
      !requesterEmail ||
      !requesterPhone ||
      !serviceAddress ||
      !issueType ||
      !issueDetails
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Basic email validation
    if (!isValidEmail(requesterEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        requesterName,
        requesterEmail,
        requesterPhone,
        serviceAddress,
        issueType,
        issueDetails,
        requesterCompany: requesterCompany || null,
        city: city || null,
        state: state || null,
        breakdownNow: Boolean(breakdownNow),
        truckType: truckType || null,
        unitNumber: unitNumber || null,
        roadsideLocation: roadsideLocation || null,
        specialNotes: specialNotes || null,
        requestedCategory: parseProviderCategory(requestedCategory),
      },
    })

    // Send email notifications (non-blocking)
    sendRepairRequestEmail({
      referenceId: serviceRequest.referenceId,
      requesterName: serviceRequest.requesterName,
      requesterEmail: serviceRequest.requesterEmail,
      requesterPhone: serviceRequest.requesterPhone,
      serviceAddress: serviceRequest.serviceAddress,
      issueType: serviceRequest.issueType,
      issueDetails: serviceRequest.issueDetails,
      requesterCompany: serviceRequest.requesterCompany,
      breakdownNow: serviceRequest.breakdownNow,
      truckType: serviceRequest.truckType,
    })

    return NextResponse.json(
      {
        success: true,
        referenceId: serviceRequest.referenceId,
        message: 'Your request has been submitted. A provider will contact you shortly.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating service request:', error)
    return NextResponse.json(
      { error: 'Failed to submit request. Please try again.' },
      { status: 500 }
    )
  }
}
