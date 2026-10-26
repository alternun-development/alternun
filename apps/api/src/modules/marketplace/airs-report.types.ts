// API contract for User Airs Reports (issue #249, Part B).
// Admin screens build against these shapes; the database functions in
// supabase/migrations/20261027_0003_create_airs_reports.sql enforce them.

export const AIRS_REPORT_STATUSES = [
  'draft',
  'auto_approved',
  'pending_approval',
  'approved',
  'awaiting_claim',
  'released',
  'rejected',
  'cancelled',
  'reversed',
] as const;
export type AirsReportStatus = (typeof AIRS_REPORT_STATUSES)[number];

// Where a submitted report can end up after submit or approve.
export type AirsReportSettledStatus = 'pending_approval' | 'awaiting_claim' | 'released';

export const AIRS_REPORT_CONCEPT_MIN_LENGTH = 10;
export const AIRS_REPORT_CONCEPT_MAX_LENGTH = 500;
export const AIRS_REPORT_NAME_MAX_LENGTH = 120;
export const AIRS_REPORT_DOCUMENT_NUMBER_MAX_LENGTH = 80;
export const AIRS_REPORT_REASON_MAX_LENGTH = 500;
export const AIRS_REPORT_EMAIL_MAX_LENGTH = 320;
export const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

export interface AirsReportActorRef {
  issuer: string;
  subject: string;
}

/** Frozen at submit. Its SHA-256 (snapshotHash) is what an approver signs off on. */
export interface AirsReportSnapshot {
  projectId: string;
  recipientEmail: string;
  recipientName: string | null;
  amount: number;
  concept: string;
  medalId: string | null;
  documentNumber: string | null;
  documentSha256: string | null;
  submittedBy: AirsReportActorRef;
  submittedAt: string;
}

export interface AirsReportDecision {
  kind: 'auto' | 'manual';
  outcome: 'approved' | 'rejected';
  decidedAt: string;
  /** Null for automatic decisions. */
  decidedBy: AirsReportActorRef | null;
  reason: string | null;
}

export interface AirsReportRecord {
  id: string;
  projectId: string;
  status: AirsReportStatus;
  recipientEmail: string;
  recipientName: string | null;
  /** Set once the Airs are credited to an existing, verified account. */
  recipientUserId: string | null;
  amount: number;
  concept: string;
  medalId: string | null;
  documentNumber: string | null;
  documentSha256: string | null;
  snapshotHash: string;
  submittedBy: AirsReportActorRef;
  submittedAt: string;
  decision: AirsReportDecision | null;
  releasedAt: string | null;
  ledgerEntryId: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  updatedAt: string;
}

/** Recipient totals used by auto-approval: every report to the recipient, across all projects. */
export interface AirsReportRecipientTotals {
  timeZone: string;
  /** Calendar day in timeZone, YYYY-MM-DD. */
  day: string;
  /** Calendar month in timeZone, YYYY-MM. */
  month: string;
  dailyTotal: number;
  monthlyTotal: number;
  dailyLimit: number;
  monthlyLimit: number;
}

// POST /v1/admin/projects/:projectId/airs-reports
export interface SubmitAirsReportRequest {
  recipientEmail: string;
  /** Required when the email has no verified account. */
  recipientName?: string;
  amount: number;
  concept: string;
  /** Reserved for the per-project medal catalog; rejected until that catalog exists. */
  medalId?: string;
  documentNumber?: string;
  /** SHA-256 (hex) of the supporting file, once uploads exist. */
  documentSha256?: string;
}

export interface SubmitAirsReportResponse {
  report: AirsReportRecord;
  /** True when the same request id was already processed. */
  idempotent: boolean;
  autoApproval: {
    approved: boolean;
    /** Totals including this report. */
    totals: AirsReportRecipientTotals;
  };
}

// GET /v1/admin/projects/:projectId/airs-reports
export interface ListAirsReportsQuery {
  status?: AirsReportStatus;
}
export type ListAirsReportsResponse = AirsReportRecord[];

// GET /v1/admin/projects/:projectId/airs-reports/recipient?email=
export interface AirsReportRecipientLookupResponse {
  email: string;
  hasAccount: boolean;
  /** Only when hasAccount is true. */
  displayName: string | null;
}

// GET /v1/admin/airs-reports/:id
export interface AirsReportDetailResponse {
  report: AirsReportRecord;
  recipientTotals: AirsReportRecipientTotals;
}

// POST /v1/admin/airs-reports/:id/approve
export interface ApproveAirsReportRequest {
  /** The snapshotHash the approver reviewed. A mismatch is rejected. */
  snapshotHash: string;
}

// POST /v1/admin/airs-reports/:id/reject and /cancel
export interface AirsReportReasonRequest {
  reason: string;
}

export interface AirsReportTransitionResponse {
  report: AirsReportRecord;
  idempotent: boolean;
}

/** Monthly summary for a recipient, by day. */
export interface AirsReportMonthlySummary {
  recipientEmail: string;
  timeZone: string;
  month: string;
  monthlyTotal: number;
  monthlyLimit: number;
  days: Array<{ day: string; total: number; dailyLimit: number }>;
}

/**
 * Claim of an awaiting_claim report by the recipient's first session.
 * Declared for the contract; implemented in a separate change.
 */
export interface ClaimAirsReportsRequest {
  userId: string;
  sessionEmail: string;
  emailConfirmed: boolean;
}
export interface ClaimAirsReportsResponse {
  claimedReportIds: string[];
}

export const AIRS_REPORT_ERROR_CODES = [
  'AIRS_REPORT_INPUT_INVALID',
  'AIRS_REPORT_NOT_FOUND',
  'AIRS_REPORT_TRANSITION_INVALID',
  'AIRS_REPORT_SELF_APPROVAL_DENIED',
  'AIRS_REPORT_APPROVER_NOT_ALLOWED',
  'AIRS_REPORT_SNAPSHOT_MISMATCH',
  'AIRS_REPORT_RECIPIENT_NAME_REQUIRED',
  'AIRS_REPORT_REASON_REQUIRED',
  'AIRS_REPORT_MEDAL_UNAVAILABLE',
  'AIRS_REPORT_LOOKUP_RATE_LIMITED',
  'AIRS_REPORT_CLAIM_NOT_IMPLEMENTED',
  'PROJECT_NOT_FOUND',
  'PROJECT_ARCHIVED',
  'PROJECT_SCOPE_DENIED',
  'PERMISSION_DENIED',
] as const;
export type AirsReportErrorCode = (typeof AIRS_REPORT_ERROR_CODES)[number];
