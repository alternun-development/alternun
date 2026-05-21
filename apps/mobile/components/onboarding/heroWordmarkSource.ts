/* eslint-disable @typescript-eslint/no-var-requires */
import type { ImageSourcePropType } from 'react-native';

export const HERO_WORDMARK_LIGHT_SOURCE =
  require('../../assets/SVGs/AIRS-logo-light.svg') as ImageSourcePropType;
export const HERO_WORDMARK_DARK_SOURCE =
  require('../../assets/SVGs/AIRS-logo-dark.svg') as ImageSourcePropType;

export function resolveHeroWordmarkSource(
  isDark: boolean,
  logoAtTop: boolean
): ImageSourcePropType {
  if (!isDark || logoAtTop) {
    return HERO_WORDMARK_LIGHT_SOURCE;
  }

  return HERO_WORDMARK_DARK_SOURCE;
}
