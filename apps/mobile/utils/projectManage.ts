import { resolveMobileApiBaseUrl } from './runtimeConfig';

/** Client for the in-app "Manage project" API (GET/PATCH /v1/me/projects/:id/manage, ...). */

export type ManageRole =
  | 'partner_operator'
  | 'sub_admin'
  | 'project_moderator'
  | 'partner_readonly';
export type CommentStatus = 'pending' | 'visible' | 'rejected' | 'hidden';
export type CommentAction = 'approve' | 'reject' | 'hide' | 'restore';
export type ManagedImageKind = 'logo' | 'cover' | 'gallery_image';

export interface ManageCapabilities {
  editContent: boolean;
  editProfile: boolean;
  media: boolean;
  team: boolean;
  comments: boolean;
  clients?: boolean;
  editClients?: boolean;
  assignAirs?: boolean;
}

export interface ManagedContentBlock {
  title: string;
  location: string;
  theme: string;
  description: string;
  waysToContribute: string[];
  participationCopy?: string;
  ctaLabel?: string;
}

export interface ManagedProject {
  id: string;
  updatedAt?: string;
  slug: string;
  status: string;
  defaultLocale: string;
  content: Record<string, ManagedContentBlock>;
  alternateName?: string | null;
  locationDetails?: Partial<Record<'municipality' | 'department' | 'address' | 'coverage', string>>;
  publicContact?: Partial<
    Record<'web' | 'email' | 'phone' | 'whatsapp' | 'instagram' | 'facebook', string>
  >;
}

export interface ManageOverview {
  project: ManagedProject;
  roles: string[];
  isGlobalAdmin: boolean;
  can: ManageCapabilities;
}

export interface ManagedMedia {
  id: string;
  kind: string;
  url: string;
  altText: Record<string, string>;
  sortOrder: number;
  isActive: boolean;
}

export interface TeamMember {
  id: string;
  role: string;
  status: string;
  memberEmail?: string | null;
  memberUserId?: string | null;
}

export interface ManagedComment {
  id: string;
  authorDisplayName: string;
  body: string;
  status: CommentStatus;
  createdAt: string;
  moderationReason?: string | null;
}

export class ManageRequestError extends Error {
  constructor(readonly status: number, readonly code?: string) {
    super(code ?? `Manage request failed with ${status}`);
    this.name = 'ManageRequestError';
  }
}

export interface ManageClient {
  overview(): Promise<ManageOverview>;
  updateProject(patch: Record<string, unknown>): Promise<ManagedProject>;
  listMedia(): Promise<ManagedMedia[]>;
  uploadImage(
    kind: ManagedImageKind,
    file: Blob & { type: string },
    altText: string
  ): Promise<ManagedMedia>;
  retireMedia(mediaId: string): Promise<void>;
  listTeam(): Promise<TeamMember[]>;
  addTeamMember(email: string, role: ManageRole): Promise<void>;
  revokeTeamMember(membershipId: string, reason: string): Promise<void>;
  listComments(status?: CommentStatus): Promise<ManagedComment[]>;
  moderateComment(commentId: string, action: CommentAction, reason?: string): Promise<void>;
}

export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export function uploadProblem(file: { type: string; size: number }): 'type' | 'size' | null {
  if (!(UPLOAD_TYPES as readonly string[]).includes(file.type)) return 'type';
  return file.size > UPLOAD_MAX_BYTES ? 'size' : null;
}

export function createManageClient(
  projectId: string,
  getToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
  apiUrl = resolveMobileApiBaseUrl()
): ManageClient {
  const base = `${apiUrl.replace(/\/+$/, '')}/v1/me/projects/${encodeURIComponent(
    projectId
  )}/manage`;

  async function request<T>(
    path: string,
    init: { method?: string; body?: unknown } = {}
  ): Promise<T> {
    const token = await getToken();
    if (!token) throw new ManageRequestError(401, 'AUTH_REQUIRED');
    const response = await fetcher(`${base}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });
    if (!response.ok) {
      let code: string | undefined;
      try {
        const body = (await response.json()) as { code?: unknown };
        code = typeof body.code === 'string' ? body.code : undefined;
      } catch {
        // No JSON error body: the status code is enough.
      }
      throw new ManageRequestError(response.status, code);
    }
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }

  return {
    overview: () => request<ManageOverview>(''),
    updateProject: (patch) => request<ManagedProject>('', { method: 'PATCH', body: patch }),
    listMedia: () => request<ManagedMedia[]>('/media'),
    async uploadImage(kind, file, altText) {
      const problem = uploadProblem({ type: file.type, size: file.size });
      if (problem)
        throw new ManageRequestError(400, problem === 'type' ? 'UPLOAD_TYPE' : 'UPLOAD_SIZE');
      const signed = await request<{ uploadUrl: string; publicUrl: string }>('/media/upload-url', {
        method: 'POST',
        body: { kind, contentType: file.type },
      });
      const upload = await fetcher(signed.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type, 'x-upsert': 'false' },
        body: file,
      });
      if (!upload.ok) throw new ManageRequestError(upload.status, 'UPLOAD_FAILED');
      const overview = await this.overview();
      return request<ManagedMedia>('/media', {
        method: 'POST',
        body: {
          kind,
          url: signed.publicUrl,
          altText: { [overview.project.defaultLocale]: altText.trim() },
        },
      });
    },
    retireMedia: (mediaId) =>
      request<void>(`/media/${encodeURIComponent(mediaId)}`, { method: 'DELETE' }),
    listTeam: () => request<TeamMember[]>('/team'),
    addTeamMember: (email, role) =>
      request<void>('/team', { method: 'POST', body: { email: email.trim(), role } }),
    revokeTeamMember: (membershipId, reason) =>
      request<void>(`/team/${encodeURIComponent(membershipId)}/revoke`, {
        method: 'POST',
        body: { reason },
      }),
    listComments: (status) =>
      request<ManagedComment[]>(
        `/comments${status ? `?status=${encodeURIComponent(status)}` : ''}`
      ),
    moderateComment: (commentId, action, reason) =>
      request<void>(`/comments/${encodeURIComponent(commentId)}/${action}`, {
        method: 'POST',
        body: reason ? { reason } : {},
      }),
  };
}

/** Roles a manager can hand out from the app: never partner_operator (Alternun assigns it). */
export function assignableRoles(roles: readonly string[], isGlobalAdmin: boolean): ManageRole[] {
  if (isGlobalAdmin)
    return ['partner_operator', 'sub_admin', 'project_moderator', 'partner_readonly'];
  return roles.includes('partner_operator')
    ? ['sub_admin', 'project_moderator', 'partner_readonly']
    : [];
}

/** Opens the browser file picker (web only) and resolves the chosen file, or null if cancelled. */
export function pickImageFile(
  doc: Document | undefined = globalThis.document,
  accept: string = UPLOAD_TYPES.join(',')
): Promise<File | null> {
  if (!doc) return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

/**
 * Applies the fields a form exposes onto the stored object: filled values are trimmed and set,
 * emptied ones are removed, and keys the form does not show (e.g. a location `note`) are kept.
 */
export function mergeEdited(
  existing: Record<string, unknown> | null | undefined,
  edited: Record<string, string | undefined>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(existing ?? {}))
    if (typeof value === 'string') result[key] = value;
  for (const [key, value] of Object.entries(edited)) {
    const trimmed = value?.trim() ?? '';
    if (trimmed) result[key] = trimmed;
    else delete result[key];
  }
  return result;
}
