/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError, marketplaceError } from './marketplace.errors';
import { MARKETPLACE_SUPABASE } from './marketplace.repository';
import type { AdminActor } from './marketplace.types';
import {
  AIRS_REPORT_PROOF_BUCKET,
  AIRS_REPORT_PROOF_TYPES,
  type ProjectClientInvitationRecord,
  type ProjectClientProof,
  type ProjectClientProofFile,
} from './project-client.types';

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
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

function mapInvitation(value: unknown): ProjectClientInvitationRecord {
  const row = record(value);
  return {
    id: text(row.id),
    projectId: text(row.project_id),
    email: text(row.email),
    name: text(row.name),
    status: text(row.status) as ProjectClientInvitationRecord['status'],
    invitedAt: text(row.invited_at),
    cancelledAt: typeof row.cancelled_at === 'string' ? row.cancelled_at : null,
    acceptedAt: typeof row.accepted_at === 'string' ? row.accepted_at : null,
  };
}

/** Invitations of clients without an account, and the private supporting files of reports. */
@Injectable()
export class ProjectClientRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  async hasVerifiedAccount(email: string): Promise<boolean> {
    // ilike for case-insensitive equality; its wildcards are escaped.
    const { data, error } = await this.client
      .from('users')
      .select('id')
      .ilike(
        'email',
        email.replace(/[\\%_]/g, (match) => `\\${match}`)
      )
      .eq('email_verified', true)
      .limit(1);
    if (error) failDatabase();
    return rows(data).length > 0;
  }

  /** Every invitation of the project (pending, accepted and cancelled), newest first. */
  async listInvitations(projectId: string): Promise<ProjectClientInvitationRecord[]> {
    const { data, error } = await this.client
      .from('project_client_invitations')
      .select('id, project_id, email, name, status, invited_at, cancelled_at, accepted_at')
      .eq('project_id', projectId)
      .order('invited_at', { ascending: false });
    if (error) failDatabase();
    return rows(data).map(mapInvitation);
  }

  async findInvitation(
    projectId: string,
    invitationId: string
  ): Promise<ProjectClientInvitationRecord | null> {
    const { data, error } = await this.client
      .from('project_client_invitations')
      .select('id, project_id, email, name, status, invited_at, cancelled_at, accepted_at')
      .eq('project_id', projectId)
      .eq('id', invitationId)
      .maybeSingle();
    if (error) failDatabase();
    return data ? mapInvitation(data) : null;
  }

  async invite(
    projectId: string,
    email: string,
    name: string,
    actor: AdminActor,
    requestId: string
  ): Promise<{ invitation: ProjectClientInvitationRecord; idempotent: boolean }> {
    const { data, error } = await this.client.rpc('marketplace_invite_project_client', {
      p_project_id: projectId,
      p_email: email,
      p_name: name,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
    });
    if (error) failDatabase();
    const result = record(data);
    if (result.ok !== true) marketplaceError(text(result.reasonCode) || 'CLIENT_INPUT_INVALID');
    return { invitation: mapInvitation(result.invitation), idempotent: result.idempotent === true };
  }

  async cancelInvitation(
    invitationId: string,
    actor: AdminActor,
    requestId: string
  ): Promise<void> {
    const { data, error } = await this.client.rpc('marketplace_cancel_project_client_invitation', {
      p_invitation_id: invitationId,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
    });
    if (error) failDatabase();
    const result = record(data);
    if (result.ok !== true) marketplaceError(text(result.reasonCode) || 'CLIENT_INPUT_INVALID');
  }

  async createProofUpload(path: string): Promise<{ uploadUrl: string; path: string }> {
    const { data, error } = await this.client.storage
      .from(AIRS_REPORT_PROOF_BUCKET)
      .createSignedUploadUrl(path);
    if (error ?? !data) failDatabase();
    return { uploadUrl: data.signedUrl, path: data.path };
  }

  /** Reads an uploaded file and returns what is stored about it, or null when it is missing. */
  async inspectProof(path: string): Promise<Omit<ProjectClientProof, 'path'> | null> {
    const { data, error } = await this.client.storage.from(AIRS_REPORT_PROOF_BUCKET).download(path);
    if (error ?? !data) return null;
    const bytes = Buffer.from(await data.arrayBuffer());
    return {
      contentType: data.type,
      sizeBytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  }

  async saveProof(reportId: string, proof: ProjectClientProof, actor: AdminActor): Promise<void> {
    const { error } = await this.client.from('airs_report_proofs').insert({
      report_id: reportId,
      storage_path: proof.path,
      content_type: proof.contentType,
      size_bytes: proof.sizeBytes,
      sha256: proof.sha256,
      uploaded_by_issuer: actor.issuer,
      uploaded_by_subject: actor.subject,
    });
    // A replayed submission already stored its file.
    if (error && error.code !== '23505') failDatabase();
  }

  async proofReportIds(reportIds: readonly string[]): Promise<Set<string>> {
    if (reportIds.length === 0) return new Set();
    const { data, error } = await this.client
      .from('airs_report_proofs')
      .select('report_id')
      .in('report_id', [...reportIds]);
    if (error) failDatabase();
    return new Set(rows(data).map((row) => text(row.report_id)));
  }

  /**
   * Who hears about a new client of the project: active Alternun global admins and the
   * project's admins (partner_operator of the project or its whole enterprise), with a
   * verified email, once each.
   */
  async listClientNoticeRecipients(
    projectId: string,
    enterpriseId: string
  ): Promise<Array<{ userId: string; email: string }>> {
    const [admins, memberships] = await Promise.all([
      this.client.from('platform_admins').select('email').eq('is_active', true),
      this.client
        .from('project_memberships')
        .select('member_user_id, scope_type, project_id')
        .eq('enterprise_id', enterpriseId)
        .eq('role', 'partner_operator')
        .eq('status', 'active'),
    ]);
    if (admins.error ?? memberships.error) failDatabase();
    const adminEmails = rows(admins.data)
      .map((row) => text(row.email).trim().toLowerCase())
      .filter(Boolean);
    const memberIds = rows(memberships.data)
      .filter((row) => row.scope_type === 'enterprise' || row.project_id === projectId)
      .map((row) => text(row.member_user_id))
      .filter(Boolean);

    const found: Row[] = [];
    if (adminEmails.length > 0) {
      const byEmail = await this.client
        .from('users')
        .select('id, email')
        .eq('email_verified', true)
        .in('email', adminEmails);
      if (byEmail.error) failDatabase();
      found.push(...rows(byEmail.data));
    }
    if (memberIds.length > 0) {
      const byId = await this.client
        .from('users')
        .select('id, email')
        .eq('email_verified', true)
        .in('id', memberIds);
      if (byId.error) failDatabase();
      found.push(...rows(byId.data));
    }
    const recipients = new Map<string, { userId: string; email: string }>();
    for (const row of found) {
      const userId = text(row.id);
      const email = text(row.email).trim().toLowerCase();
      if (userId && email) recipients.set(userId, { userId, email });
    }
    return Array.from(recipients.values());
  }

  /** Resends of this report or invitation since the given time (from the audit log). */
  async countResendsSince(targetId: string, since: string): Promise<number> {
    const { count, error } = await this.client
      .from('admin_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('action', 'client.resend')
      .eq('target_id', targetId)
      .gte('occurred_at', since);
    if (error) failDatabase();
    return count ?? 0;
  }

  /** In-app notices; a repeated key for the same person is ignored. */
  async createNotifications(
    notices: Array<{
      userId: string;
      eventType: string;
      severity: 'info' | 'warning';
      payload: Record<string, unknown>;
      dedupeKey: string;
    }>
  ): Promise<void> {
    if (notices.length === 0) return;
    const { error } = await this.client.from('user_notifications').upsert(
      notices.map((notice) => ({
        user_id: notice.userId,
        event_type: notice.eventType,
        severity: notice.severity,
        payload: notice.payload,
        dedupe_key: notice.dedupeKey,
      })),
      { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true }
    );
    if (error) failDatabase();
  }

  /** The stored file of a report, read with the service role; null when it has none. */
  async readProof(reportId: string): Promise<ProjectClientProofFile | null> {
    const { data, error } = await this.client
      .from('airs_report_proofs')
      .select('storage_path, content_type')
      .eq('report_id', reportId)
      .maybeSingle();
    if (error) failDatabase();
    const row = record(data);
    const path = text(row.storage_path);
    if (!path) return null;
    const file = await this.client.storage.from(AIRS_REPORT_PROOF_BUCKET).download(path);
    if (file.error ?? !file.data) failDatabase();
    const contentType = text(row.content_type) || file.data.type;
    return {
      bytes: Buffer.from(await file.data.arrayBuffer()),
      contentType,
      fileName: `soporte.${AIRS_REPORT_PROOF_TYPES[contentType] ?? 'bin'}`,
    };
  }
}
