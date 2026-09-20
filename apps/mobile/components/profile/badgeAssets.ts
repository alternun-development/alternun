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
  first_500_airs: require('../../assets/badges/milestones/500.webp') as ImageSourcePropType,
  first_1000_airs: require('../../assets/badges/milestones/1000.webp') as ImageSourcePropType,
  first_5000_airs: require('../../assets/badges/milestones/5000.webp') as ImageSourcePropType,
  first_10000_airs: require('../../assets/badges/milestones/10000.webp') as ImageSourcePropType,
  first_50000_airs: require('../../assets/badges/milestones/50000.webp') as ImageSourcePropType,
};

export const MILESTONE_DETAIL_ARTWORK: Record<string, ImageSourcePropType | undefined> = {
  first_10_airs: require('../../assets/badges/milestones-3d/10.webp') as ImageSourcePropType,
  fifty_airs: require('../../assets/badges/milestones-3d/50.webp') as ImageSourcePropType,
  first_100_airs: require('../../assets/badges/milestones-3d/100.webp') as ImageSourcePropType,
  first_500_airs: require('../../assets/badges/milestones-3d/500.webp') as ImageSourcePropType,
  first_1000_airs: require('../../assets/badges/milestones-3d/1000.webp') as ImageSourcePropType,
  first_5000_airs: require('../../assets/badges/milestones-3d/5000.webp') as ImageSourcePropType,
  first_10000_airs: require('../../assets/badges/milestones-3d/10000.webp') as ImageSourcePropType,
  first_50000_airs: require('../../assets/badges/milestones-3d/50000.webp') as ImageSourcePropType,
};

export const LOCKED_ACHIEVEMENT_ARTWORK: Record<string, ImageSourcePropType | undefined> = {
  first_10_airs: require('../../assets/badges/milestones-locked/10.webp') as ImageSourcePropType,
  fifty_airs: require('../../assets/badges/milestones-locked/50.webp') as ImageSourcePropType,
  first_100_airs: require('../../assets/badges/milestones-locked/100.webp') as ImageSourcePropType,
  first_500_airs: require('../../assets/badges/milestones-locked/500.webp') as ImageSourcePropType,
  first_1000_airs:
    require('../../assets/badges/milestones-locked/1000.webp') as ImageSourcePropType,
  first_5000_airs:
    require('../../assets/badges/milestones-locked/5000.webp') as ImageSourcePropType,
  first_10000_airs:
    require('../../assets/badges/milestones-locked/10000.webp') as ImageSourcePropType,
  first_50000_airs:
    require('../../assets/badges/milestones-locked/50000.webp') as ImageSourcePropType,
};

export const STATUS_DETAIL_BADGES: Record<string, ImageSourcePropType | undefined> = {
  bronze: require('../../assets/badges/status-3d/bronze.webp') as ImageSourcePropType,
  silver: require('../../assets/badges/status-3d/silver.webp') as ImageSourcePropType,
  gold: require('../../assets/badges/status-3d/gold.webp') as ImageSourcePropType,
};

export const MILESTONE_SHARE_IMAGES: Record<string, number> = {
  first_10_airs: require('../../assets/badges/milestones-share/10.png') as number,
  fifty_airs: require('../../assets/badges/milestones-share/50.png') as number,
  first_100_airs: require('../../assets/badges/milestones-share/100.png') as number,
  first_500_airs: require('../../assets/badges/milestones-share/500.png') as number,
  first_1000_airs: require('../../assets/badges/milestones-share/1000.png') as number,
  first_5000_airs: require('../../assets/badges/milestones-share/5000.png') as number,
  first_10000_airs: require('../../assets/badges/milestones-share/10000.png') as number,
  first_50000_airs: require('../../assets/badges/milestones-share/50000.png') as number,
};
