/* eslint-disable @typescript-eslint/no-var-requires -- Metro requires static asset paths. */
import type { ImageSourcePropType } from 'react-native';

export const STATUS_BADGES: Record<string, ImageSourcePropType | undefined> = {
  bronze: require('../../assets/badges/status/bronze.webp') as ImageSourcePropType,
  silver: require('../../assets/badges/status/silver.webp') as ImageSourcePropType,
  gold: require('../../assets/badges/status/gold.webp') as ImageSourcePropType,
};

export const LOCKED_BADGE =
  require('../../assets/badges/milestones/locked.webp') as ImageSourcePropType;

export const ACHIEVEMENT_ARTWORK: Record<string, ImageSourcePropType | undefined> = {
  first_10_airs: require('../../assets/badges/milestones/10.webp') as ImageSourcePropType,
  fifty_airs: require('../../assets/badges/milestones/50.webp') as ImageSourcePropType,
  first_100_airs: require('../../assets/badges/milestones/100.webp') as ImageSourcePropType,
};

export const STATUS_DETAIL_BADGES: Record<string, ImageSourcePropType | undefined> = {
  bronze: require('../../assets/badges/status-3d/bronze.webp') as ImageSourcePropType,
  silver: require('../../assets/badges/status-3d/silver.webp') as ImageSourcePropType,
  gold: require('../../assets/badges/status-3d/gold.webp') as ImageSourcePropType,
};
