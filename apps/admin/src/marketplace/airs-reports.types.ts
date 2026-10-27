// Shapes of the User Airs Report endpoints (issue #249, Part B). They mirror the API contract in
// apps/api/src/modules/marketplace/airs-report.types.ts.

export type AirsReportStatus =
  | 'draft'
  | 'auto_approved'
  | 'pending_approval'
  | 'approved'
  | 'awaiting_claim'
  | 'released'
  | 'rejected'
  | 'cancelled'
  | 'reversed';

export type AirsReportRecord = {
  id: string;
  projectId: string;
  status: AirsReportStatus;
  recipientEmail: string;
  recipientName: string | null;
  amount: number;
  concept: string;
  documentNumber: string | null;
  snapshotHash: string;
  submittedAt: string;
  decision: {
    kind: 'auto' | 'manual';
    outcome: 'approved' | 'rejected';
    decidedAt: string;
    reason: string | null;
  } | null;
};

export type AirsReportRecipientTotals = {
  timeZone: string;
  day: string;
  month: string;
  dailyTotal: number;
  monthlyTotal: number;
  dailyLimit: number;
  monthlyLimit: number;
};

export type AirsReportBlockedReason = 'SELF_REPORT' | 'SUBMITTER_EMAIL_UNVERIFIED';

export type SubmitAirsReportResponse = {
  report: AirsReportRecord;
  idempotent: boolean;
  autoApproval: {
    approved: boolean;
    blockedReason: AirsReportBlockedReason | null;
    totals: AirsReportRecipientTotals;
  };
};

export type AirsReportRecipientLookup = {
  email: string;
  hasAccount: boolean;
  displayName: string | null;
};

export type AirsReportTimelineEntry = {
  action: string;
  result: 'allowed' | 'denied';
  reasonCode: string | null;
  occurredAt: string;
};

export type AirsReportReward = {
  kind: 'submitter' | 'project';
  amount: number;
  status: 'locked' | 'credited' | 'void';
  creditedAt: string | null;
};

export type AirsReportDetail = {
  report: AirsReportRecord;
  recipientTotals: AirsReportRecipientTotals;
  // Older API versions do not send these two lists.
  timeline?: AirsReportTimelineEntry[];
  rewards?: AirsReportReward[];
};

export type AirsReportTransition = {
  report: AirsReportRecord;
  idempotent: boolean;
};

export type AirsReportFormValues = {
  recipientEmail: string;
  recipientName: string;
  amount: string;
  concept: string;
  documentNumber: string;
};

export type AirsReportFormField = keyof AirsReportFormValues;

export type AirsReportFormErrors = Partial<Record<AirsReportFormField, string>>;

/** What the person who submitted sees once the server answers. */
export type AirsReportOutcomeKind = 'credited' | 'waiting_claim' | 'in_review';

export type AirsReportSummary = {
  credited: number;
  creditedAirs: number;
  waitingApproval: number;
  waitingClaim: number;
  /** Airs in every report that is not rejected, cancelled or reversed. */
  totalAirs: number;
};
