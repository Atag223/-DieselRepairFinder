/** Price per lead in dollars. */
export const LEAD_PRICE_DOLLARS = 25

export type BillingPackage = {
  key: string
  name: string
  /** Number of leads the provider pays for. */
  paidCredits: number
  /** Total lead credits awarded (includes any bonus). */
  awardedCredits: number
  /** Amount charged in cents. */
  amountCents: number
  /** Number of bonus credits included above paidCredits. */
  bonusCredits: number
  /** Badge label shown on the card, or null if no bonus. */
  bonusLabel: string | null
}

/** Billing packages available for providers to purchase. */
export const BILLING_PACKAGES: BillingPackage[] = [
  {
    key: 'starter',
    name: 'Starter Pack',
    paidCredits: 4,
    awardedCredits: 6,
    amountCents: 10000,
    bonusCredits: 2,
    bonusLabel: '2 Free Leads',
  },
  {
    key: 'growth',
    name: 'Growth Pack',
    paidCredits: 10,
    awardedCredits: 14,
    amountCents: 25000,
    bonusCredits: 4,
    bonusLabel: '4 Free Leads',
  },
  {
    key: 'pro',
    name: 'Pro Pack',
    paidCredits: 20,
    awardedCredits: 28,
    amountCents: 50000,
    bonusCredits: 8,
    bonusLabel: '8 Free Leads',
  },
]

export const PLACEMENT_PRICES_CENTS = {
  FEATURED: 125000,
  PREMIUM: 150000,
} as const
