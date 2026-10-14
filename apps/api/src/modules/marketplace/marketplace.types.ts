import type { AdminPrincipal } from '../../common/admin-auth/admin-auth.guard';

export const PROJECT_CATEGORIES = [
  'hospitality_ecotourism',
  'conservation',
  'productive_enterprise',
  'regenerative_agriculture',
  'community',
  'education',
  'other',
] as const;
export const PROJECT_STATUSES = ['draft', 'published', 'paused', 'archived'] as const;
export const MEDIA_KINDS = ['logo', 'cover', 'gallery_image', 'video', 'canva'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type MediaKind = (typeof MEDIA_KINDS)[number];
export type LocalizedText = Record<string, string>;

export interface ProjectContentBlock {
  title: string;
  location: string;
  theme: string;
  description: string;
  participationCopy?: string;
  ctaLabel?: string;
  waysToContribute: string[];
}
export type ProjectContent = Record<string, ProjectContentBlock>;

export interface EnterpriseRecord {
  id: string;
  slug: string;
  displayName: string;
  legalName: string | null;
  status: 'active' | 'paused' | 'archived';
  countryCode: string | null;
  websiteUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRecord {
  id: string;
  enterpriseId: string;
  slug: string;
  status: ProjectStatus;
  categoryCode: string;
  countryCode: string | null;
  timeZone: string;
  defaultLocale: string;
  content: ProjectContent;
  firstPublishedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  enterprises?: Array<{
    enterpriseId: string;
    projectId: string;
    relation: string;
    isPrimary: boolean;
    createdAt: string;
  }>;
  media?: ProjectMediaRecord[];
  createdBy?: { issuer: string; subject: string };
  updatedBy?: { issuer: string; subject: string };
}

export interface ProjectMediaRecord {
  id: string;
  projectId: string;
  kind: MediaKind;
  url: string;
  embedUrl: string | null;
  altText: LocalizedText;
  caption: LocalizedText;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProject {
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
  participationCopy?: string;
  ctaLabel?: string;
  waysToContribute: string[];
  enterprise: {
    id: string;
    slug: string;
    displayName: string;
    countryCode: string | null;
    websiteUrl: string | null;
  };
  media: ProjectMediaRecord[];
  firstPublishedAt: string;
  updatedAt: string;
}

export interface AdminActor {
  issuer: string;
  subject: string;
  roles: readonly string[];
}

export function actorFromPrincipal(principal: AdminPrincipal): AdminActor {
  return { issuer: principal.iss, subject: principal.sub, roles: principal.roles };
}

export interface AuditInput {
  actor: AdminActor | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  enterpriseId?: string | null;
  projectId?: string | null;
  requestId?: string | null;
  result: 'allowed' | 'denied';
  reasonCode?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}
