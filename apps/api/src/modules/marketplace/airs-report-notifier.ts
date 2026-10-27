import { renderAirsReportRecipientEmail, renderAirsReportSupportEmail } from './airs-report-emails';
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
