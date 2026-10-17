import { Resend } from 'resend'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }
  return new Resend(apiKey)
}
 
const FROM = process.env.FROM_EMAIL ?? 'noreply@dieselrepairfinder.com'
const NOTIFY = process.env.NOTIFY_EMAIL ?? 'admin@dieselrepairfinder.com'

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

export async function sendProviderLeadOpportunityEmail(data: {
  to: string
  providerName: string
  leadUrl: string
  category: string
  city: string | null
  state: string | null
  serviceAddress: string
  issueType: string
  issueDetails: string
  breakdownNow: boolean
  truckType: string | null
}) {
  const resend = getResendClient()
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping provider lead notification')
    return
  }

  const location = [data.city, data.state].filter(Boolean).join(', ')
  const details = escapeHtml(redactContactDetails(data.issueDetails))
  try {
    await resend.emails.send({
      from: FROM,
      to: data.to,
      subject: `[DieselRepairFinder] New ${data.category} service request`,
      html: `
        <h2>New service request opportunity</h2>
        <p>Hello ${escapeHtml(data.providerName)},</p>
        <p><strong>Service:</strong> ${escapeHtml(data.issueType)} (${escapeHtml(data.category)})</p>
        <p><strong>Location:</strong> ${escapeHtml(redactContactDetails(data.serviceAddress))}${location ? `, ${escapeHtml(location)}` : ''}</p>
        ${data.truckType ? `<p><strong>Equipment:</strong> ${escapeHtml(redactContactDetails(data.truckType))}</p>` : ''}
        <p><strong>Urgency:</strong> ${data.breakdownNow ? 'Urgent' : 'Standard'}</p>
        <p><strong>Request details:</strong><br/>${details}</p>
        <p>Customer contact details are withheld until you accept. Acceptance costs one lead credit ($25); declining or not responding costs nothing.</p>
        <p><a href="${escapeHtml(data.leadUrl)}">Review and respond to this request</a></p>
        <p>This secure link expires in 72 hours.</p>
      `,
    })
  } catch (error) {
    console.error('Failed to send provider lead notification:', error)
  }
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
}) {
  const resend = getResendClient()
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping email notification')
    return
  }

  try {
    await resend.emails.send({
      from: FROM,
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
      `,
    })

    // Send confirmation to requester
    await resend.emails.send({
      from: FROM,
      to: data.requesterEmail,
      subject: `Your Diesel Repair Request — Ref: ${data.referenceId}`,
      html: `
        <h2>We received your repair request!</h2>
        <p>Hi ${data.requesterName},</p>
        <p>Your repair request has been submitted. A mobile diesel mechanic will be in touch shortly.</p>
        <p><strong>Reference ID:</strong> ${escapeHtml(data.referenceId)}</p>
        <p><strong>Issue:</strong> ${escapeHtml(data.issueType)}</p>
        <p><strong>Location:</strong> ${escapeHtml(data.serviceAddress)}</p>
        <br/>
        <p>— Diesel Repair Finder Team</p>
      `,
    })
  } catch (error) {
    console.error('Failed to send repair request email:', error)
  }
}

export async function sendMechanicSignupEmail(data: {
  businessName: string
  contactName: string
  email: string
  phone: string
  city: string
  state: string
}) {
  const resend = getResendClient()
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping email notification')
    return
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: NOTIFY,
      subject: `[DieselRepairFinder] New Mechanic Application — ${data.businessName}`,
      html: `
        <h2>New Mechanic Application</h2>
        <p><strong>Business:</strong> ${data.businessName}</p>
        <p><strong>Contact:</strong> ${data.contactName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone}</p>
        <p><strong>Location:</strong> ${data.city}, ${data.state}</p>
      `,
    })

    // Confirmation to mechanic
    await resend.emails.send({
      from: FROM,
      to: data.email,
      subject: 'Welcome to Diesel Repair Finder — Application Received',
      html: `
        <h2>Application Received!</h2>
        <p>Hi ${data.contactName},</p>
        <p>Thank you for applying to join the Diesel Repair Finder network. We'll review your application and reach out soon.</p>
        <br/>
        <p>— Diesel Repair Finder Team</p>
      `,
    })
  } catch (error) {
    console.error('Failed to send mechanic signup email:', error)
  }
}
