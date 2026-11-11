import { Resend } from 'resend'
import { getRepairRequestConfirmationMessage } from '@/lib/request-routing'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }
  return new Resend(apiKey)
}
 
const FROM = process.env.FROM_EMAIL ?? 'noreply@dieselrepairfinder.com'
const NOTIFY = process.env.NOTIFY_EMAIL ?? 'admin@dieselrepairfinder.com'

async function deliverEmail(
  label: string,
  message: { to: string; subject: string; html: string }
): Promise<boolean> {
  const resend = getResendClient()
  if (!resend) {
    console.error(`${label} not sent: RESEND_API_KEY is not configured`)
    return false
  }
  try {
    const result = await resend.emails.send({ from: FROM, ...message })
    if (result.error) {
      console.error(`${label} not sent: email provider returned an error`)
      return false
    }
    return true
  } catch {
    console.error(`${label} not sent: email provider request failed`)
    return false
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!)
}

function redactContactDetails(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[contact details withheld]')
    .replace(/(?:https?:\/\/|www\.)[^\s<]+|\b[\w-]+(?:\.[\w-]+)*\.(?:com|net|org|biz|us|co|io|gov|edu)\b(?:\/[^\s<]*)?/gi, '[contact details withheld]')
    .replace(/\+?\d[\d().\s-]{6,}\d/g, '[contact details withheld]')
}

export function renderProviderLeadOpportunityEmail(data: {
  to: string
  providerName: string
  leadUrl: string
  category: string
  city: string | null
  state: string | null
  issueType: string
  breakdownNow: boolean
}) {
  const location = [data.city, data.state].filter(Boolean).join(', ')
  return `
    <h2>New service request opportunity</h2>
    <p>Hello ${escapeHtml(data.providerName)},</p>
    <p><strong>Service:</strong> ${escapeHtml(redactContactDetails(data.issueType))} (${escapeHtml(data.category)})</p>
    ${location ? `<p><strong>Area:</strong> ${escapeHtml(location)}</p>` : ''}
    <p><strong>Urgency:</strong> ${data.breakdownNow ? 'Urgent' : 'Standard'}</p>
    <p>Customer address and request details are withheld until you accept. Acceptance costs one lead credit ($25); declining or not responding costs nothing.</p>
    <p><a href="${escapeHtml(data.leadUrl)}">Review and respond to this request</a></p>
    <p>This secure link expires in 72 hours.</p>
  `
}

export async function sendProviderLeadOpportunityEmail(data: Parameters<typeof renderProviderLeadOpportunityEmail>[0]) {
  return deliverEmail('Provider lead notification', {
      to: data.to,
      subject: `[DieselRepairFinder] New ${data.category} service request`,
      html: renderProviderLeadOpportunityEmail(data),
    })
}

export function renderProviderClaimVerificationEmail(data: { token: string }) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/providers/claim/verify?token=${encodeURIComponent(data.token)}`
  return `<p>Confirm that you control this email address to continue claiming the provider listing.</p><p><a href="${escapeHtml(verifyUrl)}">Verify claim email</a></p><p>This link expires in 30 minutes. Your listing account email will not change unless an administrator approves the verified claim.</p>`
}

export async function sendProviderClaimVerificationEmail(data: { to: string; token: string }) {
  return deliverEmail('Provider claim verification', {
    to: data.to,
    subject: 'Verify your DieselRepairFinder provider claim',
    html: renderProviderClaimVerificationEmail(data),
  })
}

export async function sendProviderLoginEmail(data: { to: string; loginUrl: string }) {
  return deliverEmail('Provider sign-in email', {
      to: data.to,
      subject: 'Your DieselRepairFinder provider sign-in link',
      html: `<p>Use this one-time link to securely access your provider dashboard. It expires in 15 minutes.</p><p><a href="${escapeHtml(data.loginUrl)}">Sign in to your provider account</a></p><p>If you did not request this link, you can ignore this email.</p>`,
    })
}

export async function sendProviderApprovalEmail(data: { to: string; businessName: string }) {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/providers/login`
  return deliverEmail('Provider approval email', {
      to: data.to,
      subject: 'Your DieselRepairFinder listing is approved',
      html: `<p>Your listing for ${escapeHtml(data.businessName)} is approved and is now visible in the directory.</p><p>Activate your prepaid lead account to begin receiving qualified service opportunities. Your free listing remains active if you choose not to fund an account.</p><p><a href="${escapeHtml(loginUrl)}">Sign in to your provider dashboard</a></p>`,
    })
}

export async function sendPlacementRequestEmail(data: {
  businessName: string
  providerEmail: string
  state: string
  tier: 'FEATURED' | 'PREMIUM'
}) {
  const annualPrice = data.tier === 'FEATURED' ? '$1,250' : '$1,500'
  return deliverEmail('Placement request administrator notification', {
      to: NOTIFY,
      subject: `[DieselRepairFinder] ${data.tier} placement checkout started for ${data.state}`,
      html: `<h2>State placement checkout started</h2><p><strong>Business:</strong> ${escapeHtml(data.businessName)}</p><p><strong>Provider email:</strong> ${escapeHtml(data.providerEmail)}</p><p><strong>Placement:</strong> ${escapeHtml(data.tier)} in ${escapeHtml(data.state)}</p><p><strong>Annual price:</strong> ${annualPrice}</p><p>The provider is completing one-time Stripe Checkout. The placement will activate for 12 months only after Stripe verifies payment. Review the <a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')}/admin/placements">admin placement queue</a>.</p>`,
    })
}

