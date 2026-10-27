import type { AdminRole } from '../auth/oidc-client';
import { marketplaceCopy } from './copy';
import { hasMarketplacePermission } from './permissions';
import type {
  AirsReportRecord,
  AirsReportSummary,
  AirsReportTimelineEntry,
  AirsReportFormErrors,
  AirsReportFormValues,
  AirsReportOutcomeKind,
  AirsReportRecipientLookup,
  SubmitAirsReportResponse,
} from './airs-reports.types';

// Limits mirror the API and the database functions; the server stays the authority.
export const AIRS_REPORT_CONCEPT_MIN = 10;
export const AIRS_REPORT_CONCEPT_MAX = 500;
export const AIRS_REPORT_NAME_MAX = 120;
export const AIRS_REPORT_DOCUMENT_MAX = 80;
export const AIRS_REPORT_REASON_MAX = 500;
export const AIRS_REPORT_AMOUNT_MAX = 2147483647;

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export const emptyAirsReportForm: AirsReportFormValues = {
  recipientEmail: '',
  recipientName: '',
  amount: '',
  concept: '',
  documentNumber: '',
};

export function airsReportsPath(projectId: string): string {
  return `/v1/admin/projects/${encodeURIComponent(projectId)}/airs-reports`;
}

export function airsReportRecipientPath(projectId: string, email: string): string {
  return `${airsReportsPath(projectId)}/recipient?email=${encodeURIComponent(email.trim())}`;
}

export const airsReportQueuePath = '/v1/admin/airs-reports';

export function airsReportDetailPath(reportId: string): string {
  return `${airsReportQueuePath}/${encodeURIComponent(reportId)}`;
}

export function airsReportActionPath(reportId: string, action: 'approve' | 'reject'): string {
  return `${airsReportDetailPath(reportId)}/${action}`;
}

/** Who sees the report form. Mirrors the API; the server also checks the project scope. */
export function canSubmitAirsReport(roles: readonly AdminRole[]): boolean {
  return hasMarketplacePermission(roles, 'airs_reports:submit');
}

/** Approvers are an allowlist on the server. Only global admins can be on it. */
export function canOpenAirsReportQueue(roles: readonly AdminRole[]): boolean {
  return roles.some((role) => role === 'platform_owner' || role === 'internal_admin');
}

/** One new key per form submission: a retry of the same submission is idempotent. */
export function newAirsReportRequestKey(): string {
  return globalThis.crypto.randomUUID();
}

export function isValidAirsReportEmail(value: string): boolean {
  const email = value.trim();
  return email.length <= 320 && EMAIL_PATTERN.test(email);
}

export function parseAirsReportAmount(value: string): number | null {
  const text = value.trim();
  if (!/^[0-9]+$/.test(text)) return null;
  const amount = Number(text);
  return Number.isSafeInteger(amount) && amount >= 1 && amount <= AIRS_REPORT_AMOUNT_MAX
    ? amount
    : null;
}

/**
 * Checks the form before anything is sent. The name is required only when the email has no
 * account yet (`hasAccount === false`); while the lookup has not run it is not enforced.
 */
export function validateAirsReportForm(
  values: AirsReportFormValues,
  lookup: AirsReportRecipientLookup | null
): AirsReportFormErrors {
  const copy = marketplaceCopy.airsReports.errors;
  const errors: AirsReportFormErrors = {};

  if (!isValidAirsReportEmail(values.recipientEmail)) errors.recipientEmail = copy.email;
  if (lookup && lookup.hasAccount === false && !values.recipientName.trim()) {
    errors.recipientName = copy.nameRequired;
  }
  if (values.recipientName.trim().length > AIRS_REPORT_NAME_MAX)
    errors.recipientName = copy.nameLong;
  if (parseAirsReportAmount(values.amount) === null) errors.amount = copy.amount;

  const concept = values.concept.trim();
  if (concept.length < AIRS_REPORT_CONCEPT_MIN || concept.length > AIRS_REPORT_CONCEPT_MAX) {
    errors.concept = copy.concept;
  }

  const documentNumber = values.documentNumber.trim();
  if (!documentNumber) errors.documentNumber = copy.documentRequired;
  else if (documentNumber.length > AIRS_REPORT_DOCUMENT_MAX)
    errors.documentNumber = copy.documentLong;

  return errors;
}

