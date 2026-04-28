import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendRepairRequestEmail } from '@/lib/email'
import { isValidEmail } from '@/lib/validation'

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

    const repairRequest = await prisma.dieselRepairRequest.create({
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
      },
    })

    // Send email notifications (non-blocking)
    sendRepairRequestEmail({
      referenceId: repairRequest.referenceId,
      requesterName: repairRequest.requesterName,
      requesterEmail: repairRequest.requesterEmail,
      requesterPhone: repairRequest.requesterPhone,
      serviceAddress: repairRequest.serviceAddress,
      issueType: repairRequest.issueType,
      issueDetails: repairRequest.issueDetails,
      requesterCompany: repairRequest.requesterCompany,
      breakdownNow: repairRequest.breakdownNow,
      truckType: repairRequest.truckType,
    })

    return NextResponse.json(
      {
        success: true,
        referenceId: repairRequest.referenceId,
        message: 'Your repair request has been submitted. A mechanic will contact you shortly.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating repair request:', error)
    return NextResponse.json(
      { error: 'Failed to submit repair request. Please try again.' },
      { status: 500 }
    )
  }
}
