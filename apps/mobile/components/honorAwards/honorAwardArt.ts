/* eslint-disable @typescript-eslint/no-var-requires -- Metro requires static asset paths. */
import type { ImageSourcePropType } from 'react-native';
import type { HonorAwardTier } from '../../utils/honorAwards';
import type { HonorPresetArt } from './honorAwards.types';

/**
 * Art from the "Galardones de honor" design file (Propuesta Badges V3), bundled with the app:
 * the holographic foil of the cards and, per art preset, the medal of each tier and the photo
 * of the card back. Recipes with their own image URLs override these.
 */
export const HONOR_FOIL = require('../../assets/badges/honor/foil.webp') as ImageSourcePropType;

/** The "Airs · By Alternun" mark at the foot of the card back. */
export const HONOR_AIRS_LOGO = require('../../assets/AIRS-logo-dark-2x.png') as ImageSourcePropType;

/** The Swing Golf mark of the Manglar Verde cards: ink for the foil, white for the grass. */
const SWING_GOLF_MARK = {
  dark: require('../../assets/badges/honor/swing-golf/mark-dark.webp') as ImageSourcePropType,
  light: require('../../assets/badges/honor/swing-golf/mark-light.webp') as ImageSourcePropType,
};

const MANGLAR_VERDE_ART: HonorPresetArt = {
  partnerMark: SWING_GOLF_MARK,
  badge: {
    generic: require('../../assets/badges/honor/manglar-verde/generic.webp') as ImageSourcePropType,
    gold: require('../../assets/badges/honor/manglar-verde/gold.webp') as ImageSourcePropType,
    silver: require('../../assets/badges/honor/manglar-verde/silver.webp') as ImageSourcePropType,
    bronze: require('../../assets/badges/honor/manglar-verde/bronze.webp') as ImageSourcePropType,
  },
  // Grey versions for medals not claimed yet (filters are not available on every platform).
  badgeGray: {
    generic:
      require('../../assets/badges/honor/manglar-verde/generic-gray.webp') as ImageSourcePropType,
    gold: require('../../assets/badges/honor/manglar-verde/gold-gray.webp') as ImageSourcePropType,
    silver:
      require('../../assets/badges/honor/manglar-verde/silver-gray.webp') as ImageSourcePropType,
    bronze:
      require('../../assets/badges/honor/manglar-verde/bronze-gray.webp') as ImageSourcePropType,
  },
  back: require('../../assets/badges/honor/manglar-verde/back.webp') as ImageSourcePropType,
};

export const HONOR_PRESET_ART: Readonly<Record<string, HonorPresetArt | undefined>> = {
  /** Medalla Torneo (Medalla_Torneo_Swing_Golf_V4): holographic front. */
  golf_mangrove: MANGLAR_VERDE_ART,
  /** Medalla Comunidad Swing Golf (Medalla_Comunidad_Swing_Golf_V4): the same medal on grass. */
  golf_mangrove_community: {
    ...MANGLAR_VERDE_ART,
    front: require('../../assets/badges/honor/manglar-verde/grass.webp') as ImageSourcePropType,
    frontInk: 'light',
  },
};

/** The bundled medal of a preset and tier (in grey when asked), if the design file has one. */
export function presetBadge(
  preset: string | null | undefined,
  tier: HonorAwardTier,
  gray = false
): ImageSourcePropType | null {
  if (!preset) return null;
  const art = HONOR_PRESET_ART[preset];
  return (gray ? art?.badgeGray?.[tier] : art?.badge[tier]) ?? null;
}

/** The bundled art of a preset, if any. */
export function presetArt(preset: string | null | undefined): HonorPresetArt | null {
  return preset ? HONOR_PRESET_ART[preset] ?? null : null;
}

/** The bundled back photo of a preset, if any. */
export function presetBack(preset: string | null | undefined): ImageSourcePropType | null {
  if (!preset) return null;
  return HONOR_PRESET_ART[preset]?.back ?? null;
}
