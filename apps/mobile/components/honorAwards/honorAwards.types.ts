import type {
  HonorAward,
  HonorAwardAllyDesk,
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
  /** Built-in art ("golf_mangrove", "coast") when there is no image. */
  artPreset?: string | null;
}

export interface HonorCrestPalette {
  frame: string;
  frameLight: string;
  banner: string;
  bannerText: string;
  leafAccent: string;
  leafStroke: string;
  sun: string;
  outfit: string;
  trousers: string;
}

export interface HonorAwardCrestProps {
  tier: HonorAwardTier;
  preset: string;
  title: string;
  size: number;
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
  /** Preview from an empty slot: nothing was earned, the copy says so. */
  demo?: boolean;
}

export interface HonorAwardInspectModalProps {
  award: HonorAward | null;
  onClose: () => void;
  /** Preview: no sharing and no links. */
  demo?: boolean;
}

export interface HonorAwardsInfoModalProps {
  visible: boolean;
  /** A person's collection or an ally's. */
  audience: 'person' | 'ally';
  onClose: () => void;
}

export interface HonorAwardsAllyDeskProps {
  desk: HonorAwardAllyDesk;
  c: HonorAwardsPalette;
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
