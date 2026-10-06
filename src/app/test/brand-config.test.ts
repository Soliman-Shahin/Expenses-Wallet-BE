import { BRAND } from '../config/brand.config';

describe('backend brand configuration', () => {
  it('defines the approved public identity without changing external contact values', () => {
    expect(BRAND.productName).toBe('Madar Flow');
    expect(BRAND.companyName).toBe('Orbit Madar');
    expect(BRAND.attribution).toBe('Madar Flow by Orbit Madar');
    expect(BRAND.supportEmail).toBe('support@expenses-wallet.com');
    expect(BRAND.website).toBe('https://expenses-wallet.com');
  });
});
