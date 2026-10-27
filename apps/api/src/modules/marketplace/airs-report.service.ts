import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  grantsGlobally,
  hasPermission,
  rolesWithPermission,
  type AdminPrincipal,
} from '../../common/admin-auth/admin-auth.guard';
import { marketplaceError } from './marketplace.errors';
import { MarketplaceAdminRepository } from './marketplace.repository';
import { actorFromPrincipal } from './marketplace.types';
import { AirsReportRepository, type AirsReportApprover } from './airs-report.repository';
import { sendAirsEmail } from '../airs/airs.email';
import type { AirsReportNotifierDependencies } from './airs-report-emails.types';
import {
  createAirsReportNotifier,
  createAirsReportWorkflowNotifier,
  resolveAirsReportSupportEmails,
} from './airs-report-notifier';
import { AdminNotificationService, adminNotificationEventFor } from './admin-notification.service';
import type {
  AirsReportDetailResponse,
  AirsReportRecipientLookupResponse,
  AirsReportRecord,
  AirsReportStatus,
  AirsReportTransitionResponse,
  SubmitAirsReportRequest,
  SubmitAirsReportResponse,
} from './airs-report.types';

function approverFrom(principal: AdminPrincipal): AirsReportApprover {
  return { email: principal.email, emailVerified: principal.emailVerified };
}

type NotifyIssued = (report: AirsReportRecord) => Promise<unknown>;

/** Optional override of the issuance emails; tests inject a recorder, the app uses the default. */
export const AIRS_REPORT_NOTIFY_ISSUED = Symbol('AIRS_REPORT_NOTIFY_ISSUED');
/** Same, for the approval workflow emails (review requested, approved, rejected). */
export const AIRS_REPORT_NOTIFY_WORKFLOW = Symbol('AIRS_REPORT_NOTIFY_WORKFLOW');

@Injectable()
export class AirsReportService {
  private readonly notifyIssued: NotifyIssued;
  private readonly notifyWorkflow: NotifyIssued;

  constructor(
    private readonly repository: AirsReportRepository,
    private readonly adminRepository: MarketplaceAdminRepository,
    @Optional() @Inject(AIRS_REPORT_NOTIFY_ISSUED) notifyIssued?: NotifyIssued,
    @Optional() @Inject(AIRS_REPORT_NOTIFY_WORKFLOW) notifyWorkflow?: NotifyIssued,
    @Optional() @Inject(AdminNotificationService) private readonly inbox?: AdminNotificationService
  ) {
    const dependencies: AirsReportNotifierDependencies = {
      send: async ({
        to,
        email,
      }: {
        to: string;
        email: { subject: string; text: string; html: string };
      }) => {
        const result = await sendAirsEmail({ to, email });
        return { sent: result.sent };
      },
      env: process.env,
      projectName: async (projectId) => {
        const project = await this.adminRepository.findProject(projectId);
        const content = project?.content as unknown as
          | Record<string, { title?: unknown } | undefined>
          | undefined;
        const title = project ? content?.[project.defaultLocale]?.title : undefined;
        return typeof title === 'string' && title.trim() ? title.trim() : null;
      },
      approverEmails: () => this.repository.listApproverEmails(),
      submitterEmail: (issuer, subject) => this.repository.findSubmitterEmail(issuer, subject),
    };
    this.notifyIssued = notifyIssued ?? createAirsReportNotifier(dependencies);
    this.notifyWorkflow = notifyWorkflow ?? createAirsReportWorkflowNotifier(dependencies);
  }

  // Emails are best effort: a failed send never blocks or undoes the issuance, and a replay of
  // the same request (idempotent) never sends them again.
  private async announce(response: {
    report: AirsReportRecord;
    idempotent: boolean;
  }): Promise<void> {
    if (response.idempotent) return;
    for (const notify of [this.notifyIssued, this.notifyWorkflow]) {
      try {
        await notify(response.report);
      } catch {
        // Intentionally ignored.
      }
    }
    await this.leaveInboxNotice(response.report);
  }

  // The console inbox: approvers for a report that needs review, the person who submitted it for a
  // decision, and the support mailboxes for everything. Best effort like the emails.
  private async leaveInboxNotice(report: AirsReportRecord): Promise<void> {
    const event = adminNotificationEventFor(report);
    if (!this.inbox || !event) return;
    try {
      const support = resolveAirsReportSupportEmails(process.env);
      const approvers =
        event === 'report_needs_review' ? await this.repository.listApproverEmails() : [];
      const decided = event === 'report_approved' || event === 'report_rejected';
      await this.inbox.recordReportEvent(
        report,
        event,
        {
          emails: [...support, ...approvers],
          identities: decided ? [report.submittedBy] : [],
        },
        decided && report.decision?.reason ? { reason: report.decision.reason } : {}
      );
    } catch {
      // Intentionally ignored.
    }
  }

