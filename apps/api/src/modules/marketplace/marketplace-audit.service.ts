import { Injectable } from '@nestjs/common';
import {
  hasPermission,
  rolesWithPermission,
  type AdminPrincipal,
} from '../../common/admin-auth/admin-auth.guard';
import {
  MarketplaceAuditRepository,
  type AuditFilters,
  type AuditPage,
  type AuditResult,
} from './marketplace-audit.repository';
import { marketplaceError } from './marketplace.errors';
import { MarketplaceAdminRepository } from './marketplace.repository';
import { actorFromPrincipal } from './marketplace.types';

export interface AuditQueryInput {
  action?: string;
  result?: AuditResult;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}

function isGlobal(principal: AdminPrincipal): boolean {
  return principal.roles.some((role) =>
    ['platform_owner', 'internal_admin', 'moderator'].includes(role)
  );
}

function normalizeFilters(input: AuditQueryInput): AuditFilters {
  const page = Math.max(1, Number.isInteger(input.page) ? (input.page as number) : 1);
  const perPage = Math.min(
    50,
    Math.max(1, Number.isInteger(input.perPage) ? (input.perPage as number) : 20)
  );
  const action = input.action?.trim();
  if (input.from && input.to && Date.parse(input.from) > Date.parse(input.to)) {
    marketplaceError('VALIDATION_FAILED');
  }
  return {
    ...(action ? { action } : {}),
    ...(input.result ? { result: input.result } : {}),
    ...(input.from ? { from: input.from } : {}),
    ...(input.to ? { to: input.to } : {}),
    page,
    perPage,
  };
}

@Injectable()
export class MarketplaceAuditService {
  constructor(
    private readonly repository: MarketplaceAuditRepository,
    private readonly adminRepository: MarketplaceAdminRepository
  ) {}

  private async deny(
    principal: AdminPrincipal,
    requestId: string,
    code: string,
    enterpriseId?: string,
    projectId?: string
  ): Promise<never> {
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'authorization.denied',
      targetType: 'admin_audit',
      enterpriseId,
      projectId,
      requestId,
      result: 'denied',
      reasonCode: code,
    });
    return marketplaceError(code);
  }

  async listProject(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    input: AuditQueryInput
  ): Promise<AuditPage> {
    const project = await this.adminRepository.findProject(projectId);
    if (!project) marketplaceError('PROJECT_NOT_FOUND');
    if (!hasPermission(principal, 'audit:read')) {
      await this.deny(principal, requestId, 'PERMISSION_DENIED', project.enterpriseId, projectId);
    }
    if (!isGlobal(principal)) {
      const allowed = await this.adminRepository.actorHasScope(
        actorFromPrincipal(principal),
        principal.roles,
        project.enterpriseId,
        projectId,
        rolesWithPermission(principal, 'audit:read')
      );
      if (!allowed) {
        await this.deny(
          principal,
          requestId,
          'PROJECT_SCOPE_DENIED',
          project.enterpriseId,
          projectId
        );
      }
    }
    return this.repository.listProject(projectId, project.enterpriseId, normalizeFilters(input));
  }

  async listEnterprise(
    principal: AdminPrincipal,
    requestId: string,
    enterpriseId: string,
    input: AuditQueryInput
  ): Promise<AuditPage> {
    const enterprise = await this.adminRepository.findEnterprise(enterpriseId);
    if (!enterprise) marketplaceError('ENTERPRISE_NOT_FOUND');
    if (!hasPermission(principal, 'audit:read') || !isGlobal(principal)) {
      await this.deny(principal, requestId, 'PERMISSION_DENIED', enterpriseId);
    }
    return this.repository.listEnterprise(enterpriseId, normalizeFilters(input));
  }
}
