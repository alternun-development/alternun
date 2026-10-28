/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError } from './marketplace.errors';
import { MARKETPLACE_SUPABASE } from './marketplace.repository';
import type {
  AdminNotificationDraft,
  AdminNotificationEvent,
  AdminNotificationRecord,
  AdminNotificationViewer,
} from './admin-notification.types';

type Row = Record<string, unknown>;

const LIST_LIMIT = 50;

function failDatabase(): never {
  throw new MarketplaceApiError('MARKETPLACE_UNAVAILABLE', 'Marketplace storage is unavailable.');
}

export function mapAdminNotification(row: Row): AdminNotificationRecord {
  return {
    id: String(row.id ?? ''),
    eventType: String(row.event_type ?? '') as AdminNotificationEvent,
    reportId: typeof row.report_id === 'string' ? row.report_id : null,
    projectId: typeof row.project_id === 'string' ? row.project_id : null,
    payload:
      row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at ?? ''),
    readAt: typeof row.read_at === 'string' ? row.read_at : null,
  };
}

/**
 * The inbox of the admin console. A notification belongs to a token identity (issuer and
 * subject) or to a verified email. Two plain queries are used instead of one filter string, so
 * an issuer or an email can never alter the query.
 */
@Injectable()
export class AdminNotificationRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  /** Stores each draft once; a repeat for the same report, event and recipient is ignored. */
  async insertMany(drafts: readonly AdminNotificationDraft[]): Promise<number> {
    let stored = 0;
    for (const draft of drafts) {
      const { error } = await this.client.from('admin_notifications').insert({
        recipient_email: draft.recipientEmail ?? null,
        recipient_issuer: draft.recipientIssuer ?? null,
        recipient_subject: draft.recipientSubject ?? null,
        event_type: draft.eventType,
        report_id: draft.reportId,
        project_id: draft.projectId,
        payload: draft.payload,
      });
      if (!error) stored += 1;
      else if (error.code !== '23505') failDatabase();
    }
    return stored;
  }

  private async selectFor(
    viewer: AdminNotificationViewer,
    unreadOnly: boolean
  ): Promise<AdminNotificationRecord[]> {
    const base = () => {
      let query = this.client
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(LIST_LIMIT);
      if (unreadOnly) query = query.is('read_at', null);
      return query;
    };
    const byIdentity = await base()
      .eq('recipient_issuer', viewer.issuer)
      .eq('recipient_subject', viewer.subject);
    if (byIdentity.error) failDatabase();
    const rows: Row[] = [...((byIdentity.data ?? []) as Row[])];
    if (viewer.email) {
      const byEmail = await base().eq('recipient_email', viewer.email);
      if (byEmail.error) failDatabase();
      rows.push(...((byEmail.data ?? []) as Row[]));
    }
    return rows
      .map(mapAdminNotification)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, LIST_LIMIT);
  }

  list(viewer: AdminNotificationViewer): Promise<AdminNotificationRecord[]> {
    return this.selectFor(viewer, false);
  }

  async unreadCount(viewer: AdminNotificationViewer): Promise<number> {
    const count = async (
      column: string,
      value: string,
      extra?: [string, string]
    ): Promise<number> => {
      let query = this.client
        .from('admin_notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
        .eq(column, value);
      if (extra) query = query.eq(extra[0], extra[1]);
      const { count: total, error } = await query;
      if (error) failDatabase();
      return total ?? 0;
    };
    const byIdentity = await count('recipient_issuer', viewer.issuer, [
      'recipient_subject',
      viewer.subject,
    ]);
    const byEmail = viewer.email ? await count('recipient_email', viewer.email) : 0;
    return byIdentity + byEmail;
  }

  /** Marks the viewer's own notifications read: the given ids, or all of them when ids is null. */
  async markRead(viewer: AdminNotificationViewer, ids: readonly string[] | null): Promise<number> {
    const now = new Date().toISOString();
    const run = async (
      column: string,
      value: string,
      extra?: [string, string]
    ): Promise<number> => {
      let query = this.client
        .from('admin_notifications')
        .update({ read_at: now })
        .is('read_at', null)
        .eq(column, value);
      if (extra) query = query.eq(extra[0], extra[1]);
      if (ids) query = query.in('id', [...ids]);
      const { data, error } = await query.select('id');
      if (error) failDatabase();
      return ((data ?? []) as Row[]).length;
    };
    const byIdentity = await run('recipient_issuer', viewer.issuer, [
      'recipient_subject',
      viewer.subject,
    ]);
    const byEmail = viewer.email ? await run('recipient_email', viewer.email) : 0;
    return byIdentity + byEmail;
  }
}
