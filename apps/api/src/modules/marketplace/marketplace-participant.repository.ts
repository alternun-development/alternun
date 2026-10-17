/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError, marketplaceError } from './marketplace.errors';
import { MARKETPLACE_SUPABASE } from './marketplace.repository';
import type { AdminActor } from './marketplace.types';

type Row = Record<string, unknown>;

export type ProjectParticipantStatus = 'active' | 'removed';

export interface ProjectParticipantRecord {
  id: string;
  projectId: string;
  userId: string;
  displayName: string;
  email: string;
  status: ProjectParticipantStatus;
  addedAt: string;
  removedAt: string | null;
  completedActivities: number;
  receivedAirs: number;
}

export interface ParticipantHistoryRecord {
  id: string;
  activityId: string;
  activity: string;
  status: 'pending' | 'awarded' | 'rejected' | 'reversed';
  awardedAirs: number | null;
  completedAt: string;
  awardedAt: string | null;
  rejectedAt: string | null;
  reversedAt: string | null;
}

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

function failDatabase(): never {
  throw new MarketplaceApiError('MARKETPLACE_UNAVAILABLE', 'Marketplace storage is unavailable.');
}

function displayName(user: Row): string {
  const name = text(user.name).trim();
  return name.length > 0 ? name : text(user.email).trim();
}

@Injectable()
export class MarketplaceParticipantRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  async list(
    projectId: string,
    status?: ProjectParticipantStatus
  ): Promise<ProjectParticipantRecord[]> {
    let participantQuery = this.client
      .from('project_participants')
      .select('id, project_id, user_id, status, added_at, removed_at')
      .eq('project_id', projectId)
      .order('added_at', { ascending: false });
    if (status) participantQuery = participantQuery.eq('status', status);
    const { data, error } = await participantQuery;
    if (error) failDatabase();
    const participants = rows(data);
    if (participants.length === 0) return [];

    const userIds = [...new Set(participants.map((item) => text(item.user_id)).filter(Boolean))];
    const [usersResult, completionsResult] = await Promise.all([
      this.client.from('users').select('id, name, email').in('id', userIds),
      this.client
        .from('project_activity_completions')
        .select('user_id, status, awarded_airs')
        .eq('project_id', projectId)
        .in('user_id', userIds),
    ]);
    if (usersResult.error ?? completionsResult.error) failDatabase();

    const users = new Map(rows(usersResult.data).map((item) => [text(item.id), item]));
    const awarded = new Map<string, { count: number; airs: number }>();
    for (const completion of rows(completionsResult.data)) {
      if (text(completion.status) !== 'awarded') continue;
      const userId = text(completion.user_id);
      const summary = awarded.get(userId) ?? { count: 0, airs: 0 };
      summary.count += 1;
      summary.airs += Number(completion.awarded_airs ?? 0);
      awarded.set(userId, summary);
    }

    return participants.map((participant) => {
      const userId = text(participant.user_id);
      const user = users.get(userId) ?? {};
      const summary = awarded.get(userId) ?? { count: 0, airs: 0 };
      return {
        id: text(participant.id),
        projectId: text(participant.project_id),
        userId,
        displayName: displayName(user),
        email: text(user.email),
        status: text(participant.status) as ProjectParticipantStatus,
        addedAt: text(participant.added_at),
        removedAt: nullableText(participant.removed_at),
        completedActivities: summary.count,
        receivedAirs: summary.airs,
      };
    });
  }

  async find(projectId: string, participantId: string): Promise<Row | null> {
    const { data, error } = await this.client
      .from('project_participants')
      .select('id, project_id, user_id, status, added_at, removed_at')
      .eq('project_id', projectId)
      .eq('id', participantId)
      .maybeSingle();
    if (error) failDatabase();
    return data ? (data as Row) : null;
  }

  async isActive(projectId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('project_participants')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (error) failDatabase();
    return !!data;
  }

  async add(
    projectId: string,
    email: string,
    actor: AdminActor,
    requestId: string
  ): Promise<ProjectParticipantRecord> {
    const { data, error } = await this.client.rpc('marketplace_add_project_participant', {
      p_project_id: projectId,
      p_user_email: email,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
    });
    if (error) failDatabase();
    const result = record(data);
    if (result.ok !== true)
      marketplaceError(text(result.reasonCode) || 'PARTICIPANT_INPUT_INVALID');
    const participant = record(result.participant);
    if (!text(participant.id)) failDatabase();
    return {
      id: text(participant.id),
      projectId,
      userId: text(participant.userId),
      displayName: text(participant.displayName),
      email: text(participant.email),
      status: text(participant.status) as ProjectParticipantStatus,
      addedAt: text(participant.addedAt),
      removedAt: nullableText(participant.removedAt),
      completedActivities: 0,
      receivedAirs: 0,
    };
  }

  async remove(
    participantId: string,
    actor: AdminActor,
    requestId: string,
    reason: string
  ): Promise<{ id: string; status: ProjectParticipantStatus; removedAt: string | null }> {
    const { data, error } = await this.client.rpc('marketplace_remove_project_participant', {
      p_participant_id: participantId,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
      p_reason: reason,
    });
    if (error) failDatabase();
    const result = record(data);
    if (result.ok !== true)
      marketplaceError(text(result.reasonCode) || 'PARTICIPANT_INPUT_INVALID');
    const participant = record(result.participant);
    if (!text(participant.id)) failDatabase();
    return {
      id: text(participant.id),
      status: text(participant.status) as ProjectParticipantStatus,
      removedAt: nullableText(participant.removedAt),
    };
  }

  async history(projectId: string, userId: string): Promise<ParticipantHistoryRecord[]> {
    const { data, error } = await this.client
      .from('project_activity_completions')
      .select(
        'id, activity_id, status, awarded_airs, completed_at, awarded_at, rejected_at, reversed_at'
      )
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });
    if (error) failDatabase();
    const completions = rows(data);
    if (completions.length === 0) return [];

    const activityIds = [
      ...new Set(completions.map((item) => text(item.activity_id)).filter(Boolean)),
    ];
    const activitiesResult = await this.client
      .from('project_activities')
      .select('id, code, default_locale, content')
      .eq('project_id', projectId)
      .in('id', activityIds);
    if (activitiesResult.error) failDatabase();
    const activities = new Map(rows(activitiesResult.data).map((item) => [text(item.id), item]));

    return completions.map((completion) => {
      const activityId = text(completion.activity_id);
      const activity = activities.get(activityId) ?? {};
      const content = record(activity.content);
      const localized = record(content[text(activity.default_locale)]);
      return {
        id: text(completion.id),
        activityId,
        activity: text(localized.title) || text(activity.code),
        status: text(completion.status) as ParticipantHistoryRecord['status'],
        awardedAirs: completion.awarded_airs == null ? null : Number(completion.awarded_airs),
        completedAt: text(completion.completed_at),
        awardedAt: nullableText(completion.awarded_at),
        rejectedAt: nullableText(completion.rejected_at),
        reversedAt: nullableText(completion.reversed_at),
      };
    });
  }
}
