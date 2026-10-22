import type { Translator } from '@alternun/i18n';

export type Translate = Translator['t'];

export interface EnterprisePalette {
  surface: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  primaryDeep: string;
  mist: string;
}

export interface MarketplaceEnterprise {
  id: string;
  slug: string;
  displayName: string;
  logo: { url: string; altText: string } | null;
  countryCode: string | null;
  websiteUrl: string | null;
  projectCount: number;
}

export interface MarketplaceProjectMedia {
  id: string;
  kind: 'logo' | 'cover' | 'gallery_image' | 'video' | 'canva';
  url: string;
  embedUrl: string | null;
  altText: Record<string, string>;
  caption: Record<string, string>;
  sortOrder: number;
  isActive: boolean;
}

export interface MarketplacePublicProject {
  id: string;
  slug: string;
  status: 'published';
  categoryCode: string;
  locale: string;
  availableLocales: string[];
  title: string;
  location: string;
  theme: string;
  description: string;
  waysToContribute: string[];
  enterprise: { slug: string; displayName: string };
  media: MarketplaceProjectMedia[];
}

export interface DetailPalette {
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  primaryDeep: string;
  mist: string;
}

export interface MarketplaceEnterpriseDetail extends MarketplaceEnterprise {
  projects: MarketplacePublicProject[];
}

export interface PublicProjectComment {
  displayName: string;
  body: string;
  createdAt: string;
}

export type LoadMarketplaceEnterprises = (
  locale: string,
  signal?: AbortSignal
) => Promise<MarketplaceEnterprise[]>;

/** Explorer enterprise directory layouts: list (3/page), 2x2 grid (4/page), compact (6/page). */
export type EnterpriseDirectoryView = 'list' | 'grid' | 'compact';

export interface MarketplaceCommentsPage {
  data: PublicProjectComment[];
  page: number;
  perPage: number;
  total: number;
}
