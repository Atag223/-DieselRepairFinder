import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminRequest } from '@/lib/admin-auth'
import { ProviderCategory, ProviderTier, VerificationStatus, ClaimStatus } from '@prisma/client'
import { sendProviderApprovalEmail } from '@/lib/email'
import { canReverifyExistingClaim, getProviderLoginEmail, normalizeClaimLoginEmail } from '@/lib/provider-account'

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
      if (updated.email) {
        const sent = await sendProviderApprovalEmail({ to: updated.email, businessName: updated.businessName })
        if (!sent) console.error('Provider suspension notification failed', { providerId: id })
      }
      return NextResponse.json({ success: true, provider: updated })
    }

    if (action === 'approve') {
      const updated = await prisma.serviceProvider.update({
        where: { id },
        data: {
          active: true,
          verificationStatus: 'VERIFIED',
          claimStatus: 'CLAIMED',
          approvedAt: new Date(),
          suspendedAt: null,
          suspendedReason: null,
          deletedAt: null,
        },
      })
      return NextResponse.json({ success: true, provider: updated })
    }

    if (action === 'approve-claim') {
      const updated = await prisma.$transaction(async (tx) => {
        const providerBeforeApproval = await tx.serviceProvider.findUnique({
          where: { id },
          select: { claimStatus: true, claimedByEmail: true },
        })
        if (!providerBeforeApproval) throw new Error('CLAIM_PROVIDER_NOT_FOUND')
        const claimRequest = await tx.providerClaimRequest.findFirst({
          where: {
            providerId: id,
            status: { in: ['NEW', 'CONTACTED'] },
            emailVerifiedAt: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, email: true },
        })
        if (!claimRequest) throw new Error('CLAIM_NOT_VERIFIED')

        const loginEmail = normalizeClaimLoginEmail(claimRequest.email)
        const reverifyExistingClaim = canReverifyExistingClaim(providerBeforeApproval, loginEmail)
        if (
          providerBeforeApproval.claimStatus === 'CLAIMED' &&
          !reverifyExistingClaim
        ) {
          throw new Error('CLAIM_ALREADY_CLAIMED')
        }
        const conflictingProvider = await tx.serviceProvider.findFirst({
          where: {
            id: { not: id },
            OR: [
              { claimedByEmail: { equals: loginEmail, mode: 'insensitive' } },
              {
                claimedByEmail: null,
                email: { equals: loginEmail, mode: 'insensitive' },
              },
            ],
          },
          select: { id: true },
        })
        if (conflictingProvider) throw new Error('CLAIM_EMAIL_IN_USE')

        const updateResult = await tx.serviceProvider.updateMany({
          where: reverifyExistingClaim
            ? {
                id,
                claimStatus: 'CLAIMED',
                claimedByEmail: { equals: loginEmail, mode: 'insensitive' },
              }
            : { id, claimStatus: { not: 'CLAIMED' }, claimedByEmail: null },
          data: {
            active: true,
            verificationStatus: 'VERIFIED',
            claimStatus: 'CLAIMED',
            claimedAt: new Date(),
            claimedByEmail: loginEmail,
            approvedAt: new Date(),
            suspendedAt: null,
            suspendedReason: null,
            deletedAt: null,
          },
        })
        if (updateResult.count !== 1) throw new Error('CLAIM_ALREADY_CLAIMED')
        const markedApproved = await tx.providerClaimRequest.updateMany({
          where: {
            id: claimRequest.id,
            status: { in: ['NEW', 'CONTACTED'] },
            emailVerifiedAt: { not: null },
          },
          data: { status: 'APPROVED' },
        })
        if (markedApproved.count !== 1) throw new Error('CLAIM_NOT_VERIFIED')
        const updated = await tx.serviceProvider.findUnique({ where: { id } })
        if (!updated) throw new Error('CLAIM_PROVIDER_NOT_FOUND')
        return { updated, approvedClaimEmail: loginEmail }
      }, { isolationLevel: 'Serializable' })

      const loginEmail = getProviderLoginEmail(updated.updated, updated.approvedClaimEmail)
      if (loginEmail) {
        const sent = await sendProviderApprovalEmail({ to: loginEmail, businessName: updated.updated.businessName })
        if (!sent) console.error('Provider claim approval notification failed', { providerId: id })
      }
      return NextResponse.json({ success: true, provider: updated.updated })
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

    if (action === 'grant-credits') {
      const amount = Number(fields.amount)
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Invalid credit amount' }, { status: 400 })
      }

      const note = fields.note?.trim() || null

      await prisma.$transaction([
        prisma.serviceProvider.update({
          where: { id },
          data: {
            leadCredits: { increment: amount },
            lastCreditGrantAt: new Date(),
          },
        }),
        prisma.leadCreditTransaction.create({
          data: {
            providerId: id,
            amount,
            type: 'ADMIN_GRANT',
            note: note ?? 'Admin credit grant',
          },
        }),
      ])

      const updated = await prisma.serviceProvider.findUnique({ where: { id } })
      return NextResponse.json({ success: true, provider: updated })
    }

    // General field update
    const {
      businessName,
      contactName,
      phone,
      email,
      website,
      description,
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
    if (description !== undefined) data.description = description || null
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
    if (err instanceof Error && err.message === 'CLAIM_NOT_VERIFIED') {
      return NextResponse.json(
        { error: 'The claimant must verify their email before the claim can be approved.' },
        { status: 409 }
      )
    }
    if (err instanceof Error && err.message === 'CLAIM_EMAIL_IN_USE') {
      return NextResponse.json(
        { error: 'That email is already authorized for another provider listing.' },
        { status: 409 }
      )
    }
    if (err instanceof Error && err.message === 'CLAIM_ALREADY_CLAIMED') {
      return NextResponse.json({ error: 'This provider listing has already been claimed.' }, { status: 409 })
    }
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
