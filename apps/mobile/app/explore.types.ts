import type { StyleProp, ViewStyle } from 'react-native';
import type { Translator } from '@alternun/i18n';

export type ProjectFilter = string;
export type Translate = Translator['t'];

export interface Palette {
  background: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  primaryDeep: string;
  fill: string;
  mist: string;
  hero: string;
}

export interface MarketProject {
  id: string;
  slug: string;
  title: string;
  place: string;
  categoryCode: string;
  status: 'active';
  theme: string;
  description: string;
  waysToContribute: string[];
  /** Banner or gallery image for the card; never the logo. */
  imageUrl: string | null;
  /** Project logo, shown in the card's icon mark (the leaf when there is none). */
  logoUrl?: string | null;
  /** Direct playable video URL from the project's active video media, when present. */
  videoUrl: string | null;
  /** Validated Canva embed URL from the project's active canva media, when present. */
  canvaUrl: string | null;
}

export interface MarketplaceMedia {
  kind: string;
  url: string;
  embedUrl?: string | null;
  isActive: boolean;
}

export interface MarketplaceProjectResponse {
  id: string;
  slug: string;
  status: 'published';
  categoryCode: string;
  title: string;
  location: string;
  theme: string;
  description: string;
  waysToContribute: string[];
  media: MarketplaceMedia[];
}

export type LoadMarketplaceProjects = (
  locale: string,
  signal?: AbortSignal
) => Promise<MarketProject[]>;

export interface ProjectMarkProps {
  logoUrl?: string | null;
  size: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}