  // The history only informs the screen: if it cannot be read, the report still opens.
  private async history<T>(read: () => Promise<T[]>): Promise<T[]> {
    try {
      return await read();
    } catch {
      return [];
    }
  }

  private async deny(
    principal: AdminPrincipal,
    requestId: string,
    code: string,
    reportId?: string,
    projectId?: string
  ): Promise<never> {
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'authorization.denied',
      targetType: 'airs_report',
      targetId: reportId ?? null,
      projectId,
      requestId,
      result: 'denied',
      reasonCode: code,
    });
    return marketplaceError(code);
  }

  private async canSubmitFor(principal: AdminPrincipal, projectId: string): Promise<boolean> {
    if (!hasPermission(principal, 'airs_reports:submit')) return false;
    if (grantsGlobally(principal, 'airs_reports:submit')) return true;
    const project = await this.adminRepository.findProject(projectId);
    if (!project) return false;
    return this.adminRepository.actorHasScope(
      actorFromPrincipal(principal),
      principal.roles,
      project.enterpriseId,
      projectId,
      rolesWithPermission(principal, 'airs_reports:submit')
    );
  }

  async submit(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    input: SubmitAirsReportRequest
  ): Promise<SubmitAirsReportResponse> {
    const response = await this.repository.submit(
      projectId,
      input,
      actorFromPrincipal(principal),
      approverFrom(principal),
      requestId
    );
    await this.announce(response);
    return response;
  }

  listForProject(projectId: string, status?: AirsReportStatus): Promise<AirsReportRecord[]> {
    return this.repository.listForProject(projectId, status);
  }

  lookupRecipient(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    email: string
  ): Promise<AirsReportRecipientLookupResponse> {
    return this.repository.lookupRecipient(
      projectId,
      email,
      actorFromPrincipal(principal),
      requestId
    );
  }

  async reviewQueue(principal: AdminPrincipal, requestId: string): Promise<AirsReportRecord[]> {
    if (!(await this.repository.isApprover(approverFrom(principal))))
      await this.deny(principal, requestId, 'AIRS_REPORT_APPROVER_NOT_ALLOWED');
    return this.repository.listByStatus('pending_approval');
  }

  async detail(
    principal: AdminPrincipal,
    requestId: string,
    reportId: string
  ): Promise<AirsReportDetailResponse> {
    const report = await this.repository.find(reportId);
    if (!report) marketplaceError('AIRS_REPORT_NOT_FOUND');
    const allowed =
      (await this.repository.isApprover(approverFrom(principal))) ||
      (await this.canSubmitFor(principal, report.projectId));
    if (!allowed)
      await this.deny(principal, requestId, 'PROJECT_SCOPE_DENIED', reportId, report.projectId);
    const [recipientTotals, timeline, rewards] = await Promise.all([
      this.repository.recipientTotals(report.recipientEmail, report.submittedAt),
      this.history(() => this.repository.listTimeline(report.id)),
      this.history(() => this.repository.listRewards(report.id)),
    ]);
    return { report, recipientTotals, timeline, rewards };
  }

  async approve(
    principal: AdminPrincipal,
    requestId: string,
    reportId: string,
    snapshotHash: string
  ): Promise<AirsReportTransitionResponse> {
    const response = await this.repository.approve(
      reportId,
      snapshotHash,
      actorFromPrincipal(principal),
      approverFrom(principal),
      requestId
    );
    await this.announce(response);
    return response;
  }

  async reject(
    principal: AdminPrincipal,
    requestId: string,
    reportId: string,
    reason: string
  ): Promise<AirsReportTransitionResponse> {
    const response = await this.repository.reject(
      reportId,
      reason,
      actorFromPrincipal(principal),
      approverFrom(principal),
      requestId
    );
    await this.announce(response);
    return response;
  }

  cancel(
    principal: AdminPrincipal,
    requestId: string,
    reportId: string,
    reason: string
  ): Promise<AirsReportTransitionResponse> {
    return this.repository.cancel(reportId, reason, actorFromPrincipal(principal), requestId);
  }
}
