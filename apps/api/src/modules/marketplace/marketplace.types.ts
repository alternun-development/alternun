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
export const ACTIVITY_STATUSES = ['draft', 'published', 'paused', 'archived'] as const;
export const ACTIVITY_REPEAT_PERIODS = ['none', 'day', 'week', 'month', 'assignment'] as const;
export const COMMENT_STATUSES = ['pending', 'visible', 'rejected', 'hidden'] as const;
export const ENTERPRISE_KINDS = ['company', 'event'] as const;
export const PARTNERSHIP_STATUSES = [
  'structuring',
  'in_conversation',
  'onboarding',
  'pilot',
  'postponed',
  'signed',
] as const;
export const UPLOAD_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type MediaKind = (typeof MEDIA_KINDS)[number];
export type LocalizedText = Record<string, string>;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];
export type ActivityRepeatPeriod = (typeof ACTIVITY_REPEAT_PERIODS)[number];
export type CommentStatus = (typeof COMMENT_STATUSES)[number];
export type EnterpriseKind = (typeof ENTERPRISE_KINDS)[number];
export type PartnershipStatus = (typeof PARTNERSHIP_STATUSES)[number];

/** Free-form public contact fields; values may be placeholders such as "POR CONFIRMAR". */
export type PublicContact = Partial<
  Record<'web' | 'email' | 'phone' | 'whatsapp' | 'instagram' | 'facebook' | 'note', string>
>;

export interface ProfileLocation {
  municipality?: string;
  department?: string;
  address?: string;
  note?: string;
  coverage?: string;
}

export interface InternalContact {
  name: string;
  role?: string;
  email?: string;
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

export interface EnterpriseProductRecord {
  id: string;
  enterpriseId: string;
  name: string;
  description: string | null;
  airsMin: number | null;
  airsMax: number | null;
  airsNote: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PublicEnterpriseProduct = Pick<
  EnterpriseProductRecord,
  'id' | 'name' | 'description' | 'airsMin' | 'airsMax' | 'airsNote'
>;

export interface ProjectCommentRecord {
  id: string;
  projectId: string;
  authorIssuer: string;
  authorSubject: string;
  authorUserId: string;
  authorDisplayName: string;
  body: string;
  status: CommentStatus;
  moderatedByIssuer: string | null;
  moderatedBySubject: string | null;
  moderatedAt: string | null;
  moderationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProjectComment {
  displayName: string;
  body: string;
  createdAt: string;
}

export interface VerifiedCommentAuthor {
  issuer: string;
  subject: string;
  userId: string;
  displayName: string;
}

export interface ActivityContentBlock {
  title: string;
  description: string;
}
export type ActivityContent = Record<string, ActivityContentBlock>;

export interface ProjectActivityRecord {
  id: string;
  projectId: string;
  code: string;
  status: ActivityStatus;
  defaultLocale: string;
  content: ActivityContent;
  defaultAirsAmount: number;
  maxAirsPerAward: number;
  repeatPeriod: ActivityRepeatPeriod;
  maxAwardsPerPeriod: number;
  maxAwardsLifetime: number | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProjectActivity {
  id: string;
  projectId: string;
  code: string;
  status: 'published';
  locale: string;
  availableLocales: string[];
  title: string;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
}

export type ActivityCompletionStatus = 'pending' | 'awarded' | 'rejected' | 'reversed';

export interface ActivityCompletionRecord {
  id: string;
  projectId: string;
  activityId: string;
  userId: string;
  occurrenceKey: string;
  periodKey: string;
  assignmentKey: string | null;
  status: ActivityCompletionStatus;
  completedAt: string;
  evidenceNote: string | null;
  evidenceUrl: string | null;
  awardedAirs: number | null;
  ledgerEntryId: string | null;
  reversalLedgerEntryId: string | null;
  awardedAt: string | null;
  rejectedAt: string | null;
  reversedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AirsAssignmentRecord {
  completionId: string;
  ledgerEntryId?: string;
  reversalLedgerEntryId?: string;
  airsDelta: number;
  idempotent: boolean;
}

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
  sortOrder: number;
  kind: EnterpriseKind;
  sector: string | null;
  description: string | null;
  partnershipStatus: PartnershipStatus;
  location: ProfileLocation;
  publicContact: PublicContact;
  logoUrl: string | null;
  bannerUrl: string | null;
  eventDetails: EnterpriseEventDetails;
  sites: EnterpriseSite[];
  /** Admin only. */
  internalContacts: InternalContact[];
  /** Admin only. */
  pendingItems: string[];
  /** Admin only. */
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRecord {
  id: string;
  enterpriseId: string;
  slug: string;
  status: ProjectStatus;
  categoryCode: string;
  /** Commerce type (hotel, restaurant, ...), or null while none is assigned. */
  projectTypeCode?: string | null;
  /** Whether reports for this project need a document number; true while it has no type. */
  requiresDocumentNumber?: boolean;
  countryCode: string | null;
  timeZone: string;
  defaultLocale: string;
  content: ProjectContent;
  firstPublishedAt: string | null;
  publishedAt: string | null;
  sortOrder: number;
  alternateName?: string | null;
  partnershipStatus?: PartnershipStatus;
  locationDetails?: ProfileLocation;
  publicContact?: PublicContact;
  /** Admin only. */
  internalContacts?: InternalContact[];
  /** Admin only. */
  pendingItems?: string[];
  /** Admin only. */
  internalNotes?: string | null;
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
  alternateName: string | null;
  partnershipStatus: PartnershipStatus;
  locationDetails: ProfileLocation;
  publicContact: PublicContact;
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

export interface PublicEnterprise {
  id: string;
  slug: string;
  displayName: string;
  logo: { url: string; altText: string } | null;
  countryCode: string | null;
  websiteUrl: string | null;
  projectCount: number;
  kind: EnterpriseKind;
  sector: string | null;
  description: string | null;
  partnershipStatus: PartnershipStatus;
  location: ProfileLocation;
  publicContact: PublicContact;
  bannerUrl: string | null;
  eventDetails: EnterpriseEventDetails;
  sites: EnterpriseSite[];
  products: PublicEnterpriseProduct[];
}

export interface PublicEnterpriseDetail extends PublicEnterprise {
  projects: PublicProject[];
}

export interface AdminActor {
  issuer: string;
  subject: string;
  roles: readonly string[];
}

export interface ProjectMembershipScope {
  enterpriseId: string;
  projectId: string | null;
  scopeType: 'enterprise' | 'project';
  role: string;
}

export interface ActorReference {
  issuer: string;
  subject: string;
}

export interface ProjectMembershipRecord {
  id: string;
  member: ActorReference;
  memberUserId: string | null;
  enterpriseId: string;
  projectId: string | null;
  scopeType: 'enterprise' | 'project';
  role: 'partner_operator' | 'sub_admin' | 'partner_readonly';
  status: 'active' | 'revoked';
  /** Verified email of the member, when they have signed in. Filled on lists and grants. */
  memberEmail?: string | null;
  grantedBy: ActorReference;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
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
