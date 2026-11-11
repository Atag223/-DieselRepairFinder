export function getRepairRequestConfirmationMessage(
  dispatchedCount: number,
  adminNotified: boolean
): string {
  if (dispatchedCount > 0) {
    return 'Your request was sent to matching providers. Your contact details will be shared only if an eligible provider accepts.'
  }
  if (adminNotified) {
    return 'Your request is saved, but no provider has been notified yet. Our team has been alerted to review it.'
  }
  return 'Your request is saved, but no provider has been notified yet. Please contact our team and provide your reference number.'
}
