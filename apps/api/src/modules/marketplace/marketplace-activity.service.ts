import { Injectable } from '@nestjs/common';
import {
  hasPermission,
  rolesWithPermission,
  type AdminPermission,
  type AdminPrincipal,
} from '../../common/admin-auth/admin-auth.guard';
import type { CreateProjectActivityDto, UpdateProjectActivityDto } from './marketplace.dto';
import { marketplaceError } from './marketplace.errors';
import { MarketplaceActivityRepository } from './marketplace-activity.repository';
import { MarketplaceAdminRepository, MarketplacePublicRepository } from './marketplace.repository';
import {
  actorFromPrincipal,
  type ActivityContent,
  type ActivityContentBlock,
  type ProjectActivityRecord,
  type ProjectRecord,
  type PublicProjectActivity,
} from './marketplace.types';

const GLOBAL_ROLES = new Set(['platform_owner', 'internal_admin', 'moderator']);

function isGlobal(principal: AdminPrincipal): boolean {
  return principal.roles.some((role) => GLOBAL_ROLES.has(role));
}

function hasRole(principal: AdminPrincipal, ...roles: string[]): boolean {
  return principal.roles.some((role) => roles.includes(role));
}

function resolveLocale(
  content: ActivityContent,
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
    const match = available.find((locale) => locale === base || locale.startsWith(`${base}-`));
    if (match) return match;
  }
  return fallback;
}

function publicActivity(
  activity: ProjectActivityRecord,
  requested?: string,
  acceptLanguage?: string
): PublicProjectActivity {
  const locale = resolveLocale(activity.content, requested, acceptLanguage, activity.defaultLocale);
  const localized = activity.content[locale];
  return {
    id: activity.id,
    projectId: activity.projectId,
    code: activity.code,
    status: 'published',
    locale,
    availableLocales: Object.keys(activity.content).sort(),
    title: localized.title,
    description: localized.description,
    startsAt: activity.startsAt,
    endsAt: activity.endsAt,
    updatedAt: activity.updatedAt,
  };
}

function validateActivityContent(content: ActivityContent, defaultLocale: string): void {
  const localePattern = /^[a-z]{2}(?:-[A-Z]{2})?$/;
  const blocks = Object.entries(content ?? {});
  if (!blocks.length || !content[defaultLocale]) marketplaceError('DEFAULT_TRANSLATION_REQUIRED');
  for (const [locale, value] of blocks) {
    const block = value as ActivityContentBlock | null;
    if (!localePattern.test(locale) || !block || typeof block !== 'object')
      marketplaceError('INVALID_LOCALE');
    if (
      typeof block.title !== 'string' ||
      block.title.trim().length < 1 ||
      block.title.length > 160 ||
      typeof block.description !== 'string' ||
      block.description.trim().length < 1 ||
      block.description.length > 4000
    )
      marketplaceError('DEFAULT_TRANSLATION_REQUIRED');
  }
}

function validateActivityInput(input: CreateProjectActivityDto | UpdateProjectActivityDto): void {
  if (
    !input ||
    typeof input !== 'object' ||
    Object.keys(input).length === 0 ||
    Object.values(input).some((value) => value === null)
  )
    marketplaceError('VALIDATION_FAILED');
  if ([input.content, input.defaultLocale].some((value) => value !== undefined)) {
    if (!input.content || !input.defaultLocale) return;
    validateActivityContent(input.content as ActivityContent, input.defaultLocale);
  }
  if (
    input.defaultAirsAmount != null &&
    input.maxAirsPerAward != null &&
    input.defaultAirsAmount > input.maxAirsPerAward
  )
    marketplaceError('AIRS_AMOUNT_OUT_OF_RANGE');
  if (input.startsAt && input.endsAt && Date.parse(input.startsAt) >= Date.parse(input.endsAt))
    marketplaceError('VALIDATION_FAILED');
}

@Injectable()
export class MarketplaceActivityService {
  constructor(
    private readonly repository: MarketplaceActivityRepository,
    private readonly adminRepository: MarketplaceAdminRepository,
    private readonly publicRepository: MarketplacePublicRepository
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
      targetType: 'project_activity',
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
  ): Promise<ProjectRecord> {
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
    return project;
  }

