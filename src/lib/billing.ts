/** Price per lead in dollars. */
export const LEAD_PRICE_DOLLARS = 25

/** Billing packages available for providers to purchase. */
export const BILLING_PACKAGES = [
  { credits: 5, amountCents: 12500 },
  { credits: 10, amountCents: 25000 },
  { credits: 20, amountCents: 50000 },
] as const

export type BillingPackage = (typeof BILLING_PACKAGES)[number]
