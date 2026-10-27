import { getAccessToken } from '../auth/oidc-client';
import { adminEnv } from '../config/env';

export type ProjectStatus = 'draft' | 'published' | 'paused' | 'archived';
export type EnterpriseStatus = 'active' | 'paused' | 'archived';
export type ActivityStatus = ProjectStatus;
export type MediaKind = 'logo' | 'cover' | 'gallery_image' | 'video' | 'canva';
export type CommentStatus = 'pending' | 'visible' | 'rejected' | 'hidden';

export type ProjectContentBlock = {
  title: string;
  location: string;
  theme: string;
  description: string;
  participationCopy?: string;
  ctaLabel?: string;
  waysToContribute: string[];
};

export type ProjectMedia = {
  id: string;
  projectId: string;
  kind: MediaKind;
  url: string;
  embedUrl: string | null;
  altText: Record<string, string>;
  caption: Record<string, string>;
  sortOrder: number;
  isActive: boolean;
};

export type Project = {
  id: string;
  enterpriseId: string;
  slug: string;
  status: ProjectStatus;
  categoryCode: string;
  countryCode: string | null;
  timeZone: string;
  defaultLocale: string;
  content: Record<string, ProjectContentBlock>;
  media?: ProjectMedia[];
};

export type Enterprise = {
  id: string;
  slug: string;
  displayName: string;
  legalName: string | null;
  status: EnterpriseStatus;
  countryCode: string | null;
  websiteUrl: string | null;
};

export type ProjectActivity = {
  id: string;
  projectId: string;
  status: ActivityStatus;
  defaultLocale: string;
  content: Record<string, { title: string; description: string }>;
  defaultAirsAmount: number;
  maxAirsPerAward: number;
  repeatPeriod: 'none' | 'day' | 'week' | 'month' | 'assignment';
  maxAwardsPerPeriod: number;
  maxAwardsLifetime: number | null;
};

export type ProjectMembership = {
  id: string;
  member: { issuer: string; subject: string };
  memberUserId: string | null;
  enterpriseId: string;
  projectId: string | null;
  scopeType: 'enterprise' | 'project';
  role: 'partner_operator' | 'sub_admin' | 'partner_readonly';
  status: 'active' | 'revoked';
  /** Verified email of the member, when they have signed in. */
  memberEmail?: string | null;
};

export type ActivityCompletion = {
  id: string;
  projectId: string;
  activityId: string;
  userId: string;
  status: 'pending' | 'awarded' | 'rejected' | 'reversed';
  awardedAirs: number | null;
};

export type ProjectParticipant = {
  id: string;
  projectId: string;
  userId: string;
  displayName: string;
  email: string;
  status: 'active' | 'removed';
  addedAt: string;
  removedAt: string | null;
  completedActivities: number;
  receivedAirs: number;
};

export type ParticipantHistory = {
  id: string;
  activityId: string;
  activity: string;
  status: 'pending' | 'awarded' | 'rejected' | 'reversed';
  awardedAirs: number | null;
  completedAt: string;
  awardedAt: string | null;
  rejectedAt: string | null;
  reversedAt: string | null;
};

export type ProjectComment = {
  id: string;
  projectId: string;
  authorDisplayName: string;
  body: string;
  status: CommentStatus;
  moderationReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditRecord = {
  id: string;
  createdAt: string;
  action: string;
  result: 'allowed' | 'denied';
  reasonCode: string | null;
  actor: string;
  targetType: string;
  changedFields: string[];
};

export type AuditPage = {
  data: AuditRecord[];
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
};

export class MarketplaceRequestError extends Error {
  constructor(readonly status: number, readonly code?: string) {
    super('Marketplace request failed.');
    this.name = 'MarketplaceRequestError';
  }
}

export async function requestMarketplace<T>(
  path: string,
  options?: { method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown }
): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${adminEnv.apiUrl}${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(options?.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    let code: string | undefined;
    try {
      const body = (await response.json()) as { code?: unknown; reasonCode?: unknown };
      const rawCode = body.code ?? body.reasonCode;
      code = typeof rawCode === 'string' ? rawCode : undefined;
    } catch {
      // The friendly copy is selected from the status when no JSON error body is available.
    }
    throw new MarketplaceRequestError(response.status, code);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export function localizedProjectContent(project: Project): ProjectContentBlock | undefined {
  return project.content[project.defaultLocale] ?? Object.values(project.content)[0];
}

export function activeProjectMedia(project: Project, kind: MediaKind): ProjectMedia | undefined {
  return project.media?.find((item) => item.isActive && item.kind === kind);
}
