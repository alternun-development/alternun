import { Injectable } from '@nestjs/common';
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

@Injectable()
export class AirsReportService {
  constructor(
    private readonly repository: AirsReportRepository,
    private readonly adminRepository: MarketplaceAdminRepository
  ) {}

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

  submit(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    input: SubmitAirsReportRequest
  ): Promise<SubmitAirsReportResponse> {
    return this.repository.submit(projectId, input, actorFromPrincipal(principal), requestId);
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
    return {
      report,
      recipientTotals: await this.repository.recipientTotals(
        report.recipientEmail,
        report.submittedAt
      ),
    };
  }

  approve(
    principal: AdminPrincipal,
    requestId: string,
    reportId: string,
    snapshotHash: string
  ): Promise<AirsReportTransitionResponse> {
    return this.repository.approve(
      reportId,
      snapshotHash,
      actorFromPrincipal(principal),
      approverFrom(principal),
      requestId
    );
  }

  reject(
    principal: AdminPrincipal,
    requestId: string,
    reportId: string,
    reason: string
  ): Promise<AirsReportTransitionResponse> {
    return this.repository.reject(
      reportId,
      reason,
      actorFromPrincipal(principal),
      approverFrom(principal),
      requestId
    );
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
