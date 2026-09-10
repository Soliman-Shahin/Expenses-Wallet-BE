import {
  CONSENT_VERSIONS,
  assertNewAccountConsent,
  consentFields,
  validateNewAccountConsent,
} from './consent.config';

describe('AUTH.2 consent contract', () => {
  const valid = {
    termsAccepted: true,
    privacyAccepted: true,
    termsVersion: CONSENT_VERSIONS.terms,
    privacyVersion: CONSENT_VERSIONS.privacy,
  };

  it.each([
    ['missing consent', {}],
    ['false terms', { ...valid, termsAccepted: false }],
    ['false privacy', { ...valid, privacyAccepted: false }],
    ['invalid terms version', { ...valid, termsVersion: 'old' }],
    ['invalid privacy version', { ...valid, privacyVersion: 'old' }],
  ])('rejects %s', (_label, input) => {
    expect(validateNewAccountConsent(input)).toBe(false);
    expect(() => assertNewAccountConsent(input)).toThrow('consent is required');
  });

  it('accepts the current consent and persists server-controlled values', () => {
    expect(validateNewAccountConsent(valid)).toBe(true);
    const before = Date.now();
    const fields = consentFields();
    expect(fields.termsVersion).toBe(CONSENT_VERSIONS.terms);
    expect(fields.privacyVersion).toBe(CONSENT_VERSIONS.privacy);
    expect(fields.termsAcceptedAt).toBeInstanceOf(Date);
    expect(fields.privacyAcceptedAt).toBeInstanceOf(Date);
    expect((fields.termsAcceptedAt as Date).getTime()).toBeGreaterThanOrEqual(
      before
    );
    expect((fields.privacyAcceptedAt as Date).getTime()).toBeGreaterThanOrEqual(
      before
    );
  });
});