  async listPublished(
    slug: string,
    locale?: string,
    acceptLanguage?: string
  ): Promise<PublicProjectActivity[]> {
    const published = await this.publicRepository.findPublishedBySlug(slug);
    if (!published) marketplaceError('PROJECT_NOT_FOUND');
    const activities = await this.repository.list(published.project.id, true);
    return activities
      .filter((activity) => activity.status === 'published')
      .map((activity) => publicActivity(activity, locale, acceptLanguage));
  }

  async list(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string
  ): Promise<ProjectActivityRecord[]> {
    await this.authorizeProject(principal, 'activities:read', requestId, projectId);
    return this.repository.list(projectId);
  }

  async get(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    activityId: string
  ): Promise<ProjectActivityRecord> {
    await this.authorizeProject(principal, 'activities:read', requestId, projectId);
    const activity = await this.repository.find(projectId, activityId);
    if (!activity) marketplaceError('ACTIVITY_NOT_FOUND');
    return activity;
  }

  async create(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    input: CreateProjectActivityDto
  ): Promise<ProjectActivityRecord> {
    await this.authorizeProject(principal, 'activities:write', requestId, projectId);
    if (!hasRole(principal, 'platform_owner', 'internal_admin', 'partner_operator'))
      await this.deny(principal, requestId, projectId, 'PERMISSION_DENIED');
    validateActivityInput(input);
    validateActivityContent(input.content as ActivityContent, input.defaultLocale);
    return this.repository.create(projectId, input, actorFromPrincipal(principal), requestId);
  }

  async update(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    activityId: string,
    input: UpdateProjectActivityDto
  ): Promise<ProjectActivityRecord> {
    await this.authorizeProject(principal, 'activities:write', requestId, projectId);
    const before = await this.repository.find(projectId, activityId);
    if (!before) marketplaceError('ACTIVITY_NOT_FOUND');
    if (
      hasRole(principal, 'sub_admin') &&
      Object.keys(input).some((field) => !['content', 'defaultLocale'].includes(field))
    )
      await this.deny(principal, requestId, projectId, 'PROTECTED_FIELD_WRITE_DENIED');
    validateActivityInput(input);
    const content = (input.content as ActivityContent | undefined) ?? before.content;
    const defaultLocale = input.defaultLocale ?? before.defaultLocale;
    validateActivityContent(content, defaultLocale);
    const defaultAmount = input.defaultAirsAmount ?? before.defaultAirsAmount;
    const maximumAmount = input.maxAirsPerAward ?? before.maxAirsPerAward;
    if (defaultAmount > maximumAmount) marketplaceError('AIRS_AMOUNT_OUT_OF_RANGE');
    const startsAt = input.startsAt ?? before.startsAt;
    const endsAt = input.endsAt ?? before.endsAt;
    if (startsAt && endsAt && Date.parse(startsAt) >= Date.parse(endsAt))
      marketplaceError('VALIDATION_FAILED');
    return this.repository.update(
      projectId,
      activityId,
      input,
      actorFromPrincipal(principal),
      requestId,
      before
    );
  }

  async publish(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    activityId: string,
    reason?: string
  ): Promise<ProjectActivityRecord> {
    await this.authorizeProject(principal, 'activities:publish', requestId, projectId);
    const before = await this.repository.find(projectId, activityId);
    if (!before) marketplaceError('ACTIVITY_NOT_FOUND');
    if (!['draft', 'paused', 'published'].includes(before.status))
      marketplaceError('ACTIVITY_STATUS_TRANSITION_INVALID');
    if (before.status === 'published') return before;
    return this.repository.setStatus(
      projectId,
      activityId,
      'published',
      actorFromPrincipal(principal),
      requestId,
      before,
      reason
    );
  }

  async pause(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    activityId: string,
    reason?: string
  ): Promise<ProjectActivityRecord> {
    await this.authorizeProject(principal, 'activities:read', requestId, projectId);
    if (
      !hasRole(
        principal,
        'platform_owner',
        'internal_admin',
        'moderator',
        'partner_operator',
        'sub_admin'
      )
    )
      await this.deny(principal, requestId, projectId, 'PERMISSION_DENIED');
    const before = await this.repository.find(projectId, activityId);
    if (!before) marketplaceError('ACTIVITY_NOT_FOUND');
    if (!['published', 'paused'].includes(before.status))
      marketplaceError('ACTIVITY_STATUS_TRANSITION_INVALID');
    if (before.status === 'paused') return before;
    return this.repository.setStatus(
      projectId,
      activityId,
      'paused',
      actorFromPrincipal(principal),
      requestId,
      before,
      reason
    );
  }
}
