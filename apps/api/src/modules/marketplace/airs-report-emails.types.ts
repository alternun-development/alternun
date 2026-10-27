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
  /** Verified email of whoever submitted a report, or null when unknown. */
  submitterEmail?: (issuer: string, subject: string) => Promise<string | null>;
}
