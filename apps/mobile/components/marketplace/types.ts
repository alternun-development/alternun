import type { Translator } from '@alternun/i18n';

export type Translate = Translator['t'];

export interface EnterprisePalette {
  surface: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  primaryDeep: string;
  fill: string;
  mist: string;
}

export type PartnershipStatus =
  | 'structuring'
  | 'in_conversation'
  | 'onboarding'
  | 'pilot'
  | 'postponed'
  | 'signed';

/** Public contact values are free text and may be placeholders such as "POR CONFIRMAR". */
export type ProfileContact = Partial<
  Record<'web' | 'email' | 'phone' | 'whatsapp' | 'instagram' | 'facebook', string>
>;

export interface ProfileLocation {
  municipality?: string;
  department?: string;
  address?: string;
  coverage?: string;
}

export interface EnterpriseProduct {
  id: string;
  name: string;
  description: string | null;
  airsMin: number | null;
  airsMax: number | null;
  airsNote: string | null;
}

export interface EnterpriseSite {
  name: string;
  address?: string;
  rooms?: number | null;
  web?: string;
}

export interface EnterpriseEventDetails {
  date?: string;
  venue?: ProfileLocation & { name?: string; web?: string };
}

export interface MarketplaceEnterprise {
  id: string;
  slug: string;
  displayName: string;
  logo: { url: string; altText: string } | null;
  countryCode: string | null;
  websiteUrl: string | null;
  projectCount: number;
  // Profile fields; optional so older API responses still render.
  kind?: 'company' | 'event';
  sector?: string | null;
  description?: string | null;
  partnershipStatus?: PartnershipStatus;
  location?: ProfileLocation;
  publicContact?: ProfileContact;
  bannerUrl?: string | null;
  eventDetails?: EnterpriseEventDetails;
  sites?: EnterpriseSite[];
  products?: EnterpriseProduct[];
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
  alternateName?: string | null;
  partnershipStatus?: PartnershipStatus;
  locationDetails?: ProfileLocation;
  publicContact?: ProfileContact;
  enterprise: { id?: string; slug: string; displayName: string };
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
  fill: string;
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
/** Layout of a paginated Explorer directory (projects or enterprises). */
export type DirectoryView = 'list' | 'grid' | 'compact';

/** Which Explorer directory a remembered view belongs to. */
export type DirectoryScope = 'projects' | 'enterprises';

export interface MarketplaceCommentsPage {
  data: PublicProjectComment[];
  page: number;
  perPage: number;
  total: number;
}

/** Structural minimum for Canva embed validation so list media can be checked too. */
export type CanvaEmbedSource = { url: string; embedUrl?: string | null } | undefined;