export function buildSubmitAirsReportBody(
  values: AirsReportFormValues,
  lookup: AirsReportRecipientLookup | null,
  requestKey: string
): Record<string, unknown> {
  const name = values.recipientName.trim();
  return {
    recipientEmail: values.recipientEmail.trim().toLowerCase(),
    // An existing account keeps its own name; the field is only for people without one.
    ...(name && lookup?.hasAccount !== true ? { recipientName: name } : {}),
    amount: parseAirsReportAmount(values.amount),
    concept: values.concept.trim(),
    documentNumber: values.documentNumber.trim(),
    requestKey,
  };
}

export function airsReportOutcome(response: SubmitAirsReportResponse): AirsReportOutcomeKind {
  switch (response.report.status) {
    case 'released':
      return 'credited';
    case 'awaiting_claim':
      return 'waiting_claim';
    default:
      return 'in_review';
  }
}

/** Why a report that stayed inside the limits still waits for an approver, if that is the case. */
export function airsReportReviewReason(response: SubmitAirsReportResponse): string {
  const copy = marketplaceCopy.airsReports.outcome;
  const { autoApproval } = response;
  if (autoApproval.blockedReason === 'SELF_REPORT') return copy.reviewSelf;
  if (autoApproval.blockedReason === 'SUBMITTER_EMAIL_UNVERIFIED') return copy.reviewUnverified;
  const { totals } = autoApproval;
  if (totals.dailyTotal > totals.dailyLimit) return copy.reviewDaily(totals.dailyLimit);
  if (totals.monthlyTotal > totals.monthlyLimit) return copy.reviewMonthly(totals.monthlyLimit);
  return copy.reviewGeneric;
}

export function airsReportRejectReasonError(reason: string): string | null {
  const text = reason.trim();
  if (!text) return marketplaceCopy.airsReports.queue.reasonRequired;
  return text.length > AIRS_REPORT_REASON_MAX ? marketplaceCopy.airsReports.queue.reasonLong : null;
}

export function isAirsReportSnapshotHash(value: string): boolean {
  return SHA256_PATTERN.test(value);
}

/** Friendly label for an audit action; unknown actions fall back to a readable name. */
export function describeTimelineAction(
  entry: Pick<AirsReportTimelineEntry, 'action' | 'result'>
): string {
  const labels = marketplaceCopy.airsReports.history.actions;
  const readable = entry.action
    .replace(/^airs_report\./, '')
    .replace(/_/g, ' ')
    .trim();
  const fallback = readable ? readable.charAt(0).toUpperCase() + readable.slice(1) : entry.action;
  const text = labels[entry.action] ?? fallback;
  return entry.result === 'denied'
    ? `${text} (${marketplaceCopy.airsReports.history.denied})`
    : text;
}

/** Counts shown above the recent reports: what is done, what waits, and how many Airs are involved. */
export function summarizeAirsReports(
  records: ReadonlyArray<Pick<AirsReportRecord, 'status' | 'amount'>>
): AirsReportSummary {
  const summary: AirsReportSummary = {
    credited: 0,
    creditedAirs: 0,
    waitingApproval: 0,
    waitingClaim: 0,
    totalAirs: 0,
  };
  for (const record of records) {
    if (
      record.status === 'rejected' ||
      record.status === 'cancelled' ||
      record.status === 'reversed'
    )
      continue;
    summary.totalAirs += record.amount;
    if (record.status === 'released') {
      summary.credited += 1;
      summary.creditedAirs += record.amount;
    } else if (record.status === 'pending_approval') {
      summary.waitingApproval += 1;
    } else if (record.status === 'awaiting_claim') {
      summary.waitingClaim += 1;
    }
  }
  return summary;
}

export function formatAirs(amount: number): string {
  return `${amount.toLocaleString('en-US')} Airs`;
}
