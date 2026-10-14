import { isIP } from 'node:net';
import { Injectable } from '@nestjs/common';
import {
  hasPermission,
  type AdminPermission,
  type AdminPrincipal,
} from '../../common/admin-auth/admin-auth.guard';
import type {
  CreateEnterpriseDto,
  CreateProjectDto,
  CreateProjectMediaDto,
  ReorderProjectMediaDto,
  UpdateEnterpriseDto,
  UpdateProjectDto,
  UpdateProjectMediaDto,
} from './marketplace.dto';
import { marketplaceError } from './marketplace.errors';
import { MarketplaceAdminRepository, MarketplacePublicRepository } from './marketplace.repository';
import {
  actorFromPrincipal,
  type EnterpriseRecord,
  type ProjectContent,
  type ProjectContentBlock,
  type ProjectMediaRecord,
  type ProjectRecord,
  type ProjectStatus,
  type PublicProject,
} from './marketplace.types';

function isGlobal(principal: AdminPrincipal): boolean {
  return principal.roles.some((role) =>
    ['platform_owner', 'internal_admin', 'moderator'].includes(role)
  );
}

function hasRole(principal: AdminPrincipal, ...roles: string[]): boolean {
  return principal.roles.some((role) => roles.includes(role));
}

function scopedEnterpriseIds(principal: AdminPrincipal): readonly string[] | undefined {
  return isGlobal(principal) || principal.organizationIds.includes('*')
    ? undefined
    : principal.organizationIds;
}

function resolveLocale(
  content: ProjectContent,
  requested: string | undefined,
  acceptLanguage: string | undefined,
  fallback: string
): string {
  const available = Object.keys(content);
  const candidates = [
    requested,
    ...(acceptLanguage ?? '').split(',').map((part) => part.split(';')[0]?.trim()),
    fallback,
  ].filter((value): value is string => !!value);
  for (const candidate of candidates) {
    if (content[candidate]) return candidate;
    const base = candidate.split('-')[0];
    const matching = available.find((locale) => locale === base || locale.startsWith(`${base}-`));
    if (matching) return matching;
  }
  return fallback;
}

function publicProject(
  project: ProjectRecord,
  enterprise: EnterpriseRecord,
  media: ProjectMediaRecord[],
  requested?: string,
  acceptLanguage?: string
): PublicProject {
  const locale = resolveLocale(project.content, requested, acceptLanguage, project.defaultLocale);
  const localized = project.content[locale];
  return {
    id: project.id,
    slug: project.slug,
    status: 'published',
    categoryCode: project.categoryCode,
    locale,
    availableLocales: Object.keys(project.content).sort(),
    title: localized.title,
    location: localized.location,
    theme: localized.theme,
    description: localized.description,
    ...(localized.participationCopy === undefined
      ? {}
      : { participationCopy: localized.participationCopy }),
    ...(localized.ctaLabel === undefined ? {} : { ctaLabel: localized.ctaLabel }),
    waysToContribute: localized.waysToContribute,
    enterprise: {
      id: enterprise.id,
      slug: enterprise.slug,
      displayName: enterprise.displayName,
      countryCode: enterprise.countryCode,
      websiteUrl: enterprise.websiteUrl,
    },
    media: media.filter((item) => item.isActive),
    firstPublishedAt: project.firstPublishedAt ?? project.publishedAt ?? '',
    updatedAt: project.updatedAt,
  };
}

