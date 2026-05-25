export function resolveInitialAuthMode(
  requestedMode: string | null,
  hasRequestedReferralData: boolean
): 'signin' | 'signup' {
  if (requestedMode === 'signin') {
    return 'signin';
  }

  if (requestedMode === 'signup' || hasRequestedReferralData) {
    return 'signup';
  }

  return 'signin';
}
