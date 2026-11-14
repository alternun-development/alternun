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

export const HONOR_PRESET_ART: Readonly<Record<string, HonorPresetArt | undefined>> = {
  golf_mangrove: {
    badge: {
      generic:
        require('../../assets/badges/honor/manglar-verde/generic.webp') as ImageSourcePropType,
      gold: require('../../assets/badges/honor/manglar-verde/gold.webp') as ImageSourcePropType,
      silver: require('../../assets/badges/honor/manglar-verde/silver.webp') as ImageSourcePropType,
      bronze: require('../../assets/badges/honor/manglar-verde/bronze.webp') as ImageSourcePropType,
    },
    back: require('../../assets/badges/honor/manglar-verde/back.webp') as ImageSourcePropType,
  },
};

/** The bundled medal of a preset and tier, if the design file has one. */
export function presetBadge(
  preset: string | null | undefined,
  tier: HonorAwardTier
): ImageSourcePropType | null {
  if (!preset) return null;
  return HONOR_PRESET_ART[preset]?.badge[tier] ?? null;
}

/** The bundled back photo of a preset, if any. */
export function presetBack(preset: string | null | undefined): ImageSourcePropType | null {
  if (!preset) return null;
  return HONOR_PRESET_ART[preset]?.back ?? null;
}