export async function sendPlacementApprovalEmail(data: {
  to: string
  businessName: string
  state: string
  tier: 'FEATURED' | 'PREMIUM'
}) {
  const price = data.tier === 'FEATURED' ? '$1,250/year' : '$1,500/year'
  return deliverEmail('Placement approval email', {
      to: data.to,
      subject: `Placement request approved for ${data.state}`,
      html: `<p>The ${escapeHtml(data.tier)} State Placement request for ${escapeHtml(data.businessName)} in ${escapeHtml(data.state)} has been approved, subject to payment.</p><p>Annual placement price: ${price}. Reply to this message to arrange payment. The placement will not display until administration confirms payment.</p>`,
    })
}

export async function sendRepairRequestEmail(data: {
  referenceId: string
  requesterName: string
  requesterEmail: string
  requesterPhone: string
  serviceAddress: string
  issueType: string
  issueDetails: string
  requesterCompany?: string | null
  breakdownNow?: boolean
  truckType?: string | null
  routingStatus: 'DISPATCHED' | 'NEEDS_ATTENTION'
  routingError?: string | null
  dispatchedCount: number
}) {
  const routingSummary = data.routingStatus === 'DISPATCHED'
    ? `${data.dispatchedCount} provider(s) were notified.${data.routingError ? ` Warning: ${data.routingError}` : ''}`
    : `No provider was notified. Reason: ${data.routingError || 'No funded matching providers were available.'}`
  const adminNotified = await deliverEmail('Repair request administrator notification', {
      to: NOTIFY,
      subject: `[DieselRepairFinder] New Repair Request — Ref: ${data.referenceId}`,
      html: `
        <h2>New Diesel Repair Request</h2>
        <p><strong>Reference ID:</strong> ${escapeHtml(data.referenceId)}</p>
        <p><strong>Name:</strong> ${escapeHtml(data.requesterName)}</p>
        ${data.requesterCompany ? `<p><strong>Company:</strong> ${escapeHtml(data.requesterCompany)}</p>` : ''}
        <p><strong>Email:</strong> ${escapeHtml(data.requesterEmail)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(data.requesterPhone)}</p>
        <p><strong>Service Address:</strong> ${escapeHtml(data.serviceAddress)}</p>
        <p><strong>Issue Type:</strong> ${escapeHtml(data.issueType)}</p>
        <p><strong>Issue Details:</strong> ${escapeHtml(data.issueDetails)}</p>
        <p><strong>Breakdown Now:</strong> ${data.breakdownNow ? 'YES — EMERGENCY' : 'No'}</p>
        ${data.truckType ? `<p><strong>Truck Type:</strong> ${escapeHtml(data.truckType)}</p>` : ''}
        <p><strong>Lead routing:</strong> ${escapeHtml(routingSummary)}</p>
      `,
    })
  const requesterNotified = await deliverEmail('Repair request customer confirmation', {
      to: data.requesterEmail,
      subject: `Your Diesel Repair Request — Ref: ${data.referenceId}`,
      html: renderRepairRequestConfirmationEmail({
        requesterName: data.requesterName,
        referenceId: data.referenceId,
        issueType: data.issueType,
        dispatchedCount: data.dispatchedCount,
        adminNotified,
      }),
    })
  return { adminNotified, requesterNotified }
}

export function renderRepairRequestConfirmationEmail(data: {
  requesterName: string
  referenceId: string
  issueType: string
  dispatchedCount: number
  adminNotified: boolean
}) {
  return `
    <h2>We received your repair request!</h2>
    <p>Hi ${escapeHtml(data.requesterName)},</p>
    <p>${escapeHtml(getRepairRequestConfirmationMessage(data.dispatchedCount, data.adminNotified))}</p>
    <p><strong>Reference ID:</strong> ${escapeHtml(data.referenceId)}</p>
    <p><strong>Issue:</strong> ${escapeHtml(data.issueType)}</p>
    <br/>
    <p>— Diesel Repair Finder Team</p>
  `
}

export async function sendMechanicSignupEmail(data: {
  businessName: string
  contactName: string
  email: string
  phone: string
  city: string
  state: string
}) {
  const adminNotified = await deliverEmail('Mechanic application administrator notification', {
      to: NOTIFY,
      subject: `[DieselRepairFinder] New Mechanic Application — ${data.businessName}`,
      html: `
        <h2>New Mechanic Application</h2>
        <p><strong>Business:</strong> ${escapeHtml(data.businessName)}</p>
        <p><strong>Contact:</strong> ${escapeHtml(data.contactName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(data.phone)}</p>
        <p><strong>Location:</strong> ${escapeHtml(data.city)}, ${escapeHtml(data.state)}</p>
      `,
    })
  const applicantNotified = await deliverEmail('Mechanic application confirmation', {
      to: data.email,
      subject: 'Welcome to Diesel Repair Finder — Application Received',
      html: `
        <h2>Application Received!</h2>
        <p>Hi ${escapeHtml(data.contactName)},</p>
        <p>Thank you for applying to join the Diesel Repair Finder network. We'll review your application and reach out soon.</p>
        <br/>
        <p>— Diesel Repair Finder Team</p>
      `,
    })
  return { adminNotified, applicantNotified }
}
