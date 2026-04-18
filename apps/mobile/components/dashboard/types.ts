export type TokenState = 'Free' | 'Deposited' | 'Consumed';

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
    | 'correction';
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
  welcomeEmailSentAt: string | null;
  profileBonusAwardedAt: string | null;
  profileCompletedAt: string | null;
  balanceAIRS: number;
  lifetimeEarnedAIRS: number;
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
