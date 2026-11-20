/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import {
  countryName,
  enterprisePlace,
  isPlaceholderValue,
  pluralKey,
  publicValue,
} from '../publicDisplay';

describe('publicDisplay', () => {
  it('picks the singular key only for exactly one', () => {
    expect(pluralKey('a.count', 1)).toBe('a.count_one');
    expect(pluralKey('a.count', 0)).toBe('a.count_other');
    expect(pluralKey('a.count', 2)).toBe('a.count_other');
  });

  it('treats empty values and placeholders as missing, in any case', () => {
    for (const value of [
      undefined,
      null,
      '',
      '  ',
      'POR CONFIRMAR',
      'Por  confirmar.',
      'to be confirmed',
      'TBD',
    ]) {
      expect(isPlaceholderValue(value)).toBe(true);
      expect(publicValue(value)).toBeUndefined();
    }
    expect(isPlaceholderValue('Cra. 50 #79')).toBe(false);
    expect(publicValue('  info@batis.org ')).toBe('info@batis.org');
  });

  it('names the country in the reader language and falls back to the code', () => {
    expect(countryName('co', 'es')).toBe('Colombia');
    const displayNames = Intl.DisplayNames;
    // Engines without Intl.DisplayNames still show something.
    (Intl as { DisplayNames?: unknown }).DisplayNames = undefined;
    try {
      expect(countryName('CO', 'es')).toBe('CO');
    } finally {
      (Intl as { DisplayNames?: unknown }).DisplayNames = displayNames;
    }
  });

  it('prefers the municipality over the country and skips placeholders', () => {
    expect(enterprisePlace({ countryCode: 'CO', location: { municipality: 'Cajicá' } }, 'es')).toBe(
      'Cajicá'
    );
    expect(
      enterprisePlace({ countryCode: 'CO', location: { municipality: 'POR CONFIRMAR' } }, 'en')
    ).toBe('Colombia');
    expect(enterprisePlace({ countryCode: null, location: {} }, 'en')).toBeNull();
  });
});
