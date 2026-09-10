export const CONSENT_VERSIONS = {
  terms: '2026-09-01',
  privacy: '2026-09-01',
} as const;
export function validateNewAccountConsent(input: any): boolean {
  return (
    input.termsAccepted === true &&
    input.privacyAccepted === true &&
    input.termsVersion === CONSENT_VERSIONS.terms &&
    input.privacyVersion === CONSENT_VERSIONS.privacy
  );
}
export function assertNewAccountConsent(input: any): void {
  if (!validateNewAccountConsent(input)) {
    const error = new Error('Current Terms and Privacy consent is required');
    (error as any).statusCode = 400;
    (error as any).code = 'CONSENT_REQUIRED';
    throw error;
  }
}
export function consentFields() {
  const acceptedAt = new Date();
  return {
    termsAcceptedAt: acceptedAt,
    termsVersion: CONSENT_VERSIONS.terms,
    privacyAcceptedAt: acceptedAt,
    privacyVersion: CONSENT_VERSIONS.privacy,
  };
}
