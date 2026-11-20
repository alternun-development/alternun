/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import en from '../../../../../packages/i18n/src/catalogs/en.json';
import es from '../../../../../packages/i18n/src/catalogs/es.json';
import th from '../../../../../packages/i18n/src/catalogs/th.json';

describe('email confirmation copy', () => {
  it.each([
    ['en', en],
    ['es', es],
    ['th', th],
  ])('reminds %s users to check their spam folder', (_locale, catalog) => {
    const hint = (catalog as { mobile: { authModal: { confirmation: Record<string, string> } } })
      .mobile.authModal.confirmation.spamFolderHint;
    expect(typeof hint).toBe('string');
    expect(hint.trim().length).toBeGreaterThan(0);
  });
});
