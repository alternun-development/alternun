import { Injectable } from '@nestjs/common';
import { isIP } from 'node:net';
import {
  grantsGlobally,
  hasPermission,
  rolesWithPermission,
  type AdminPrincipal,
} from '../../common/admin-auth/admin-auth.guard';
import { marketplaceError } from './marketplace.errors';
import { MarketplaceAdminRepository } from './marketplace.repository';
import { actorFromPrincipal } from './marketplace.types';
import { MedalRepository } from './medal.repository';
import type {
  CreateProjectMedalInput,
  ProjectMedalRecord,
  UpdateProjectMedalInput,
} from './medal.types';

const NAME_MAX = 80;
const DESCRIPTION_MAX = 300;

/** The art must be an https image on a host already allowed for project images. */
export async function validateMedalImageUrl(
  value: string,
  allowedHosts: () => Promise<readonly string[]>
): Promise<void> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return marketplaceError('MEDIA_URL_INVALID');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    isIP(url.hostname) !== 0 ||
    (url.port && url.port !== '443') ||
    value.length > 2048
  ) {
    marketplaceError('MEDIA_URL_INVALID');
  }
  const hosts = await allowedHosts();
  if (!hosts.includes(url.hostname.toLowerCase())) marketplaceError('MEDIA_HOST_NOT_ALLOWED');
}

function checkText(name: string | undefined, description: string | null | undefined): void {
  if (name !== undefined && (name.trim().length < 1 || name.trim().length > NAME_MAX)) {
    marketplaceError('MEDAL_INPUT_INVALID');
  }
  if (description !== undefined && description !== null && description.length > DESCRIPTION_MAX) {
    marketplaceError('MEDAL_INPUT_INVALID');
  }
}

@Injectable()
export class MedalService {
  constructor(
    private readonly repository: MedalRepository,
    private readonly adminRepository: MarketplaceAdminRepository
  ) {}

  private async deny(
    principal: AdminPrincipal,
    requestId: string,
    code: string,
    projectId: string
  ): Promise<never> {
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'authorization.denied',
      targetType: 'project_medal',
      projectId,
      requestId,
      result: 'denied',
      reasonCode: code,
    });
    return marketplaceError(code);
  }

  /** Whoever can report Airs for the project may see its medals; Super Admins can also manage them. */
  private async requireReader(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string
  ): Promise<void> {
    const project = await this.adminRepository.findProject(projectId);
    if (!project) marketplaceError('PROJECT_NOT_FOUND');
    if (!hasPermission(principal, 'airs_reports:submit')) {
      await this.deny(principal, requestId, 'PERMISSION_DENIED', projectId);
    }
    if (grantsGlobally(principal, 'airs_reports:submit')) return;
    const allowed = await this.adminRepository.actorHasScope(
      actorFromPrincipal(principal),
      principal.roles,
      project.enterpriseId,
      projectId,
      rolesWithPermission(principal, 'airs_reports:submit')
    );
    if (!allowed) await this.deny(principal, requestId, 'PROJECT_SCOPE_DENIED', projectId);
  }

  private async requireManager(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string
  ): Promise<void> {
    if (!hasPermission(principal, 'medals:manage')) {
      await this.deny(principal, requestId, 'PERMISSION_DENIED', projectId);
    }
    const project = await this.adminRepository.findProject(projectId);
    if (!project) marketplaceError('PROJECT_NOT_FOUND');
  }

  /** Managers see every medal of the project; the others only the ones they can pick. */
  async list(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string
  ): Promise<ProjectMedalRecord[]> {
    await this.requireReader(principal, requestId, projectId);
    return this.repository.list(projectId, !hasPermission(principal, 'medals:manage'));
  }

  async create(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    input: CreateProjectMedalInput
  ): Promise<ProjectMedalRecord> {
    await this.requireManager(principal, requestId, projectId);
    checkText(input.name, input.description);
    await validateMedalImageUrl(input.imageUrl, () =>
      this.adminRepository.allowedHosts('gallery_image')
    );
    const created = await this.repository.create(
      projectId,
      { ...input, name: input.name.trim() },
      actorFromPrincipal(principal)
    );
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'project_medal.created',
      targetType: 'project_medal',
      targetId: created.id,
      projectId,
      requestId,
      result: 'allowed',
      afterState: { ...created },
    });
    return created;
  }

  async update(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    medalId: string,
    input: UpdateProjectMedalInput
  ): Promise<ProjectMedalRecord> {
    await this.requireManager(principal, requestId, projectId);
    if (Object.values(input).every((value) => value === undefined)) {
      marketplaceError('MEDAL_INPUT_INVALID');
    }
    checkText(input.name, input.description);
    if (input.imageUrl !== undefined) {
      await validateMedalImageUrl(input.imageUrl, () =>
        this.adminRepository.allowedHosts('gallery_image')
      );
    }
    const before = await this.repository.find(projectId, medalId);
    if (!before) marketplaceError('MEDAL_NOT_FOUND');
    const updated = await this.repository.update(projectId, medalId, {
      ...input,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    });
    if (!updated) marketplaceError('MEDAL_NOT_FOUND');
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'project_medal.updated',
      targetType: 'project_medal',
      targetId: medalId,
      projectId,
      requestId,
      result: 'allowed',
      beforeState: { ...before },
      afterState: { ...updated },
    });
    return updated;
  }
}
