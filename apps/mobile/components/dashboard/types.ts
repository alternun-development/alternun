import type { ReactNode } from 'react';

export type TokenState = 'Free' | 'Deposited' | 'Consumed';

export interface RewardAsset {
  id: string;
  name: string;
  value?: number | string | null;
  icon: ReactNode;
}

export interface AuthClient {
  getSessionToken(): Promise<string | null>;
  getUser?: () => Promise<unknown>;
}

export interface DashboardSummaryCardsProps {
  isDark: boolean;
  onNavigate?: (key: string) => void;
  client?: AuthClient;
  signedIn?: boolean;
  airsBalance?: number | null;
  participationFactor?: number | null;
  participationFactorEstimated?: boolean;
  communityEligibleAirs?: number | null;
  rewardAssets?: readonly RewardAsset[];
}

export interface RbiProjectionInput {
  airs: number | null | undefined;
  participationFactor: number | null | undefined;
  communityEligibleAirs: number | null | undefined;
}

export interface RbiProjectionMetrics {
  participationFactorPercent: number | null;
  eligibleAirs: number | null;
  aliquotPercent: number | null;
}

export interface ImpactToken {
  tokenId: string;
  state: TokenState;
  acquisitionPrice: number;
  projectName: string;
}

export interface PoolPosition {
  positionId: string;
  totalValueUSD: number;
  soldUSD: number;
  remainingUSD: number;
  profitShare: number;
  isClosed: boolean;
  tokenId: string;
}

export interface AIRSEntry {
  id: string;
  reason: string;
  referenceType:
    | 'allied_commerce'
    | 'validated_regenerative_action'
    | 'compensation'
    | 'profile_completion_bonus'
    | 'correction'
    | 'referral_bonus';
  amountAIRS: number;
  timestamp: Date;
  reference: string;
  sourceAmount?: number | null;
  sourceCurrency?: string | null;
}

export interface AirsDashboardSnapshot {
  userId: string;
  email: string | null;
  displayName: string | null;
  locale: string | null;
  profileComplete: boolean;
  firstDashboardRecorded: boolean;
  registrationBonusClaimed: boolean;
  welcomeEmailSentAt: string | null;
  profileBonusAwardedAt: string | null;
  profileCompletedAt: string | null;
  balanceAIRS: number;
  lifetimeEarnedAIRS: number;
  participationFactor?: number | null;
  participationFactorEstimated?: boolean;
  communityEligibleAirs?: number | null;
  recentEntries: AIRSEntry[];
}

export interface SBTCertificate {
  id: string;
  projectName: string;
  impactAmount: number;
  impactUnit: string;
  date: Date;
  onChainRef: string;
  metadata: Record<string, string>;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}
