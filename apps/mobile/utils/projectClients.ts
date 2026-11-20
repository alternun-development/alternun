import { resolveMobileApiBaseUrl } from './runtimeConfig';
import { ManageRequestError } from './projectManage';

/** Client for the "Clients" tab of the in-app project and enterprise views. */

export type ClientReportStatus =
  | 'draft'
  | 'auto_approved'
  | 'pending_approval'
  | 'approved'
  | 'awaiting_claim'
  | 'released'
  | 'rejected'
  | 'cancelled'
  | 'reversed';

export interface ClientReport {
  id: string;
  amount: number;
  concept: string;
  status: ClientReportStatus;
  submittedAt: string;
  hasProof: boolean;
}

export interface ClientInvitationEntry {
  id: string;
  status: 'pending' | 'accepted' | 'cancelled';
  invitedAt: string;
  cancelledAt: string | null;
  acceptedAt: string | null;
}

export interface ProjectClient {
  id: string;
  /**
   * `member` has an Airs account; `invitation` is waiting for the person to sign up;
   * `cancelled` only has cancelled invitations.
   */
  kind: 'member' | 'invitation' | 'cancelled';
  projectId: string;
  email: string;
  name: string;
  since: string;
  reports: ClientReport[];
  /** Invitations sent to this email in the project, newest first. */
  invitations?: ClientInvitationEntry[];
}

export interface ClientsListing {
  projects: Array<{ id: string; title: string }>;
  clients: ProjectClient[];
}

export interface ClientLookup {
  email: string;
  hasAccount: boolean;
  displayName: string | null;
}

export interface AddClientInput {
  email: string;
  name?: string;
  airs?: { amount: number; concept: string; documentNumber?: string };
}

export interface AddClientResult {
  client: ProjectClient;
  alreadyClient: boolean;
  invitationSent: boolean;
  reportStatus: ClientReportStatus | null;
}

export type ProofFile = Blob & { type: string; size: number; name?: string };

export interface ClientsClient {
  list(): Promise<ClientsListing>;
  lookup(projectId: string, email: string): Promise<ClientLookup>;
  add(projectId: string, input: AddClientInput, proof?: ProofFile | null): Promise<AddClientResult>;
  /** Also cancels the Airs still waiting for that person; returns how many. */
  cancelInvitation(projectId: string, invitationId: string): Promise<{ cancelledAirs: number }>;
  remove(projectId: string, participantId: string, reason: string): Promise<void>;
  /** Sends again the invitation (Airs waiting for sign-up) or a reminder to admins (in review). */
  resendReport(projectId: string, reportId: string): Promise<{ sentTo: 'client' | 'admins' }>;
  resendInvitation(projectId: string, invitationId: string): Promise<{ sentTo: 'client' }>;
  /** The supporting file, downloaded with the session; it is never exposed as a URL. */
  proofFile(projectId: string, reportId: string): Promise<Blob>;
}

export const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export const PROOF_MAX_BYTES = 10 * 1024 * 1024;

export function proofProblem(file: { type: string; size: number }): 'type' | 'size' | null {
  if (!(PROOF_TYPES as readonly string[]).includes(file.type)) return 'type';
  return file.size > PROOF_MAX_BYTES ? 'size' : null;
}

/**
 * Lists the clients of one project, or of every project of an enterprise. Changes always go
 * to the project they belong to.
 */
