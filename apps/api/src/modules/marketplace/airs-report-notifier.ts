import {
  renderAirsReportDecisionEmail,
  renderAirsReportRecipientEmail,
  renderAirsReportReviewRequestEmail,
  renderAirsReportSupportEmail,
} from './airs-report-emails';
import type { AirsReportNotifierDependencies } from './airs-report-emails.types';
import type { AirsReportRecord } from './airs-report.types';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface AirsReportNotifyOptions {
  /** False skips the email to the recipient; support still gets its tracking email. */
  recipient?: boolean;
}

export interface AirsReportNotifyResult {
  recipientSent: boolean;
  supportSent: number;
}

export function resolveAirsReportAppUrl(env: Record<string, string | undefined>): string {
  const explicit = (env.AIRS_DASHBOARD_URL ?? env.EXPO_PUBLIC_ORIGIN ?? '').trim();
  return (explicit || 'https://airs.alternun.co').replace(/\/+$/, '');
}

/**
 * Base URL of the admin panel, where approvers decide. AIRS_ADMIN_URL overrides it; otherwise it
 * sits next to the Airs app: airs.alternun.co -> admin.alternun.co,
 * testnet.airs.alternun.co -> testnet.admin.alternun.co.
 */
export function resolveAirsReportAdminUrl(env: Record<string, string | undefined>): string {
  const explicit = (env.AIRS_ADMIN_URL ?? '').trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  try {
    const app = new URL(resolveAirsReportAppUrl(env));
    if (app.hostname === 'localhost' || app.hostname === '127.0.0.1') {
      return 'http://localhost:5173';
    }
    const labels = app.hostname.split('.');
    const airs = labels.indexOf('airs');
    if (airs >= 0) {
      labels[airs] = 'admin';
      return `${app.protocol}//${labels.join('.')}`;
    }
  } catch {
    // An unparsable app URL falls back to the production panel.
  }
  return 'https://admin.alternun.co';
}

/** True when the address belongs to the report's recipient or to whoever submitted it. */
export function isReportParty(
  email: string,
  report: Pick<AirsReportRecord, 'recipientEmail'>,
  submitterEmail?: string | null
): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return [report.recipientEmail, submitterEmail ?? '']
    .map((entry) => entry.trim().toLowerCase())
    .includes(normalized);
}

/**
 * Removes the people a report is about from a list of addresses: nobody approves Airs for
 * themselves, so neither the recipient nor whoever submitted it is asked to review it.
 */
export function withoutReportParties(
  emails: readonly string[],
  report: Pick<AirsReportRecord, 'recipientEmail'>,
  submitterEmail?: string | null
): string[] {
  return emails.filter((entry) => !isReportParty(entry, report, submitterEmail));
}

/** Support mailboxes come from configuration, never from the repository. */
export function resolveAirsReportSupportEmails(env: Record<string, string | undefined>): string[] {
  const addresses: string[] = (env.AIRS_REPORT_SUPPORT_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => EMAIL_PATTERN.test(entry));
  return Array.from(new Set<string>(addresses));
}

/**
 * Emails sent when Airs are issued: the recipient (with the link to claim when the person has
 * no account yet) and one tracking email per support mailbox. A failed email never blocks or
 * undoes the issuance, so this resolves with what was sent and never throws.
 */
export function createAirsReportNotifier(
  dependencies: AirsReportNotifierDependencies
): (
  report: AirsReportRecord,
  options?: AirsReportNotifyOptions
) => Promise<AirsReportNotifyResult> {
  return async (report, options = {}) => {
    const result: AirsReportNotifyResult = { recipientSent: false, supportSent: 0 };
    if (report.status !== 'awaiting_claim' && report.status !== 'released') {
      return result;
    }

    const projectName = await dependencies.projectName(report.projectId).catch(() => null);
    const honorAward =
      report.medalId && dependencies.honorAward
        ? await dependencies.honorAward(report.medalId).catch(() => null)
        : null;
    const context = {
      report,
      projectName,
      appUrl: resolveAirsReportAppUrl(dependencies.env),
      honorAward,
    };

    // A caller that writes to the recipient itself (e.g. the client invitation) skips this one.
    if (options.recipient !== false) {
      try {
        const sent = await dependencies.send({
          to: report.recipientEmail,
          email: renderAirsReportRecipientEmail(context),
        });
        result.recipientSent = sent.sent;
      } catch {
        result.recipientSent = false;
      }
    }

    const supportEmail = renderAirsReportSupportEmail(context);
    for (const to of resolveAirsReportSupportEmails(dependencies.env)) {
      try {
        const sent = await dependencies.send({ to, email: supportEmail });
        if (sent.sent) result.supportSent += 1;
      } catch {
        // Tracking is best effort.
      }
    }

    return result;
  };
}

export interface AirsReportWorkflowNotifyResult {
  sent: number;
}

/**
 * Emails for the approval workflow: a report waiting for review goes to the approvers and
 * support; a manual approval or rejection goes to whoever submitted it and to support.
 * Auto-approved reports have no decision email (support already gets the issuance tracking).
 * Like the issuance emails, this never throws.
 */
export function createAirsReportWorkflowNotifier(
  dependencies: AirsReportNotifierDependencies
): (report: AirsReportRecord) => Promise<AirsReportWorkflowNotifyResult> {
  return async (report) => {
    const result: AirsReportWorkflowNotifyResult = { sent: 0 };
    const waiting = report.status === 'pending_approval';
    const decided = report.decision?.kind === 'manual';
    if (!waiting && !decided) return result;

    const projectName = await dependencies.projectName(report.projectId).catch(() => null);
    const submitter = await (
      dependencies.submitterEmail?.(report.submittedBy.issuer, report.submittedBy.subject) ??
      Promise.resolve(null)
    ).catch(() => null);
    const context = {
      report,
      projectName,
      appUrl: resolveAirsReportAppUrl(dependencies.env),
      adminUrl: resolveAirsReportAdminUrl(dependencies.env),
      // Airs assigned to the submitter's own account always wait for another admin.
      selfAssigned: !!submitter && isReportParty(submitter, report),
    };
    const email = waiting
      ? renderAirsReportReviewRequestEmail(context)
      : renderAirsReportDecisionEmail(context);

    let audience: string[] = [];
    if (waiting) {
      audience.push(
        ...(await (dependencies.approverEmails?.() ?? Promise.resolve([])).catch(() => []))
      );
    } else if (submitter) {
      audience.push(submitter);
    }
    audience.push(...resolveAirsReportSupportEmails(dependencies.env));
    // The review request carries the approval link: never to the recipient or the submitter.
    if (waiting) audience = withoutReportParties(audience, report, submitter);

    const recipients = Array.from(
      new Set<string>(
        audience
          .map((entry) => entry.trim().toLowerCase())
          .filter((entry) => EMAIL_PATTERN.test(entry))
      )
    );
    for (const to of recipients) {
      try {
        const sent = await dependencies.send({ to, email });
        if (sent.sent) result.sent += 1;
      } catch {
        // Notifications are best effort.
      }
    }
    return result;
  };
}
