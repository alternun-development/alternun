import type { AirsTier } from '@alternun/ui';

export interface TierRevealCinematicProps {
  /** Tier to reveal; null hides the reveal. */
  tier: AirsTier | null;
  /** Current Airs score, used for the progress to the next tier. */
  score: number;
  onClose: () => void;
}
