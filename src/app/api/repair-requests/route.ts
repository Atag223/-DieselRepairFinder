import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendRepairRequestEmail } from '@/lib/email'
import { isValidEmail, parseProviderCategory } from '@/lib/validation'
import { selectProviders, createLeadsForRequest } from '@/lib/leads'
import { getRepairRequestConfirmationMessage } from '@/lib/request-routing'

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
      latitude,
      longitude,
      breakdownNow,
      truckType,
      unitNumber,
      roadsideLocation,
      specialNotes,
      requestedCategory,
      paymentMethod,
      paymentNotes,
      poNumber,
      nationalAccountName,
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
        latitude: latitude != null ? Number(latitude) : null,
        longitude: longitude != null ? Number(longitude) : null,
        breakdownNow: Boolean(breakdownNow),
        truckType: truckType || null,
        unitNumber: unitNumber || null,
        roadsideLocation: roadsideLocation || null,
        specialNotes: specialNotes || null,
        requestedCategory: parseProviderCategory(requestedCategory),
        paymentMethod: paymentMethod ? String(paymentMethod) : 'Unknown',
        paymentNotes: paymentNotes || null,
        poNumber: poNumber || null,
        nationalAccountName: nationalAccountName || null,
        routingStatus: 'PENDING',
      },
    })

    let dispatchedCount = 0
    let failedCount = 0
    let routingError: string | null = null
    try {
      const providers = await selectProviders({
        state: serviceRequest.state,
        category: serviceRequest.requestedCategory,
        serviceRequestId: serviceRequest.id,
        latitude: serviceRequest.latitude,
        longitude: serviceRequest.longitude,
      })
      if (providers.length > 0) {
        const dispatch = await createLeadsForRequest(serviceRequest.id, providers)
        dispatchedCount = dispatch.dispatchedCount
        failedCount = dispatch.failedCount
        if (failedCount > 0) {
          routingError = `${failedCount} selected provider notification(s) failed.`
        }
      } else {
        routingError = 'No funded matching providers were available.'
        console.warn('[leads] No funded matching providers available', {
          serviceRequestId: serviceRequest.id,
          referenceId: serviceRequest.referenceId,
        })
      }
    } catch {
      console.error(
        '[leads] CRITICAL: Request saved but provider routing failed',
        { serviceRequestId: serviceRequest.id, referenceId: serviceRequest.referenceId }
      )
      routingError = 'Provider routing failed.'
    }

    const routingStatus = dispatchedCount > 0 ? 'DISPATCHED' : 'NEEDS_ATTENTION'
    const notificationResult = await sendRepairRequestEmail({
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
      routingStatus,
      routingError,
      dispatchedCount,
    })
    if (!notificationResult.adminNotified || !notificationResult.requesterNotified) {
      console.error('[leads] Repair request email delivery incomplete', {
        serviceRequestId: serviceRequest.id,
        referenceId: serviceRequest.referenceId,
        adminNotified: notificationResult.adminNotified,
        requesterNotified: notificationResult.requesterNotified,
      })
    }
    try {
      await prisma.serviceRequest.update({
        where: { id: serviceRequest.id },
        data: {
          routingStatus,
          routingError,
          adminNotifiedAt: notificationResult.adminNotified ? new Date() : null,
          requesterNotifiedAt: notificationResult.requesterNotified ? new Date() : null,
        },
      })
    } catch {
      console.error('[leads] Failed to record routing notification status', {
        serviceRequestId: serviceRequest.id,
        referenceId: serviceRequest.referenceId,
      })
    }

    return NextResponse.json(
      {
        success: true,
        referenceId: serviceRequest.referenceId,
        message: getRepairRequestConfirmationMessage(
          dispatchedCount,
          notificationResult.adminNotified
        ),
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
