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

export interface ProjectClient {
  id: string;
  /** `member` has an Airs account; `invitation` is waiting for the person to sign up. */
  kind: 'member' | 'invitation';
  projectId: string;
  email: string;
  name: string;
  since: string;
  reports: ClientReport[];
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
  cancelInvitation(projectId: string, invitationId: string): Promise<void>;
  remove(projectId: string, participantId: string, reason: string): Promise<void>;
  proofUrl(projectId: string, reportId: string): Promise<string>;
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
      request<void>(`${projectBase(projectId)}/invitations/${encodeURIComponent(invitationId)}`, {
        method: 'DELETE',
      }),
    async remove(projectId, participantId, reason) {
      await request<unknown>(
        `${projectBase(projectId)}/members/${encodeURIComponent(participantId)}/remove`,
        { method: 'POST', body: { reason } }
      );
    },
    async proofUrl(projectId, reportId) {
      const { url } = await request<{ url: string }>(
        `${projectBase(projectId)}/reports/${encodeURIComponent(reportId)}/proof`
      );
      return url;
    },
  };
}

/** Whole positive Airs amount from the form, or null when it is not one. */
export function airsAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  return amount >= 1 && amount <= 2147483647 ? amount : null;
}
