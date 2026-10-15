import { getAccessToken } from '../auth/oidc-client';
import { adminEnv } from '../config/env';

export type ProjectStatus = 'draft' | 'published' | 'paused' | 'archived';
export type EnterpriseStatus = 'active' | 'paused' | 'archived';
export type ActivityStatus = ProjectStatus;
export type MediaKind = 'logo' | 'cover' | 'gallery_image' | 'video' | 'canva';

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
  displayName: string;
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
};

export type ProjectMembership = {
  id: string;
  role: 'partner_operator' | 'sub_admin' | 'partner_readonly';
  status: 'active' | 'revoked';
};

export class MarketplaceRequestError extends Error {
  constructor(readonly status: number, readonly code?: string) {
    super('Marketplace request failed.');
    this.name = 'MarketplaceRequestError';
  }
}

export async function requestMarketplace<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${adminEnv.apiUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
  return (await response.json()) as T;
}

export function localizedProjectContent(project: Project): ProjectContentBlock | undefined {
  return project.content[project.defaultLocale] ?? Object.values(project.content)[0];
}

export function activeProjectMedia(project: Project, kind: MediaKind): ProjectMedia | undefined {
  return project.media?.find((item) => item.isActive && item.kind === kind);
}
