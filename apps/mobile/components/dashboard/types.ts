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
  referenceType: 'token_purchase' | 'pool_deposit' | 'compensation' | 'retire' | 'claim';
  amountAIRS: number;
  timestamp: Date;
  onChainReference: string;
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