function validateContent(content: ProjectContent, defaultLocale: string): void {
  const localePattern = /^[a-z]{2}(?:-[A-Z]{2})?$/;
  const blocks = Object.entries(content ?? {});
  if (!blocks.length || !content[defaultLocale]) marketplaceError('DEFAULT_TRANSLATION_REQUIRED');
  for (const [locale, value] of blocks) {
    const block = value as ProjectContentBlock | null;
    if (!localePattern.test(locale) || !block || typeof block !== 'object')
      marketplaceError('INVALID_LOCALE');
    const required: Array<[unknown, number]> = [
      [block.title, 120],
      [block.location, 120],
      [block.theme, 120],
      [block.description, 4000],
    ];
    if (
      required.some(
        ([value, max]) => typeof value !== 'string' || value.trim().length < 1 || value.length > max
      )
    )
      marketplaceError('DEFAULT_TRANSLATION_REQUIRED');
    if (
      !Array.isArray(block.waysToContribute) ||
      block.waysToContribute.length < 1 ||
      block.waysToContribute.length > 8 ||
      block.waysToContribute.some(
        (item) => typeof item !== 'string' || item.trim().length < 1 || item.length > 160
      )
    )
      marketplaceError('DEFAULT_TRANSLATION_REQUIRED');
    if (
      block.participationCopy != null &&
      (typeof block.participationCopy !== 'string' || block.participationCopy.length > 2000)
    )
      marketplaceError('VALIDATION_FAILED');
    if (
      block.ctaLabel != null &&
      (typeof block.ctaLabel !== 'string' || block.ctaLabel.length > 80)
    )
      marketplaceError('VALIDATION_FAILED');
  }
}

function ensureMutationInput(input: unknown): void {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.values(input).some((value) => value === null)
  ) {
    marketplaceError('VALIDATION_FAILED');
  }
}

function validateTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format();
  } catch {
    marketplaceError('VALIDATION_FAILED');
  }
}

@Injectable()
export class MarketplacePublicService {
  constructor(private readonly repository: MarketplacePublicRepository) {}

  async list(
    locale?: string,
    acceptLanguage?: string,
    categoryCode?: string,
    page = 1,
    perPage = 20
  ): Promise<{ data: PublicProject[]; page: number; perPage: number; total: number }> {
    const rows = await this.repository.listPublished(categoryCode);
    const visible = rows
      .filter(({ project }) => project.status === 'published')
      .map(({ project, enterprise, media }) =>
        publicProject(project, enterprise, media, locale, acceptLanguage)
      );
    const start = (page - 1) * perPage;
    return { data: visible.slice(start, start + perPage), page, perPage, total: visible.length };
  }

  async findBySlug(slug: string, locale?: string, acceptLanguage?: string): Promise<PublicProject> {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 80) {
      marketplaceError('VALIDATION_FAILED');
    }
    const row = await this.repository.findPublishedBySlug(slug);
    if (!row || row.project.status !== 'published') marketplaceError('PROJECT_NOT_FOUND');
    return publicProject(row.project, row.enterprise, row.media, locale, acceptLanguage);
  }
}

@Injectable()
export class MarketplaceAdminService {
  constructor(private readonly repository: MarketplaceAdminRepository) {}

