import { resolveMobileApiBaseUrl } from './runtimeConfig';
import { ManageRequestError } from './projectManage';

/** Client for the in-app review of Airs in review (GET/POST /v1/me/airs-reports, ...). */

export interface AirsReviewItem {
  id: string;
  projectId: string;
  /** Project title in its default language; null when the server could not read it. */
  projectTitle: string | null;
  status: string;
  recipientEmail: string;
  recipientName: string | null;
  amount: number;
  concept: string;
  documentNumber: string | null;
  /** The version the approver signs off on; a changed report is refused by the server. */
  snapshotHash: string;
  submittedAt: string;
  hasProof: boolean;
}

/** Everything the recipient received across projects, against the automatic limits. */
export interface AirsReviewTotals {
  dailyTotal: number;
  dailyLimit: number;
  monthlyTotal: number;
  monthlyLimit: number;
}

export interface AirsReviewDetail {
  report: { id: string; snapshotHash: string };
  recipientTotals: AirsReviewTotals;
}

export interface AirsReviewClient {
  access(): Promise<{ canApprove: boolean }>;
  list(): Promise<AirsReviewItem[]>;
  detail(reportId: string): Promise<AirsReviewDetail>;
  approve(reportId: string, snapshotHash: string): Promise<void>;
  reject(reportId: string, reason: string): Promise<void>;
  proofFile(reportId: string): Promise<Blob>;
}

/** Same limit as the API (AIRS_REPORT_REASON_MAX_LENGTH). */
export const REJECT_REASON_MAX = 500;

/** What blocks a rejection reason, or null when it can be sent. */
export function rejectReasonProblem(reason: string): 'required' | 'tooLong' | null {
  const trimmed = reason.trim();
  if (!trimmed) return 'required';
  return trimmed.length > REJECT_REASON_MAX ? 'tooLong' : null;
}

/** The report a review email points to (?report=<id>), if any. */
export function focusedReportId(param: string | string[] | undefined): string | undefined {
  const value = Array.isArray(param) ? param[0] : param;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** The linked report first; the rest keep the queue order (oldest first). */
export function focusFirst<T extends { id: string }>(items: T[], focusId?: string): T[] {
  const focused = items.filter((item) => item.id === focusId);
  return focused.length ? [...focused, ...items.filter((item) => item.id !== focusId)] : items;
}

export function createAirsReviewClient(
  getToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
  apiUrl = resolveMobileApiBaseUrl()
): AirsReviewClient {
  const base = `${apiUrl.replace(/\/+$/, '')}/v1/me/airs-reports`;

  async function send(path: string, init: { method?: string; body?: unknown }, accept: string) {
    const token = await getToken();
    if (!token) throw new ManageRequestError(401, 'AUTH_REQUIRED');
    const response = await fetcher(`${base}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Accept: accept,
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
    return response;
  }

  async function request<T>(path: string, init: { method?: string; body?: unknown } = {}) {
    return (await (await send(path, init, 'application/json')).json()) as T;
  }

  const report = (reportId: string): string => `/${encodeURIComponent(reportId)}`;

  return {
    access: () => request<{ canApprove: boolean }>('/access'),
    list: () => request<AirsReviewItem[]>(''),
    detail: (reportId) => request<AirsReviewDetail>(report(reportId)),
    async approve(reportId, snapshotHash) {
      await request<unknown>(`${report(reportId)}/approve`, {
        method: 'POST',
        body: { snapshotHash },
      });
    },
    async reject(reportId, reason) {
      await request<unknown>(`${report(reportId)}/reject`, {
        method: 'POST',
        body: { reason: reason.trim() },
      });
    },
    async proofFile(reportId) {
      return (await send(`${report(reportId)}/proof`, {}, '*/*')).blob();
    },
  };
}
