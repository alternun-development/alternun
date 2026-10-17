export interface UserHeroData {
  userName: string;
  airsScore: number;
  updatedAt: string;
  status: 'GOLD' | 'PLATINUM' | 'SILVER';
  statusExpiry: string;
  progressPercent: number;
  progressCurrent: number;
  progressTarget: number;
  nextTier: string;
}

export type HeroSectionProps = Partial<UserHeroData>;
