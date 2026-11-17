import type { MarketplaceEnterprise } from './types';

/**
 * Catalog key for a counted label: the catalogs hold `<key>_one` and `<key>_other` variants
 * because the shared translator has no plural rules of its own.
 */
export function pluralKey(key: string, count: number): string {
  return `${key}_${count === 1 ? 'one' : 'other'}`;
}

const PLACEHOLDERS = new Set(['por confirmar', 'por definir', 'to be confirmed', 'tbd', 'tbc']);

/** True for empty values and stand-ins such as "POR CONFIRMAR" that public pages must not show. */
export function isPlaceholderValue(value: string | null | undefined): boolean {
  const normalized = (value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\s.]+$/, '')
    .trim();
  return !normalized || PLACEHOLDERS.has(normalized);
}

/** The value trimmed, or undefined when it is empty or a placeholder. */
export function publicValue(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && !isPlaceholderValue(trimmed) ? trimmed : undefined;
}

/** Country name for an ISO code in the reader's language; the code itself if Intl lacks it. */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale, 'en'], { type: 'region' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Where an enterprise is, for cards: its municipality, else its country name, else null. */
export function enterprisePlace(
  enterprise: Pick<MarketplaceEnterprise, 'countryCode' | 'location'>,
  locale: string
): string | null {
  const city = publicValue(enterprise.location?.municipality);
  if (city) return city;
  return enterprise.countryCode ? countryName(enterprise.countryCode, locale) : null;
}
