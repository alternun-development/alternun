/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError, marketplaceError } from './marketplace.errors';
import { MARKETPLACE_SUPABASE } from './marketplace.repository';
import type {
  AdminActor,
  CommentStatus,
  ProjectCommentRecord,
  PublicProjectComment,
  VerifiedCommentAuthor,
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

function failDatabase(): never {
  throw new MarketplaceApiError('MARKETPLACE_UNAVAILABLE', 'Marketplace storage is unavailable.');
}

function mapComment(row: Row): ProjectCommentRecord {
  return {
    id: text(row.id),
    projectId: text(row.project_id),
    authorIssuer: text(row.author_issuer),
    authorSubject: text(row.author_subject),
    authorUserId: text(row.author_user_id),
    authorDisplayName: text(row.author_display_name),
    body: text(row.body),
    status: text(row.status) as CommentStatus,
    moderatedByIssuer: nullableText(row.moderated_by_issuer),
    moderatedBySubject: nullableText(row.moderated_by_subject),
    moderatedAt: nullableText(row.moderated_at),
    moderationReason: nullableText(row.moderation_reason),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function mapPublicComment(row: Row): PublicProjectComment {
  return {
    displayName: text(row.author_display_name),
    body: text(row.body),
    createdAt: text(row.created_at),
  };
}

@Injectable()
export class MarketplaceCommentRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  async findVerifiedAuthor(userId: string): Promise<VerifiedCommentAuthor | null> {
    const { data, error } = await this.client
      .from('users')
      .select('id, iss, sub, name')
      .eq('id', userId)
      .maybeSingle();
    if (error) failDatabase();
    if (!data) return null;
    const row = data as Row;
    const issuer = text(row.iss).trim();
    const subject = text(row.sub).trim();
    if (!issuer || !subject) return null;
    const displayName =
      text(row.name)
        .replace(/\p{Cc}/gu, '')
        .trim()
        .slice(0, 100) || 'AIRS member';
    return { issuer, subject, userId: text(row.id) || userId, displayName };
  }

  async listVisible(projectId: string): Promise<PublicProjectComment[]> {
    const { data, error } = await this.client
      .from('project_comments')
      .select('author_display_name, body, created_at')
      .eq('project_id', projectId)
      .eq('status', 'visible')
      .order('created_at', { ascending: false });
    if (error) failDatabase();
    return rows(data).map(mapPublicComment);
  }

  async listAdmin(projectId: string, status?: CommentStatus): Promise<ProjectCommentRecord[]> {
    let query = this.client
      .from('project_comments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) failDatabase();
    return rows(data).map(mapComment);
  }

  async findAdmin(projectId: string, commentId: string): Promise<ProjectCommentRecord | null> {
    const { data, error } = await this.client
      .from('project_comments')
      .select('*')
      .eq('project_id', projectId)
      .eq('id', commentId)
      .maybeSingle();
    if (error) failDatabase();
    return data ? mapComment(data as Row) : null;
  }

  async create(
    projectId: string,
    author: VerifiedCommentAuthor,
    body: string,
    requestId: string
  ): Promise<ProjectCommentRecord> {
    const { data, error } = await this.client.rpc('marketplace_create_comment', {
      p_project_id: projectId,
      p_author_issuer: author.issuer,
      p_author_subject: author.subject,
      p_author_user_id: author.userId,
      p_author_display_name: author.displayName,
      p_body: body,
      p_request_id: requestId,
    });
    if (error) failDatabase();
    const result = record(data);
    if (result.ok !== true) marketplaceError(text(result.reasonCode) || 'COMMENT_INPUT_INVALID');
    const comment = record(result.comment);
    if (!text(comment.id)) failDatabase();
    return mapComment(comment);
  }

  async moderate(
    commentId: string,
    targetStatus: 'visible' | 'rejected' | 'hidden',
    actor: AdminActor,
    requestId: string,
    reason?: string
  ): Promise<ProjectCommentRecord> {
    const { data, error } = await this.client.rpc('marketplace_moderate_comment', {
      p_comment_id: commentId,
      p_target_status: targetStatus,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
      p_reason: reason ?? null,
    });
    if (error) failDatabase();
    const result = record(data);
    if (result.ok !== true)
      marketplaceError(text(result.reasonCode) || 'COMMENT_TRANSITION_INVALID');
    const comment = record(result.comment);
    if (!text(comment.id)) failDatabase();
    return mapComment(comment);
  }
}
