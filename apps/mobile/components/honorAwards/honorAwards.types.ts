import type {
  HonorAward,
  HonorAwardClient,
  HonorAwardKind,
  HonorAwardScope,
  HonorAwardTier,
} from '../../utils/honorAwards';

/** Types of the honor award ("Galardones de honor") components. */

export interface HonorTierPalette {
  /** Card frame and chips. */
  frame: string;
  /** Title text on the holographic card. */
  ink: string;
  /** Glow and light rays of the claim. */
  glow: string;
  /** Shield gradient of the placeholder emblem (top → bottom). */
  shield: [string, string];
  /** Banner at the bottom of the emblem. */
  banner: string;
}

export type HonorSlot = { kind: 'award'; award: HonorAward } | { kind: 'empty'; key: string };

export type Translate = (
  key: string,
  params?: Record<string, string | number>,
  fallback?: string
) => string;

export interface HonorAwardEmblemProps {
  tier: HonorAwardTier;
  kind?: HonorAwardKind;
  title?: string;
  imageUrl?: string | null;
  size: number;
  /** Greyed out outline for slots still to earn. */
  placeholder?: boolean;
}

export interface HonorAwardCardProps {
  award: HonorAward;
  side: 'front' | 'back';
  width: number;
}

export interface HonorAwardClaimCinematicProps {
  award: HonorAward | null;
  onInspect: (award: HonorAward) => void;
  onClose: () => void;
}

export interface HonorAwardInspectModalProps {
  award: HonorAward | null;
  onClose: () => void;
}

export interface HonorAwardsPalette {
  text: string;
  muted: string;
  border?: string;
  accent?: string;
}

export interface HonorAwardsSectionProps {
  scope: HonorAwardScope;
  getToken?: () => Promise<string | null>;
  c: HonorAwardsPalette;
  title?: string;
  subtitle?: string;
  /** Public pages hide the whole section until the ally has claimed an award. */
  hideWhenEmpty?: boolean;
  /** Tests and stories pass their own client. */
  client?: HonorAwardClient;
}

export type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; awards: HonorAward[] };
