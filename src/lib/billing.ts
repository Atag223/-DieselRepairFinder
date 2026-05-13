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
    paidCredits: 5,
    awardedCredits: 5,
    amountCents: 12500,
    bonusCredits: 0,
    bonusLabel: null,
  },
  {
    key: 'growth',
    name: 'Growth Pack',
    paidCredits: 10,
    awardedCredits: 11,
    amountCents: 25000,
    bonusCredits: 1,
    bonusLabel: '1 Free Lead',
  },
  {
    key: 'pro',
    name: 'Pro Pack',
    paidCredits: 20,
    awardedCredits: 25,
    amountCents: 50000,
    bonusCredits: 5,
    bonusLabel: '5 Free Leads',
  },
]
