import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { Injectable } from '@nestjs/common';
import {
  grantsGlobally,
  hasPermission,
  rolesWithPermission,
  type AdminPermission,
  type AdminPrincipal,
} from '../../common/admin-auth/admin-auth.guard';
import type {
  ApproveActivityCompletionDto,
  CreateActivityCompletionDto,
  CreateProjectActivityDto,
  RejectActivityCompletionDto,
  ReverseActivityCompletionDto,
  UpdateProjectActivityDto,
} from './marketplace.dto';
import { marketplaceError } from './marketplace.errors';
import { MarketplaceActivityRepository } from './marketplace-activity.repository';
import { MarketplaceParticipantRepository } from './marketplace-participant.repository';
import { MarketplaceAdminRepository, MarketplacePublicRepository } from './marketplace.repository';
import {
  actorFromPrincipal,
  type ActivityCompletionRecord,
  type ActivityContent,
  type ActivityContentBlock,
  type AirsAssignmentRecord,
  type ProjectActivityRecord,
  type ProjectRecord,
  type PublicProjectActivity,
} from './marketplace.types';

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

function isoWeek(date: Date): string {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  value.setUTCDate(value.getUTCDate() + 4 - (value.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((value.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${value.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function completionKeys(
  activity: ProjectActivityRecord,
  completedAt: Date,
  assignmentId: string | undefined,
  completionId: string
): { occurrenceKey: string; periodKey: string; assignmentKey: string | null } {
  if (activity.repeatPeriod === 'assignment') {
    if (!assignmentId) marketplaceError('VALIDATION_FAILED');
    const key = `assignment:${assignmentId}`;
    return { occurrenceKey: key, periodKey: key, assignmentKey: assignmentId };
  }
  if (assignmentId) marketplaceError('VALIDATION_FAILED');
  if (activity.repeatPeriod === 'none')
    return { occurrenceKey: 'once', periodKey: 'lifetime', assignmentKey: null };
  const periodKey =
    activity.repeatPeriod === 'day'
      ? completedAt.toISOString().slice(0, 10)
      : activity.repeatPeriod === 'week'
      ? isoWeek(completedAt)
      : completedAt.toISOString().slice(0, 7);
  return { occurrenceKey: `${periodKey}:${completionId}`, periodKey, assignmentKey: null };
}

function validateEvidenceUrl(value: string | undefined): void {
  if (!value) return;
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      parsed.port ||
      isIP(parsed.hostname)
    )
      marketplaceError('VALIDATION_FAILED');
  } catch (error) {
    if (error instanceof Error && error.name === 'MarketplaceApiError') throw error;
    marketplaceError('VALIDATION_FAILED');
  }
}

@Injectable()
export class MarketplaceActivityService {
  constructor(
    private readonly repository: MarketplaceActivityRepository,
    private readonly adminRepository: MarketplaceAdminRepository,
    private readonly publicRepository: MarketplacePublicRepository,
    private readonly participantRepository: MarketplaceParticipantRepository
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
    if (!grantsGlobally(principal, permission)) {
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
    const project = await this.authorizeProject(principal, 'activities:read', requestId, projectId);
    // The global moderator may not pause activities. Scoped roles need their own
    // membership here, because activities:read alone may come from a global role.
    if (!hasRole(principal, 'platform_owner', 'internal_admin')) {
      if (!hasRole(principal, 'partner_operator', 'sub_admin'))
        await this.deny(principal, requestId, projectId, 'PERMISSION_DENIED');
      const allowed = await this.adminRepository.actorHasScope(
        actorFromPrincipal(principal),
        principal.roles,
        project.enterpriseId,
        projectId,
        ['partner_operator', 'sub_admin']
      );
      if (!allowed) await this.deny(principal, requestId, projectId, 'PROJECT_SCOPE_DENIED');
    }
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

  async listCompletions(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    activityId: string
  ): Promise<ActivityCompletionRecord[]> {
    await this.authorizeProject(principal, 'completions:read', requestId, projectId);
    const activity = await this.repository.find(projectId, activityId);
    if (!activity) marketplaceError('ACTIVITY_NOT_FOUND');
    return this.repository.listCompletions(projectId, activityId);
  }

  async createCompletion(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    activityId: string,
    input: CreateActivityCompletionDto
  ): Promise<ActivityCompletionRecord> {
    await this.authorizeProject(principal, 'completions:create', requestId, projectId);
    const activity = await this.repository.find(projectId, activityId);
    if (!activity) marketplaceError('ACTIVITY_NOT_FOUND');
    if (!(await this.participantRepository.isActive(projectId, input.userId)))
      marketplaceError('PARTICIPANT_REQUIRED');
    validateEvidenceUrl(input.evidenceUrl);
    const completedAt = input.completedAt ? new Date(input.completedAt) : new Date();
    if (Number.isNaN(completedAt.getTime())) marketplaceError('VALIDATION_FAILED');
    const id = randomUUID();
    const keys = completionKeys(activity, completedAt, input.assignmentId, id);
    return this.repository.createCompletion(
      {
        id,
        projectId,
        activityId,
        userId: input.userId,
        ...keys,
        completedAt: completedAt.toISOString(),
        evidenceNote: input.evidenceNote,
        evidenceUrl: input.evidenceUrl,
      },
      actorFromPrincipal(principal),
      requestId
    );
  }

  async awardCompletion(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    completionId: string,
    input: ApproveActivityCompletionDto
  ): Promise<AirsAssignmentRecord> {
    await this.authorizeProject(principal, 'completions:award', requestId, projectId);
    const completion = await this.repository.findCompletion(projectId, completionId);
    if (!completion) marketplaceError('COMPLETION_NOT_FOUND');
    return this.repository.awardCompletion(
      completionId,
      actorFromPrincipal(principal),
      requestId,
      input.notes
    );
  }

  async rejectCompletion(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    completionId: string,
    input: RejectActivityCompletionDto
  ): Promise<ActivityCompletionRecord> {
    await this.authorizeProject(principal, 'completions:reject', requestId, projectId);
    const completion = await this.repository.findCompletion(projectId, completionId);
    if (!completion) marketplaceError('COMPLETION_NOT_FOUND');
    if (completion.status !== 'pending') marketplaceError('COMPLETION_STATUS_INVALID');
    return this.repository.rejectCompletion(
      completion,
      actorFromPrincipal(principal),
      requestId,
      input.notes
    );
  }

  async reverseCompletion(
    principal: AdminPrincipal,
    requestId: string,
    projectId: string,
    completionId: string,
    input: ReverseActivityCompletionDto
  ): Promise<AirsAssignmentRecord> {
    await this.authorizeProject(principal, 'completions:reverse', requestId, projectId);
    if (!hasRole(principal, 'platform_owner'))
      await this.deny(principal, requestId, projectId, 'PERMISSION_DENIED');
    const completion = await this.repository.findCompletion(projectId, completionId);
    if (!completion) marketplaceError('COMPLETION_NOT_FOUND');
    return this.repository.reverseCompletion(
      completionId,
      actorFromPrincipal(principal),
      requestId,
      input.reason
    );
  }
}
