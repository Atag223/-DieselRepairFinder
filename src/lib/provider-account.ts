export function normalizeClaimLoginEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getProviderLoginEmail(provider: {
  email: string | null
  claimedByEmail: string | null
}, verifiedClaimEmail?: string | null): string | null {
  if (
    provider.claimedByEmail &&
    verifiedClaimEmail?.trim().toLowerCase() === provider.claimedByEmail.trim().toLowerCase()
  ) {
    return provider.claimedByEmail
  }
  return provider.claimedByEmail ? null : provider.email
}

export function canReverifyExistingClaim(
  provider: { claimStatus: string; claimedByEmail: string | null },
  submittedEmail: string
): boolean {
  return provider.claimStatus === 'CLAIMED' &&
    provider.claimedByEmail?.trim().toLowerCase() === submittedEmail.trim().toLowerCase()
}