export function createClientsClient(
  scope: { projectId: string } | { enterpriseId: string },
  getToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
  apiUrl = resolveMobileApiBaseUrl()
): ClientsClient {
  const root = `${apiUrl.replace(/\/+$/, '')}/v1/me`;
  const projectBase = (projectId: string): string =>
    `${root}/projects/${encodeURIComponent(projectId)}/manage/clients`;

  async function request<T>(
    url: string,
    init: { method?: string; body?: unknown } = {}
  ): Promise<T> {
    const token = await getToken();
    if (!token) throw new ManageRequestError(401, 'AUTH_REQUIRED');
    const response = await fetcher(url, {
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
      let fieldErrors: string[] = [];
      try {
        const body = (await response.json()) as { code?: unknown; fieldErrors?: unknown };
        code = typeof body.code === 'string' ? body.code : undefined;
        if (Array.isArray(body.fieldErrors))
          fieldErrors = body.fieldErrors.filter((item): item is string => typeof item === 'string');
      } catch {
        // No JSON error body: the status code is enough.
      }
      throw new ManageRequestError(response.status, code, fieldErrors);
    }
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }

  return {
    async list() {
      if ('enterpriseId' in scope)
        return request<ClientsListing>(
          `${root}/enterprises/${encodeURIComponent(scope.enterpriseId)}/manage/clients`
        );
      const clients = await request<ProjectClient[]>(projectBase(scope.projectId));
      return { projects: [{ id: scope.projectId, title: '' }], clients };
    },
    lookup: (projectId, email) =>
      request<ClientLookup>(
        `${projectBase(projectId)}/lookup?email=${encodeURIComponent(email.trim().toLowerCase())}`
      ),
    async add(projectId, input, proof) {
      let proofPath: string | undefined;
      if (proof && input.airs) {
        const problem = proofProblem(proof);
        if (problem)
          throw new ManageRequestError(400, problem === 'type' ? 'UPLOAD_TYPE' : 'UPLOAD_SIZE');
        const signed = await request<{ uploadUrl: string; path: string }>(
          `${projectBase(projectId)}/proof-upload-url`,
          { method: 'POST', body: { contentType: proof.type, size: proof.size } }
        );
        const upload = await fetcher(signed.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': proof.type, 'x-upsert': 'false' },
          body: proof,
        });
        if (!upload.ok) throw new ManageRequestError(upload.status, 'UPLOAD_FAILED');
        proofPath = signed.path;
      }
      return request<AddClientResult>(projectBase(projectId), {
        method: 'POST',
        body: {
          email: input.email.trim().toLowerCase(),
          ...(input.name?.trim() ? { name: input.name.trim() } : {}),
          ...(input.airs
            ? {
                airs: {
                  amount: input.airs.amount,
                  concept: input.airs.concept.trim(),
                  ...(input.airs.documentNumber?.trim()
                    ? { documentNumber: input.airs.documentNumber.trim() }
                    : {}),
                  ...(proofPath ? { proofPath } : {}),
                },
              }
            : {}),
        },
      });
    },
    cancelInvitation: (projectId, invitationId) =>
      request<{ cancelledAirs: number }>(
        `${projectBase(projectId)}/invitations/${encodeURIComponent(invitationId)}`,
        { method: 'DELETE' }
      ),
    async remove(projectId, participantId, reason) {
      await request<unknown>(
        `${projectBase(projectId)}/members/${encodeURIComponent(participantId)}/remove`,
        { method: 'POST', body: { reason } }
      );
    },
    resendReport: (projectId, reportId) =>
      request<{ sentTo: 'client' | 'admins' }>(
        `${projectBase(projectId)}/reports/${encodeURIComponent(reportId)}/resend`,
        { method: 'POST', body: {} }
      ),
    resendInvitation: (projectId, invitationId) =>
      request<{ sentTo: 'client' }>(
        `${projectBase(projectId)}/invitations/${encodeURIComponent(invitationId)}/resend`,
        { method: 'POST', body: {} }
      ),
    async proofFile(projectId, reportId) {
      const token = await getToken();
      if (!token) throw new ManageRequestError(401, 'AUTH_REQUIRED');
      const response = await fetcher(
        `${projectBase(projectId)}/reports/${encodeURIComponent(reportId)}/proof`,
        { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new ManageRequestError(response.status, 'PROOF_UNAVAILABLE');
      return response.blob();
    },
  };
}

/** Limits the API applies to a client and its Airs (see the API DTOs). */
export const CLIENT_LIMITS = {
  nameMax: 120,
  conceptMin: 10,
  conceptMax: 500,
  documentMax: 80,
} as const;

export type ClientField = 'email' | 'name' | 'amount' | 'concept' | 'documentNumber';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** i18n key of what blocks each field, or nothing when the form can be sent. */
export function clientFormProblems(
  draft: { email: string; name: string; amount: string; concept: string; documentNumber: string },
  options: { needsName: boolean; assign: boolean }
): Partial<Record<ClientField, string>> {
  const problems: Partial<Record<ClientField, string>> = {};
  const email = draft.email.trim();
  if (email.length > 254 || !EMAIL_PATTERN.test(email))
    problems.email = 'manage.clients.errors.email';
  const name = draft.name.trim();
  if (options.needsName && !name) problems.name = 'manage.clients.errors.nameRequired';
  else if (name.length > CLIENT_LIMITS.nameMax) problems.name = 'manage.clients.errors.nameLong';
  if (options.assign) {
    if (airsAmount(draft.amount) === null) problems.amount = 'manage.clients.errors.amount';
    const concept = draft.concept.trim();
    if (concept.length < CLIENT_LIMITS.conceptMin)
      problems.concept = 'manage.clients.errors.conceptShort';
    else if (concept.length > CLIENT_LIMITS.conceptMax)
      problems.concept = 'manage.clients.errors.conceptLong';
    if (draft.documentNumber.trim().length > CLIENT_LIMITS.documentMax)
      problems.documentNumber = 'manage.clients.errors.documentLong';
  }
  return problems;
}

/** Field problems from the API's validation messages ("airs.concept must be longer ..."). */
export function serverFieldProblems(
  fieldErrors: readonly string[]
): Partial<Record<ClientField, string>> {
  const problems: Partial<Record<ClientField, string>> = {};
  for (const message of fieldErrors) {
    if (/concept/.test(message))
      problems.concept = /shorter/.test(message)
        ? 'manage.clients.errors.conceptLong'
        : 'manage.clients.errors.conceptShort';
    else if (/amount/.test(message)) problems.amount = 'manage.clients.errors.amount';
    else if (/documentNumber/.test(message))
      problems.documentNumber = 'manage.clients.errors.documentLong';
    else if (/email/.test(message)) problems.email = 'manage.clients.errors.email';
    else if (/name/.test(message)) problems.name = 'manage.clients.errors.nameLong';
  }
  return problems;
}

/** Short local date and time for the client list ("10 nov 2026, 10:46 p. m."), or '' if invalid. */
export function formatClientDate(iso: string | null | undefined, locale?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Whole positive Airs amount from the form, or null when it is not one. */
export function airsAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  return amount >= 1 && amount <= 2147483647 ? amount : null;
}
