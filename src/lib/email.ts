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
        <p><strong>Reference ID:</strong> ${data.referenceId}</p>
        <p><strong>Name:</strong> ${data.requesterName}</p>
        ${data.requesterCompany ? `<p><strong>Company:</strong> ${data.requesterCompany}</p>` : ''}
        <p><strong>Email:</strong> ${data.requesterEmail}</p>
        <p><strong>Phone:</strong> ${data.requesterPhone}</p>
        <p><strong>Service Address:</strong> ${data.serviceAddress}</p>
        <p><strong>Issue Type:</strong> ${data.issueType}</p>
        <p><strong>Issue Details:</strong> ${data.issueDetails}</p>
        <p><strong>Breakdown Now:</strong> ${data.breakdownNow ? 'YES — EMERGENCY' : 'No'}</p>
        ${data.truckType ? `<p><strong>Truck Type:</strong> ${data.truckType}</p>` : ''}
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
        <p><strong>Reference ID:</strong> ${data.referenceId}</p>
        <p><strong>Issue:</strong> ${data.issueType}</p>
        <p><strong>Location:</strong> ${data.serviceAddress}</p>
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

