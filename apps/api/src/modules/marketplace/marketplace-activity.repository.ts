/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError, marketplaceError } from './marketplace.errors';
import { MARKETPLACE_SUPABASE } from './marketplace.repository';
import type {
  ActivityContent,
  ActivityRepeatPeriod,
  ActivityStatus,
  AdminActor,
  AuditInput,
  ProjectActivityRecord,
} from './marketplace.types';

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => !!item && typeof item === 'object')
    : [];
}

function mapActivity(row: Row): ProjectActivityRecord {
  return {
    id: text(row.id),
    projectId: text(row.project_id),
    code: text(row.code),
    status: text(row.status) as ActivityStatus,
    defaultLocale: text(row.default_locale),
    content: record(row.content) as ActivityContent,
    defaultAirsAmount: Number(row.default_airs_amount),
    maxAirsPerAward: Number(row.max_airs_per_award),
    repeatPeriod: text(row.repeat_period) as ActivityRepeatPeriod,
    maxAwardsPerPeriod: Number(row.max_awards_per_period),
    maxAwardsLifetime: row.max_awards_lifetime == null ? null : Number(row.max_awards_lifetime),
    startsAt: nullableText(row.starts_at),
    endsAt: nullableText(row.ends_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function failDatabase(error: { code?: string } | null, conflictCode?: string): never {
  if (error?.code === '23505' && conflictCode) marketplaceError(conflictCode);
  throw new MarketplaceApiError('MARKETPLACE_UNAVAILABLE', 'Marketplace storage is unavailable.');
}

@Injectable()
export class MarketplaceActivityRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  private async audit(input: AuditInput): Promise<void> {
    const { error } = await this.client.from('admin_audit_log').insert({
      actor_issuer: input.actor?.issuer ?? null,
      actor_subject: input.actor?.subject ?? null,
      actor_roles: input.actor?.roles ?? [],
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      enterprise_id: input.enterpriseId ?? null,
      project_id: input.projectId ?? null,
      request_id: input.requestId ?? null,
      result: input.result,
      reason_code: input.reasonCode ?? null,
      before_state: input.beforeState ?? null,
      after_state: input.afterState ?? null,
      metadata: input.metadata ?? {},
    });
    if (error) failDatabase(error);
  }

  async list(projectId: string, publishedOnly = false): Promise<ProjectActivityRecord[]> {
    let query = this.client
      .from('project_activities')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (publishedOnly) query = query.eq('status', 'published');
    const { data, error } = await query;
    if (error) failDatabase(error);
    return rows(data).map(mapActivity);
  }

  async find(projectId: string, activityId: string): Promise<ProjectActivityRecord | null> {
    const { data, error } = await this.client
      .from('project_activities')
      .select('*')
      .eq('project_id', projectId)
      .eq('id', activityId)
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapActivity(data as Row) : null;
  }

  async create(
    projectId: string,
    input: object,
    actor: AdminActor,
    requestId: string
  ): Promise<ProjectActivityRecord> {
    const values = input as Row;
    const { data, error } = await this.client
      .from('project_activities')
      .insert({
        project_id: projectId,
        code: values.code,
        default_locale: values.defaultLocale,
        content: values.content,
        default_airs_amount: values.defaultAirsAmount,
        max_airs_per_award: values.maxAirsPerAward,
        repeat_period: values.repeatPeriod,
        max_awards_per_period: values.maxAwardsPerPeriod,
        max_awards_lifetime: values.maxAwardsLifetime ?? null,
        starts_at: values.startsAt ?? null,
        ends_at: values.endsAt ?? null,
        created_by_issuer: actor.issuer,
        created_by_subject: actor.subject,
        updated_by_issuer: actor.issuer,
        updated_by_subject: actor.subject,
      })
      .select('*')
      .single();
    if (error) failDatabase(error, 'ACTIVITY_CODE_CONFLICT');
    const activity = mapActivity(data as Row);
    await this.audit({
      actor,
      action: 'activity.created',
      targetType: 'project_activity',
      targetId: activity.id,
      projectId,
      requestId,
      result: 'allowed',
      afterState: record(data),
    });
    return activity;
  }

  async update(
    projectId: string,
    activityId: string,
    input: object,
    actor: AdminActor,
    requestId: string,
    before: ProjectActivityRecord
  ): Promise<ProjectActivityRecord> {
    const source = input as Row;
    const values: Row = {
      updated_by_issuer: actor.issuer,
      updated_by_subject: actor.subject,
    };
    for (const [camel, snake] of Object.entries({
      code: 'code',
      defaultLocale: 'default_locale',
      content: 'content',
      defaultAirsAmount: 'default_airs_amount',
      maxAirsPerAward: 'max_airs_per_award',
      repeatPeriod: 'repeat_period',
      maxAwardsPerPeriod: 'max_awards_per_period',
      maxAwardsLifetime: 'max_awards_lifetime',
      startsAt: 'starts_at',
      endsAt: 'ends_at',
    })) {
      if (camel in source) values[snake] = source[camel];
    }
    const { data, error } = await this.client
      .from('project_activities')
      .update(values)
      .eq('project_id', projectId)
      .eq('id', activityId)
      .select('*')
      .maybeSingle();
    if (error) failDatabase(error, 'ACTIVITY_CODE_CONFLICT');
    if (!data) marketplaceError('ACTIVITY_NOT_FOUND');
    const activity = mapActivity(data as Row);
    await this.audit({
      actor,
      action: 'activity.updated',
      targetType: 'project_activity',
      targetId: activityId,
      projectId,
      requestId,
      result: 'allowed',
      beforeState: before as unknown as Row,
      afterState: record(data),
    });
    return activity;
  }

  async setStatus(
    projectId: string,
    activityId: string,
    status: 'published' | 'paused',
    actor: AdminActor,
    requestId: string,
    before: ProjectActivityRecord,
    reason?: string
  ): Promise<ProjectActivityRecord> {
    const { data, error } = await this.client
      .from('project_activities')
      .update({
        status,
        updated_by_issuer: actor.issuer,
        updated_by_subject: actor.subject,
      })
      .eq('project_id', projectId)
      .eq('id', activityId)
      .select('*')
      .maybeSingle();
    if (error) failDatabase(error);
    if (!data) marketplaceError('ACTIVITY_NOT_FOUND');
    const activity = mapActivity(data as Row);
    await this.audit({
      actor,
      action: status === 'published' ? 'activity.published' : 'activity.paused',
      targetType: 'project_activity',
      targetId: activityId,
      projectId,
      requestId,
      result: 'allowed',
      beforeState: before as unknown as Row,
      afterState: record(data),
      metadata: reason ? { reason } : {},
    });
    return activity;
  }
}
