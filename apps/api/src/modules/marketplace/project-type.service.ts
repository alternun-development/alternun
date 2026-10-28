import { Injectable } from '@nestjs/common';
import { hasPermission, type AdminPrincipal } from '../../common/admin-auth/admin-auth.guard';
import { marketplaceError } from './marketplace.errors';
import { MarketplaceAdminRepository } from './marketplace.repository';
import { actorFromPrincipal } from './marketplace.types';
import { ProjectTypeRepository } from './project-type.repository';
import type {
  CreateProjectTypeInput,
  ProjectTypeRecord,
  SetProjectTypeResponse,
  UpdateProjectTypeInput,
} from './project-type.types';

const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const CODE_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;
const LABEL_MAX = 120;

/** Labels are a map of locale to name; English is mandatory so every screen has a fallback. */
export function validateProjectTypeLabels(labels: unknown, requireEnglish: boolean): void {
  if (!labels || typeof labels !== 'object' || Array.isArray(labels)) {
    marketplaceError('PROJECT_TYPE_INPUT_INVALID');
  }
  const entries = Object.entries(labels as Record<string, unknown>);
  if (entries.length === 0 || entries.length > 12) marketplaceError('PROJECT_TYPE_INPUT_INVALID');
  for (const [locale, label] of entries) {
    if (
      !LOCALE_PATTERN.test(locale) ||
      typeof label !== 'string' ||
      label.trim().length < 1 ||
      label.trim().length > LABEL_MAX
    ) {
      marketplaceError('PROJECT_TYPE_INPUT_INVALID');
    }
  }
  if (requireEnglish && typeof (labels as Record<string, unknown>).en !== 'string') {
    marketplaceError('PROJECT_TYPE_INPUT_INVALID');
  }
}

function trimmedLabels(labels: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(labels).map(([locale, label]) => [locale, label.trim()])
  );
}

@Injectable()
export class ProjectTypeService {
  constructor(
    private readonly repository: ProjectTypeRepository,
    private readonly adminRepository: MarketplaceAdminRepository
  ) {}

  private async deny(
    principal: AdminPrincipal,
    requestId: string,
    action: string,
    metadata: Record<string, unknown> = {}
  ): Promise<never> {
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'authorization.denied',
      targetType: 'project_type',
      requestId,
      result: 'denied',
      reasonCode: 'PERMISSION_DENIED',
      metadata: { attempted: action, ...metadata },
    });
    return marketplaceError('PERMISSION_DENIED');
  }

  private async requireManage(
    principal: AdminPrincipal,
    requestId: string,
    action: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!hasPermission(principal, 'project_types:manage')) {
      await this.deny(principal, requestId, action, metadata);
    }
  }

  async list(principal: AdminPrincipal, requestId: string): Promise<ProjectTypeRecord[]> {
    if (!hasPermission(principal, 'project_types:read')) {
      await this.deny(principal, requestId, 'list');
    }
    return this.repository.list();
  }

  async create(
    principal: AdminPrincipal,
    requestId: string,
    input: CreateProjectTypeInput
  ): Promise<ProjectTypeRecord> {
    await this.requireManage(principal, requestId, 'create', { code: input.code });
    if (!CODE_PATTERN.test(input.code)) marketplaceError('PROJECT_TYPE_INPUT_INVALID');
    validateProjectTypeLabels(input.labels, true);
    const created = await this.repository.create({
      ...input,
      labels: trimmedLabels(input.labels),
    });
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'project_type.created',
      targetType: 'project_type',
      requestId,
      result: 'allowed',
      afterState: { ...created },
      metadata: { code: created.code },
    });
    return created;
  }

  async update(
    principal: AdminPrincipal,
    requestId: string,
    code: string,
    input: UpdateProjectTypeInput
  ): Promise<ProjectTypeRecord> {
    await this.requireManage(principal, requestId, 'update', { code });
    if (
      input.labels === undefined &&
      input.requiresDocumentNumber === undefined &&
      input.isActive === undefined &&
      input.sortOrder === undefined
    ) {
      marketplaceError('PROJECT_TYPE_INPUT_INVALID');
    }
    if (input.labels !== undefined) validateProjectTypeLabels(input.labels, true);
    const before = await this.repository.find(code);
    if (!before) marketplaceError('PROJECT_TYPE_NOT_FOUND');
    const updated = await this.repository.update(code, {
      ...input,
      ...(input.labels ? { labels: trimmedLabels(input.labels) } : {}),
    });
    if (!updated) marketplaceError('PROJECT_TYPE_NOT_FOUND');
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'project_type.updated',
      targetType: 'project_type',
      requestId,
      result: 'allowed',
      beforeState: { ...before },
      afterState: { ...updated },
      metadata: { code },
    });
    return updated;
  }

  /** Gives a project its type (or clears it). Only an active type can be assigned. */
  async setProjectType(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    code: string | null
  ): Promise<SetProjectTypeResponse> {
    await this.requireManage(principal, requestId, 'set_project_type', { projectId });
    const project = await this.adminRepository.findProject(projectId);
    if (!project) marketplaceError('PROJECT_NOT_FOUND');
    let requiresDocumentNumber = true;
    if (code !== null) {
      const type = await this.repository.find(code);
      if (!type) marketplaceError('PROJECT_TYPE_NOT_FOUND');
      if (!type.isActive) marketplaceError('PROJECT_TYPE_INACTIVE');
      requiresDocumentNumber = type.requiresDocumentNumber;
    }
    if (!(await this.repository.setProjectType(projectId, code))) {
      marketplaceError('PROJECT_NOT_FOUND');
    }
    await this.adminRepository.audit({
      actor: actorFromPrincipal(principal),
      action: 'project.type_set',
      targetType: 'project',
      targetId: projectId,
      enterpriseId: project.enterpriseId,
      projectId,
      requestId,
      result: 'allowed',
      beforeState: { projectTypeCode: project.projectTypeCode ?? null },
      afterState: { projectTypeCode: code },
    });
    return { projectId, projectTypeCode: code, requiresDocumentNumber };
  }
}
