import type { AirsReportRecord } from './airs-report.types';

export interface AirsReportEmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface AirsReportEmailContext {
  report: AirsReportRecord;
  /** Public project title, when known. */
  projectName: string | null;
  /** Base URL of the Airs app, without a trailing slash. */
  appUrl: string;
  /** The honor award (galardón) that comes with the report's medal, shown with its art. */
  honorAward?: AirsReportHonorAward | null;
}

export interface AirsReportHonorAward {
  title: string;
  eventName: string | null;
  /** https art of the medal. */
  imageUrl: string;
}

export interface AirsReportReviewEmailContext extends AirsReportEmailContext {
  /** Base URL of the admin panel, where approvers decide, without a trailing slash. */
  adminUrl: string;
  /** The submitter assigned the Airs to their own account: another admin has to approve. */
  selfAssigned?: boolean;
}

export interface AirsReportEmailSend {
  (input: { to: string; email: AirsReportEmailContent }): Promise<{ sent: boolean }>;
}

export interface AirsReportNotifierDependencies {
  send: AirsReportEmailSend;
  env: Record<string, string | undefined>;
  /** Resolves a project title for the email, or null. */
  projectName: (projectId: string) => Promise<string | null>;
  /** Active Grant Approver emails; the review request goes to them. */
  approverEmails?: () => Promise<string[]>;
  /** The honor award given with a report's medal, for the recipient email; null when none. */
  honorAward?: (medalId: string) => Promise<AirsReportHonorAward | null>;
  /** Verified email of whoever submitted a report, or null when unknown. */
  submitterEmail?: (issuer: string, subject: string) => Promise<string | null>;
}
