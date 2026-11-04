import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidEmail } from '@/lib/validation'
import { createHash, randomBytes } from 'node:crypto'
import { sendProviderClaimVerificationEmail } from '@/lib/email'
import { canReverifyExistingClaim } from '@/lib/provider-account'

const CLAIM_VERIFICATION_TTL_MS = 30 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid claim request' }, { status: 400 })
    }
    const { providerId, businessName, contactName, phone, email, notes } = body as Record<string, unknown>

    if (
      typeof providerId !== 'string' ||
      typeof businessName !== 'string' ||
      typeof contactName !== 'string' ||
      typeof phone !== 'string' ||
      typeof email !== 'string' ||
      !providerId.trim() ||
      !businessName.trim() ||
      !contactName.trim() ||
      !phone.trim()
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const claimantEmail = email.trim().toLowerCase()
    if (!isValidEmail(claimantEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (notes != null && typeof notes !== 'string') {
      return NextResponse.json({ error: 'Invalid claim notes' }, { status: 400 })
    }

    const token = randomBytes(32).toString('base64url')
    const claimRequest = await prisma.$transaction(async (tx) => {
      const provider = await tx.serviceProvider.findUnique({
        where: { id: providerId },
        select: { id: true, claimStatus: true, claimedByEmail: true },
      })
      if (!provider) throw new Error('CLAIM_PROVIDER_NOT_FOUND')
      const reverifyExistingClaim = canReverifyExistingClaim(provider, claimantEmail)
      if (provider.claimStatus === 'CLAIMED' && !reverifyExistingClaim) {
        throw new Error('CLAIM_ALREADY_CLAIMED')
      }

      const created = await tx.providerClaimRequest.create({
        data: {
          providerId: provider.id,
          businessName: businessName.trim(),
          contactName: contactName.trim(),
          phone: phone.trim(),
          email: claimantEmail,
          notes: typeof notes === 'string' ? notes.trim() || null : null,
          emailVerificationTokenHash: createHash('sha256').update(token).digest('hex'),
          emailVerificationExpiresAt: new Date(Date.now() + CLAIM_VERIFICATION_TTL_MS),
        },
      })
      if (!reverifyExistingClaim) {
        const updated = await tx.serviceProvider.updateMany({
          where: {
            id: provider.id,
            claimStatus: { not: 'CLAIMED' },
            claimedByEmail: null,
          },
          data: { claimStatus: 'PENDING' },
        })
        if (updated.count !== 1) throw new Error('CLAIM_ALREADY_CLAIMED')
      }
      return created
    })

    const emailSent = await sendProviderClaimVerificationEmail({ to: claimantEmail, token })
    if (!emailSent) {
      console.error('Provider claim verification email delivery failed', {
        claimRequestId: claimRequest.id,
      })
      return NextResponse.json(
        { error: 'The claim was saved, but we could not send the verification email. Please contact support before resubmitting.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Claim request submitted. Verify your email before an administrator can approve it.' },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'CLAIM_PROVIDER_NOT_FOUND') {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'CLAIM_ALREADY_CLAIMED') {
      return NextResponse.json({ error: 'This business has already been claimed.' }, { status: 409 })
    }
    console.error('Error submitting claim request:', error)
    return NextResponse.json(
      { error: 'Failed to submit claim request. Please try again.' },
      { status: 500 }
    )
  }
}
