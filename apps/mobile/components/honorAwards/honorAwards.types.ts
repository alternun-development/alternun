import type React from 'react';
import type { ImageSourcePropType } from 'react-native';
import type { ShareImage } from '../share/share.types';
import type {
  HonorAward,
  HonorAwardAllyDesk,
  HonorAwardCatalogItem,
  HonorAwardClient,
  HonorAwardKind,
  HonorAwardRecipe,
  HonorAwardRedeemResult,
  HonorAwardScope,
  HonorAwardTier,
  HonorCatalogSource,
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

export type HonorSlot =
  | { kind: 'award'; award: HonorAward }
  /** A medal in Airs the person can still earn. */
  | { kind: 'locked'; item: HonorAwardCatalogItem }
  | { kind: 'empty'; key: string };

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
  /** Not claimed yet: drawn in greyscale. */
  grayscale?: boolean;
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

/** Art bundled with the app for a preset: the medal of each tier and the back photo. */
export interface HonorPresetArt {
  badge: Record<HonorAwardTier, ImageSourcePropType>;
  badgeGray?: Record<HonorAwardTier, ImageSourcePropType>;
  back?: ImageSourcePropType;
  /** Background of the front instead of the holographic foil (the community medal's grass). */
  front?: ImageSourcePropType;
  /** Text color on that front: white and mint over a dark background. */
  frontInk?: 'light';
  /** The ally's mark drawn on the card: ink for the foil, white for dark backgrounds. */
  partnerMark?: { dark: ImageSourcePropType; light: ImageSourcePropType };
}

export interface HonorAwardStampProps {
  /** Text that runs around the ring, e.g. "PROYECTO AIRS 2026 • IMPACTO POSITIVO AMBIENTAL". */
  text: string;
  size: number;
}

export interface HonorAwardPartnerMarkProps {
  partner: NonNullable<HonorAward['partner']>;
  /** Card width, used to scale the mark. */
  width: number;
  locale?: string;
  /** White mark, for dark backgrounds (the mission view, the grass front). */
  light?: boolean;
  /** Recipe art preset: its bundled ally mark is used when the ally has no logo. */
  artPreset?: string | null;
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
  /** A medal the person does not hold yet: its art in grey. */
  grayscale?: boolean;
}

export interface HonorMedalPocketProps {
  award: HonorAward;
  /** Pocket width; the medal rises above it. */
  width: number;
  /** A medal the person does not hold yet: grey medal on a silver pocket. */
  grayscale?: boolean;
}

export interface HonorMedalActionsProps {
  award: HonorAward;
  /** Preview: no sharing. */
  demo: boolean;
  /** A medal not earned yet: no sharing, and a note on how to get it. */
  locked?: boolean;
  /** Name of the person who holds the medal, written on the image it is shared with. */
  holderName?: string | null;
  onViewMission: () => void;
  onClose: () => void;
}

export interface HonorAwardClaimCinematicProps {
  award: HonorAward | null;
  onInspect: (award: HonorAward) => void;
  onClose: () => void;
  /** Preview from an empty slot: nothing was earned, the copy says so. */
  demo?: boolean;
  /** Name written on the image the medal is shared with. */
  holderName?: string | null;
}

export interface HonorAwardInspectModalProps {
  award: HonorAward | null;
  onClose: () => void;
  /** Preview: no sharing and no links. */
  demo?: boolean;
  /** The medal view (default) or straight to the mission, as after a claim. */
  initialStage?: 'medal' | 'mission';
  /** A medal not earned yet: links stay, sharing goes. */
  locked?: boolean;
  /** Shown under the purpose as "¿Cómo obtenerla?" (public pages). */
  howToEarn?: string;
  /** Name written on the image the medal is shared with. */
  holderName?: string | null;
}

/** Texts of the image a medal is shared with, laid out like the milestone share images. */
export interface HonorShareCard {
  /** "Airs by Alternun", at the top. */
  brand: string;
  /** The mission ("Manglar Verde"). */
  title: string;
  /** "Medalla de legado · Swing Golf Colombia". */
  detail: string;
  /** The person's name; empty when unknown. */
  holder: string;
  /** "airs.alternun.co", at the bottom. */
  site: string;
}

export interface HonorAwardSharePreviewProps {
  /** The image being shared; one made on demand (`load`) is drawn here once it is ready. */
  image?: ShareImage | null;
  /** Accessible name of the drawn image. */
  label: string;
  /** Shown when the image cannot be drawn (no `load`, or it failed). */
  fallback: React.ReactNode;
}

export interface HonorAwardCatalogSectionProps {
  /** The ally or project whose medals to earn are listed. */
  source: HonorCatalogSource;
  c: HonorAwardsPalette;
  /** Injectable for tests. */
  load?: (source: HonorCatalogSource) => Promise<HonorAwardCatalogItem[]>;
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

/** Whether a claim code can still be redeemed, and if not why. */
export type HonorClaimCodeState = 'active' | 'expired' | 'exhausted' | 'revoked';

export interface HonorAwardCodesPanelProps {
  desk: HonorAwardAllyDesk;
  /** The ally's awards a code can be for. */
  recipes: HonorAwardRecipe[];
  c: HonorAwardsPalette;
}

export interface HonorAwardRedeemModalProps {
  visible: boolean;
  redeem: (code: string) => Promise<HonorAwardRedeemResult>;
  /** After a redemption: the award to claim now (null when it waits for an approver). */
  onRedeemed: (result: HonorAwardRedeemResult) => void;
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
  /** Name of the person whose legacy this is, written on the image a medal is shared with. */
  holderName?: string | null;
}

export type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; awards: HonorAward[]; catalog: HonorAwardCatalogItem[] };

/** Copy of the sample medal, translated by the caller. */
export interface HonorDemoCopy {
  classification: string;
  purpose: string;
  partnerDescription: string;
  projectLocation: string;
  projectDescription: string;
}

/** A text line of the medal share card: which card field it draws and how. */
export interface HonorShareCardLine {
  field: keyof HonorShareCard;
  font: 'Sculpin-Bold' | 'Sculpin-Medium';
  size: number;
  minSize: number;
  baseline: number;
  color: string;
}

/** The part of a 2D canvas context the medal share card draws with. */
export type HonorCardContext = Pick<
  CanvasRenderingContext2D,
  | 'fillStyle'
  | 'strokeStyle'
  | 'lineWidth'
  | 'font'
  | 'textAlign'
  | 'textBaseline'
  | 'fillRect'
  | 'beginPath'
  | 'moveTo'
  | 'arcTo'
  | 'closePath'
  | 'stroke'
  | 'fillText'
  | 'measureText'
  | 'drawImage'
>;
