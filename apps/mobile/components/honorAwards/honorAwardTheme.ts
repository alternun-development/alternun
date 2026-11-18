import type { HonorAward, HonorAwardCatalogItem, HonorAwardTier } from '../../utils/honorAwards';
import type { HonorSlot, HonorTierPalette, Translate } from './honorAwards.types';

export const HONOR_TIER_PALETTES: Record<HonorAwardTier, HonorTierPalette> = {
  generic: {
    frame: '#4a7c3a',
    ink: '#3f7a35',
    glow: '#7dd87a',
    shield: ['#9be7a8', '#2f6b3a'],
    banner: '#8a7563',
  },
  gold: {
    frame: '#d4a72c',
    ink: '#b8862a',
    glow: '#ffd76a',
    shield: ['#ffe9a3', '#b8862a'],
    banner: '#c08a2e',
  },
  silver: {
    frame: '#a9b8bd',
    ink: '#6f7c85',
    glow: '#e3eef2',
    shield: ['#f1f6f8', '#7f8d95'],
    banner: '#4c5660',
  },
  bronze: {
    frame: '#d07a4a',
    ink: '#c0703f',
    glow: '#ffb27f',
    shield: ['#ffcfa8', '#9a4f28'],
    banner: '#8a4426',
  },
};

/** Holographic foil of the cards (pastel lilac, pink, sky and mint). */
export const HOLO_STOPS = ['#c9b6ff', '#f6c4ea', '#bfe6ff', '#c8f5e3', '#e3d1ff'] as const;

/** Slots shown per row; empty ones are placeholders for awards still to earn. */
export const HONOR_SLOT_COUNT = 5;

/**
 * The awards; the sample medal while there are none (when asked for); the medals still to
 * earn, locked; then empty placeholders up to a full row (or the next full row).
 */
export function buildHonorSlots(
  awards: readonly HonorAward[],
  options: { demo?: boolean; locked?: readonly HonorAwardCatalogItem[] } = {},
  perRow = HONOR_SLOT_COUNT
): HonorSlot[] {
  const held = new Set(awards.map((award) => award.recipe.id));
  const filled: HonorSlot[] = [
    ...awards.map((award): HonorSlot => ({ kind: 'award', award })),
    ...(options.demo && awards.length === 0 ? [{ kind: 'demo' } as HonorSlot] : []),
    ...(options.locked ?? [])
      .filter((item) => !held.has(item.recipe.id))
      .map((item): HonorSlot => ({ kind: 'locked', item })),
  ];
  const total = Math.max(perRow, Math.ceil(filled.length / perRow) * perRow);
  const empty: HonorSlot[] = Array.from({ length: total - filled.length }, (_, index) => ({
    kind: 'empty',
    key: `empty-${index}`,
  }));
  return [...filled, ...empty];
}

/** "30 oct 2026" style date in the reader's locale; the raw value if it does not parse. */
export function formatHonorDate(value: string | null, locale?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Translates with the params also applied to the fallback (the catalog lookup does not). */
export function honorText(
  t: Translate,
  key: string,
  fallback: string,
  params?: Record<string, string | number>
): string {
  const interpolated = fallback.replace(/{{(\w+)}}/g, (_, name: string) =>
    String(params?.[name] ?? '')
  );
  return t(key, params, interpolated);
}

/** Colors of the card templates (Propuesta Badges V3): frame and title per tier. */
export const HONOR_CARD_COLORS: Record<HonorAwardTier, { frame: string; title: string }> = {
  generic: { frame: '#4a7c3a', title: '#4f8a3c' },
  gold: { frame: '#d6b13f', title: '#c99a2e' },
  silver: { frame: '#aebcc2', title: '#7d8b93' },
  bronze: { frame: '#d9844f', title: '#d9844f' },
};

/** "Octubre 30 - 2026": the obtained date as the card templates write it. */
export function formatObtainedDate(value: string | null, locale?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  let month = '';
  try {
    month = date.toLocaleDateString(locale, { month: 'long', timeZone: 'UTC' });
  } catch {
    month = '';
  }
  const label = month ? month.charAt(0).toLocaleUpperCase(locale) + month.slice(1) : '';
  return `${label ? `${label} ` : ''}${date.getUTCDate()} - ${date.getUTCFullYear()}`;
}

const COUNTRY_NAMES: Readonly<Record<string, string>> = {
  AR: 'Argentina',
  BR: 'Brasil',
  CL: 'Chile',
  CO: 'Colombia',
  EC: 'Ecuador',
  ES: 'España',
  MX: 'México',
  PA: 'Panamá',
  PE: 'Perú',
  TH: 'Thailand',
  US: 'United States',
  VE: 'Venezuela',
};

/** A medal still to earn, shaped as an award so the medal and mission views can show it. */
export function lockedHonorAward(item: HonorAwardCatalogItem): HonorAward {
  return {
    id: `locked-${item.recipe.id}`,
    status: 'pending',
    awardedAt: '',
    claimedAt: null,
    ...item,
  };
}

/** "Swing Golf Colombia": the ally and its country, as the medal view writes it. */
export function honorPartnerLine(partner: HonorAward['partner']): string {
  if (!partner) return '';
  return [partner.displayName, honorCountryName(partner.countryCode)].filter(Boolean).join(' ');
}

/** Country name for an ISO code; the code itself when it is not known. */
export function honorCountryName(code: string | null | undefined): string {
  const normalized = code?.trim().toUpperCase() ?? '';
  return COUNTRY_NAMES[normalized] ?? normalized;
}
