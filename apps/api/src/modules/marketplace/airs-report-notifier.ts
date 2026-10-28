import {
  renderAirsReportDecisionEmail,
  renderAirsReportRecipientEmail,
  renderAirsReportReviewRequestEmail,
  renderAirsReportSupportEmail,
} from './airs-report-emails';
import type { AirsReportNotifierDependencies } from './airs-report-emails.types';
import type { AirsReportRecord } from './airs-report.types';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface AirsReportNotifyResult {
  recipientSent: boolean;
  supportSent: number;
}

export function resolveAirsReportAppUrl(env: Record<string, string | undefined>): string {
  const explicit = (env.AIRS_DASHBOARD_URL ?? env.EXPO_PUBLIC_ORIGIN ?? '').trim();
  return (explicit || 'https://airs.alternun.co').replace(/\/+$/, '');
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
): (report: AirsReportRecord) => Promise<AirsReportNotifyResult> {
  return async (report) => {
    const result: AirsReportNotifyResult = { recipientSent: false, supportSent: 0 };
    if (report.status !== 'awaiting_claim' && report.status !== 'released') {
      return result;
    }

    const projectName = await dependencies.projectName(report.projectId).catch(() => null);
    const context = {
      report,
      projectName,
      appUrl: resolveAirsReportAppUrl(dependencies.env),
    };

    try {
      const sent = await dependencies.send({
        to: report.recipientEmail,
        email: renderAirsReportRecipientEmail(context),
      });
      result.recipientSent = sent.sent;
    } catch {
      result.recipientSent = false;
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
    const context = {
      report,
      projectName,
      appUrl: resolveAirsReportAppUrl(dependencies.env),
    };
    const email = waiting
      ? renderAirsReportReviewRequestEmail(context)
      : renderAirsReportDecisionEmail(context);

    const audience: string[] = [];
    if (waiting) {
      audience.push(
        ...(await (dependencies.approverEmails?.() ?? Promise.resolve([])).catch(() => []))
      );
    } else {
      const submitter = await (
        dependencies.submitterEmail?.(report.submittedBy.issuer, report.submittedBy.subject) ??
        Promise.resolve(null)
      ).catch(() => null);
      if (submitter) audience.push(submitter);
    }
    audience.push(...resolveAirsReportSupportEmails(dependencies.env));

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
