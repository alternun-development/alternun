import { Injectable } from '@nestjs/common';
import {
  hasPermission,
  rolesWithPermission,
  type AdminPermission,
  type AdminPrincipal,
} from '../../common/admin-auth/admin-auth.guard';
import { marketplaceError } from './marketplace.errors';
import {
  MarketplaceParticipantRepository,
  type ParticipantHistoryRecord,
  type ProjectParticipantRecord,
  type ProjectParticipantStatus,
} from './marketplace-participant.repository';
import { MarketplaceAdminRepository } from './marketplace.repository';
import { actorFromPrincipal } from './marketplace.types';

function isGlobal(principal: AdminPrincipal): boolean {
  return principal.roles.some((role) => ['platform_owner', 'internal_admin'].includes(role));
}

@Injectable()
export class MarketplaceParticipantService {
  constructor(
    private readonly repository: MarketplaceParticipantRepository,
    private readonly adminRepository: MarketplaceAdminRepository
  ) {}

  private async deny(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    code: string
  ): Promise<never> {
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'authorization.denied',
      targetType: 'project_participant',
      projectId,
      requestId,
      result: 'denied',
      reasonCode: code,
    });
    return marketplaceError(code);
  }

  private async authorizeProject(
    principal: AdminPrincipal,
    permission: AdminPermission,
    requestId: string,
    projectId: string
  ): Promise<void> {
    const project = await this.adminRepository.findProject(projectId);
    if (!project) marketplaceError('PROJECT_NOT_FOUND');
    if (!hasPermission(principal, permission))
      await this.deny(principal, requestId, projectId, 'PERMISSION_DENIED');
    if (!isGlobal(principal)) {
      const allowed = await this.adminRepository.actorHasScope(
        actorFromPrincipal(principal),
        principal.roles,
        project.enterpriseId,
        projectId,
        rolesWithPermission(principal, permission)
      );
      if (!allowed) await this.deny(principal, requestId, projectId, 'PROJECT_SCOPE_DENIED');
    }
  }

  async list(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    status?: ProjectParticipantStatus
  ): Promise<ProjectParticipantRecord[]> {
    await this.authorizeProject(principal, 'participants:read', requestId, projectId);
    return this.repository.list(projectId, status);
  }

  async add(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    email: string
  ): Promise<ProjectParticipantRecord> {
    await this.authorizeProject(principal, 'participants:manage', requestId, projectId);
    const cleanEmail = email.trim();
    if (!cleanEmail) marketplaceError('PARTICIPANT_INPUT_INVALID');
    return this.repository.add(projectId, cleanEmail, actorFromPrincipal(principal), requestId);
  }

  async remove(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    participantId: string,
    reason: string
  ): Promise<{ id: string; status: ProjectParticipantStatus; removedAt: string | null }> {
    await this.authorizeProject(principal, 'participants:manage', requestId, projectId);
    const participant = await this.repository.find(projectId, participantId);
    if (!participant) marketplaceError('PARTICIPANT_NOT_FOUND');
    const cleanReason = reason.trim();
    if (!cleanReason) marketplaceError('PARTICIPANT_REASON_REQUIRED');
    return this.repository.remove(
      participantId,
      actorFromPrincipal(principal),
      requestId,
      cleanReason
    );
  }

  async history(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    participantId: string
  ): Promise<ParticipantHistoryRecord[]> {
    await this.authorizeProject(principal, 'participants:read', requestId, projectId);
    const participant = await this.repository.find(projectId, participantId);
    if (!participant) marketplaceError('PARTICIPANT_NOT_FOUND');
    return this.repository.history(projectId, String(participant.user_id));
  }
}