  private async deny(
    principal: AdminPrincipal,
    code: string,
    requestId: string,
    targetType: string,
    enterpriseId?: string,
    projectId?: string
  ): Promise<never> {
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'authorization.denied',
      targetType,
      enterpriseId,
      projectId,
      requestId,
      result: 'denied',
      reasonCode: code,
    });
    return marketplaceError(code);
  }

  private async authorize(
    principal: AdminPrincipal,
    permission: AdminPermission,
    requestId: string,
    targetType: string,
    enterpriseId?: string,
    projectId?: string
  ): Promise<void> {
    if (!hasPermission(principal, permission))
      await this.deny(
        principal,
        'PERMISSION_DENIED',
        requestId,
        targetType,
        enterpriseId,
        projectId
      );
    if (
      enterpriseId &&
      !isGlobal(principal) &&
      !principal.organizationIds.includes('*') &&
      !principal.organizationIds.includes(enterpriseId)
    ) {
      await this.deny(
        principal,
        projectId ? 'PROJECT_SCOPE_DENIED' : 'ENTERPRISE_SCOPE_DENIED',
        requestId,
        targetType,
        enterpriseId,
        projectId
      );
    }
  }

  async listEnterprises(principal: AdminPrincipal, requestId: string): Promise<EnterpriseRecord[]> {
    await this.authorize(principal, 'enterprises:read', requestId, 'enterprise');
    return this.repository.listEnterprises(scopedEnterpriseIds(principal));
  }

  async createEnterprise(
    principal: AdminPrincipal,
    requestId: string,
    input: CreateEnterpriseDto
  ): Promise<EnterpriseRecord> {
    ensureMutationInput(input);
    await this.authorize(principal, 'enterprises:create', requestId, 'enterprise');
    const created = await this.repository.createEnterprise(
      input as unknown as Record<string, unknown>,
      actorFromPrincipal(principal)
    );
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'enterprise.created',
      targetType: 'enterprise',
      targetId: created.id,
      enterpriseId: created.id,
      requestId,
      result: 'allowed',
      afterState: created as unknown as Record<string, unknown>,
    });
    return created;
  }

  async getEnterprise(
    principal: AdminPrincipal,
    requestId: string,
    id: string
  ): Promise<EnterpriseRecord> {
    const enterprise = await this.repository.findEnterprise(id);
    if (!enterprise) marketplaceError('ENTERPRISE_NOT_FOUND');
    await this.authorize(principal, 'enterprises:read', requestId, 'enterprise', enterprise.id);
    return enterprise;
  }

  async updateEnterprise(
    principal: AdminPrincipal,
    requestId: string,
    id: string,
    input: UpdateEnterpriseDto
  ): Promise<EnterpriseRecord> {
    ensureMutationInput(input);
    const before = await this.getEnterprise(principal, requestId, id);
    await this.authorize(principal, 'enterprises:update', requestId, 'enterprise', before.id);
    if ('legalName' in input && !hasRole(principal, 'platform_owner', 'internal_admin'))
      await this.deny(
        principal,
        'PROTECTED_FIELD_WRITE_DENIED',
        requestId,
        'enterprise',
        before.id
      );
    const after = await this.repository.updateEnterprise(
      id,
      input as unknown as Record<string, unknown>,
      actorFromPrincipal(principal)
    );
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'enterprise.updated',
      targetType: 'enterprise',
      targetId: id,
      enterpriseId: id,
      requestId,
      result: 'allowed',
      beforeState: before as unknown as Record<string, unknown>,
      afterState: after as unknown as Record<string, unknown>,
    });
    return after;
  }

  async listProjects(principal: AdminPrincipal, requestId: string): Promise<ProjectRecord[]> {
    await this.authorize(principal, 'projects:read', requestId, 'project');
    return this.repository.listProjects(scopedEnterpriseIds(principal));
  }

  async getProject(
    principal: AdminPrincipal,
    requestId: string,
    id: string
  ): Promise<ProjectRecord> {
    const project = await this.repository.findProject(id);
    if (!project) marketplaceError('PROJECT_NOT_FOUND');
    await this.authorize(
      principal,
      'projects:read',
      requestId,
      'project',
      project.enterpriseId,
      project.id
    );
    return project;
  }

  async createProject(
    principal: AdminPrincipal,
    requestId: string,
    input: CreateProjectDto
  ): Promise<ProjectRecord> {
    ensureMutationInput(input);
    const enterprise = await this.repository.findEnterprise(input.enterpriseId);
    if (!enterprise) marketplaceError('ENTERPRISE_NOT_FOUND');
    await this.authorize(principal, 'projects:create', requestId, 'project', enterprise.id);
    validateContent(input.content as ProjectContent, input.defaultLocale);
    validateTimeZone(input.timeZone);
    if (!(await this.repository.categoryExists(input.categoryCode)))
      marketplaceError('CATEGORY_UNSUPPORTED');
    const created = await this.repository.createProject(
      input as unknown as Record<string, unknown>,
      actorFromPrincipal(principal)
    );
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'project.created',
      targetType: 'project',
      targetId: created.id,
      enterpriseId: created.enterpriseId,
      projectId: created.id,
      requestId,
      result: 'allowed',
      afterState: created as unknown as Record<string, unknown>,
    });
    return created;
  }

  async updateProject(
    principal: AdminPrincipal,
    requestId: string,
    id: string,
    input: UpdateProjectDto
  ): Promise<ProjectRecord> {
    ensureMutationInput(input);
    const before = await this.getProject(principal, requestId, id);
    await this.authorize(
      principal,
      'projects:update',
      requestId,
      'project',
      before.enterpriseId,
      before.id
    );
    const contentOnly = Object.keys(input).every((key) => key === 'content');
    if (hasRole(principal, 'moderator', 'sub_admin') && !contentOnly)
      await this.deny(
        principal,
        'PROTECTED_FIELD_WRITE_DENIED',
        requestId,
        'project',
        before.enterpriseId,
        before.id
      );
    if (input.slug !== undefined && before.firstPublishedAt)
      await this.deny(
        principal,
        'PROJECT_SLUG_IMMUTABLE',
        requestId,
        'project',
        before.enterpriseId,
        before.id
      );
    const content = input.content ?? before.content;
    const defaultLocale = input.defaultLocale ?? before.defaultLocale;
    validateContent(content, defaultLocale);
    if (input.timeZone) validateTimeZone(input.timeZone);
    if (input.categoryCode && !(await this.repository.categoryExists(input.categoryCode)))
      marketplaceError('CATEGORY_UNSUPPORTED');
    const after = await this.repository.updateProject(
      id,
      input as unknown as Record<string, unknown>,
      actorFromPrincipal(principal)
    );
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'project.updated',
      targetType: 'project',
      targetId: id,
      enterpriseId: before.enterpriseId,
      projectId: id,
      requestId,
      result: 'allowed',
      beforeState: before as unknown as Record<string, unknown>,
      afterState: after as unknown as Record<string, unknown>,
    });
    return after;
  }

  async transition(
    principal: AdminPrincipal,
    requestId: string,
    id: string,
    target: ProjectStatus,
    reason?: string
  ): Promise<ProjectRecord> {
    const before = await this.getProject(principal, requestId, id);
    const permission: AdminPermission =
      target === 'published'
        ? 'projects:publish'
        : target === 'paused'
        ? 'projects:pause'
        : 'projects:archive';
    await this.authorize(
      principal,
      permission,
      requestId,
      'project',
      before.enterpriseId,
      before.id
    );
    const result = await this.repository.transitionProject(
      id,
      target,
      actorFromPrincipal(principal),
      requestId,
      reason
    );
    if (!result.ok) marketplaceError(result.reasonCode ?? 'PROJECT_STATUS_TRANSITION_INVALID');
    return (await this.repository.findProject(id)) ?? before;
  }

  async listMedia(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string
  ): Promise<ProjectMediaRecord[]> {
    const project = await this.getProject(principal, requestId, projectId);
    await this.authorize(
      principal,
      'project_media:read',
      requestId,
      'project_media',
      project.enterpriseId,
      project.id
    );
    return this.repository.listMedia(projectId);
  }

  private async validateMedia(
    project: ProjectRecord,
    input: Partial<CreateProjectMediaDto>
  ): Promise<void> {
    const kind = input.kind;
    if (
      !kind ||
      !['logo', 'cover', 'gallery_image', 'video', 'canva'].includes(kind) ||
      typeof input.url !== 'string' ||
      !input.url
    )
      marketplaceError('VALIDATION_FAILED');
    if (input.embedUrl && !['video', 'canva'].includes(kind)) marketplaceError('MEDIA_URL_INVALID');
    const hosts = await this.repository.allowedHosts(kind);
    for (const raw of [input.url, input.embedUrl].filter((value): value is string => !!value)) {
      let url: URL;
      try {
        url = new URL(raw);
      } catch {
        return marketplaceError('MEDIA_URL_INVALID');
      }
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        isIP(url.hostname) !== 0 ||
        (url.port && url.port !== '443')
      )
        marketplaceError('MEDIA_URL_INVALID');
      if (!hosts.includes(url.hostname.toLowerCase())) marketplaceError('MEDIA_HOST_NOT_ALLOWED');
    }
    if (['logo', 'cover', 'gallery_image'].includes(kind)) {
      const alt = input.altText?.[project.defaultLocale];
      if (typeof alt !== 'string' || !alt.trim() || alt.length > 240)
        marketplaceError('MEDIA_ALT_REQUIRED');
    }
    for (const value of Object.values(input.altText ?? {}))
      if (typeof value !== 'string' || !value.trim() || value.length > 240)
        marketplaceError('MEDIA_ALT_REQUIRED');
    for (const value of Object.values(input.caption ?? {}))
      if (typeof value !== 'string' || value.length > 500) marketplaceError('VALIDATION_FAILED');
  }

  async createMedia(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    input: CreateProjectMediaDto
  ): Promise<ProjectMediaRecord> {
    ensureMutationInput(input);
    const project = await this.getProject(principal, requestId, projectId);
    await this.authorize(
      principal,
      'project_media:write',
      requestId,
      'project_media',
      project.enterpriseId,
      project.id
    );
    await this.validateMedia(project, input);
    const created = await this.repository.createMedia(
      projectId,
      input as unknown as Record<string, unknown>,
      actorFromPrincipal(principal)
    );
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'project_media.created',
      targetType: 'project_media',
      targetId: created.id,
      enterpriseId: project.enterpriseId,
      projectId,
      requestId,
      result: 'allowed',
      afterState: created as unknown as Record<string, unknown>,
    });
    return created;
  }

  async updateMedia(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    mediaId: string,
    input: UpdateProjectMediaDto
  ): Promise<ProjectMediaRecord> {
    ensureMutationInput(input);
    const project = await this.getProject(principal, requestId, projectId);
    const before = await this.repository.findMedia(projectId, mediaId);
    if (!before) marketplaceError('MEDIA_NOT_FOUND');
    const retiringOnly =
      Object.keys(input).every((key) => key === 'isActive') && input.isActive === false;
    await this.authorize(
      principal,
      retiringOnly ? 'project_media:moderate' : 'project_media:write',
      requestId,
      'project_media',
      project.enterpriseId,
      project.id
    );
    await this.validateMedia(project, {
      ...before,
      embedUrl: before.embedUrl ?? undefined,
      ...input,
    });
    const after = await this.repository.updateMedia(
      projectId,
      mediaId,
      input as unknown as Record<string, unknown>,
      actorFromPrincipal(principal)
    );
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: retiringOnly ? 'project_media.retired' : 'project_media.updated',
      targetType: 'project_media',
      targetId: mediaId,
      enterpriseId: project.enterpriseId,
      projectId,
      requestId,
      result: 'allowed',
      beforeState: before as unknown as Record<string, unknown>,
      afterState: after as unknown as Record<string, unknown>,
    });
    return after;
  }

  async retireMedia(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    mediaId: string
  ): Promise<ProjectMediaRecord> {
    return this.updateMedia(principal, requestId, projectId, mediaId, { isActive: false });
  }

  async reorderMedia(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    input: ReorderProjectMediaDto
  ): Promise<ProjectMediaRecord[]> {
    ensureMutationInput(input);
    const project = await this.getProject(principal, requestId, projectId);
    await this.authorize(
      principal,
      'project_media:write',
      requestId,
      'project_media',
      project.enterpriseId,
      project.id
    );
    const after = await this.repository.reorderMedia(
      projectId,
      input.items,
      actorFromPrincipal(principal)
    );
    await this.repository.audit({
      actor: actorFromPrincipal(principal),
      action: 'project_media.reordered',
      targetType: 'project_media',
      enterpriseId: project.enterpriseId,
      projectId,
      requestId,
      result: 'allowed',
      metadata: { order: input.items },
    });
    return after;
  }
}
