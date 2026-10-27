import { Injectable } from '@nestjs/common';
import type { AdminPrincipal } from '../../common/admin-auth/admin-auth.guard';
import { AdminNotificationRepository } from './admin-notification.repository';
import type {
  AdminNotificationDraft,
  AdminNotificationEvent,
  AdminNotificationListResponse,
  AdminNotificationViewer,
  MarkNotificationsReadResponse,
} from './admin-notification.types';
import type { AirsReportRecord } from './airs-report.types';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface AdminNotificationAudience {
  emails: readonly string[];
  identities: ReadonlyArray<{ issuer: string; subject: string }>;
}

/** The event a report is in right now, as the console inbox tells it; null when nothing to say. */
export function adminNotificationEventFor(report: AirsReportRecord): AdminNotificationEvent | null {
  if (report.status === 'pending_approval') return 'report_needs_review';
  if (report.decision?.kind === 'manual') {
    return report.decision.outcome === 'rejected' ? 'report_rejected' : 'report_approved';
  }
  if (report.decision?.kind === 'auto') return 'report_submitted';
  return null;
}

@Injectable()
export class AdminNotificationService {
  constructor(private readonly repository: AdminNotificationRepository) {}

  /** The email counts only when the token vouches for it, like the approver allowlist. */
  private viewer(principal: AdminPrincipal): AdminNotificationViewer {
    const email = principal.emailVerified === true ? principal.email?.trim().toLowerCase() : null;
    return {
      issuer: principal.iss,
      subject: principal.sub,
      email: email && EMAIL_PATTERN.test(email) ? email : null,
    };
  }

  async list(principal: AdminPrincipal): Promise<AdminNotificationListResponse> {
    const viewer = this.viewer(principal);
    const [items, unreadCount] = await Promise.all([
      this.repository.list(viewer),
      this.repository.unreadCount(viewer),
    ]);
    return { items, unreadCount };
  }

  async markRead(
    principal: AdminPrincipal,
    ids?: readonly string[]
  ): Promise<MarkNotificationsReadResponse> {
    const updated = await this.repository.markRead(
      this.viewer(principal),
      ids && ids.length > 0 ? ids : null
    );
    return { updated };
  }

  /**
   * Puts one notification for the report in each recipient's inbox. Best effort: it never throws,
   * so a failed write cannot block or undo the report. Returns how many were stored.
   */
  async recordReportEvent(
    report: AirsReportRecord,
    event: AdminNotificationEvent,
    audience: AdminNotificationAudience,
    extra: Record<string, unknown> = {}
  ): Promise<number> {
    const payload = {
      amount: report.amount,
      recipientEmail: report.recipientEmail,
      concept: report.concept,
      ...extra,
    };
    const base = { eventType: event, reportId: report.id, projectId: report.projectId, payload };
    const emails = Array.from(
      new Set(
        audience.emails
          .map((email) => email.trim().toLowerCase())
          .filter((email) => EMAIL_PATTERN.test(email))
      )
    );
    const drafts: AdminNotificationDraft[] = [
      ...emails.map((recipientEmail) => ({ ...base, recipientEmail })),
      ...audience.identities
        .filter((identity) => identity.issuer.trim() && identity.subject.trim())
        .map((identity) => ({
          ...base,
          recipientIssuer: identity.issuer.trim(),
          recipientSubject: identity.subject.trim(),
        })),
    ];
    if (drafts.length === 0) return 0;
    try {
      return await this.repository.insertMany(drafts);
    } catch {
      return 0;
    }
  }
}
