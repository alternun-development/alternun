/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError } from './marketplace.errors';
import { MARKETPLACE_SUPABASE } from './marketplace.repository';

type Row = Record<string, unknown>;

export type AuditResult = 'allowed' | 'denied';

export interface AuditFilters {
  action?: string;
  result?: AuditResult;
  from?: string;
  to?: string;
  page: number;
  perPage: number;
}

export interface AuditRecord {
  id: string;
  createdAt: string;
  action: string;
  result: AuditResult;
  reasonCode: string | null;
  actor: string;
  targetType: string;
  changedFields: string[];
}

export interface AuditPage {
  data: AuditRecord[];
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
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

function camelField(value: string): string {
  return value.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function fieldValueChanged(before: Row, after: Row, key: string): boolean {
  return JSON.stringify(before[key]) !== JSON.stringify(after[key]);
}

export function changedAuditFields(beforeValue: unknown, afterValue: unknown): string[] {
  const before = record(beforeValue);
  const after = record(afterValue);
  const keys: string[] = [...Object.keys(before), ...Object.keys(after)];
  return Array.from(new Set<string>(keys))
    .filter((key) => fieldValueChanged(before, after, key))
    .map(camelField)
    .sort();
}

export function shortActorIdentifier(subject: unknown): string {
  const value = text(subject).trim();
  if (!value) return 'System';
  return value.length <= 12 ? value : `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function sanitizeAuditRow(row: Row, actorName?: string): AuditRecord {
  const cleanName = actorName?.trim();
  const actor =
    cleanName && !cleanName.includes('@') ? cleanName : shortActorIdentifier(row.actor_subject);
  return {
    id: text(row.id),
    createdAt: text(row.occurred_at),
    action: text(row.action),
    result: text(row.result) as AuditResult,
    reasonCode: nullableText(row.reason_code),
    actor,
    targetType: text(row.target_type),
    changedFields: changedAuditFields(row.before_state, row.after_state),
  };
}

@Injectable()
export class MarketplaceAuditRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  private async page(auditRows: Row[], total: number, filters: AuditFilters): Promise<AuditPage> {
    const subjects = [...new Set(auditRows.map((row) => text(row.actor_subject)).filter(Boolean))];
    const actorNames = new Map<string, string>();
    if (subjects.length > 0) {
      const { data, error } = await this.client
        .from('users')
        .select('iss, sub, name')
        .in('sub', subjects);
      if (error) failDatabase();
      for (const user of rows(data)) {
        const name = text(user.name).trim();
        if (name && !name.includes('@')) {
          actorNames.set(`${text(user.iss)}\u0000${text(user.sub)}`, name);
        }
      }
    }

    const data = auditRows.map((row) =>
      sanitizeAuditRow(
        row,
        actorNames.get(`${text(row.actor_issuer)}\u0000${text(row.actor_subject)}`)
      )
    );
    return {
      data,
      page: filters.page,
      perPage: filters.perPage,
      total,
      hasMore: (filters.page - 1) * filters.perPage + data.length < total,
    };
  }

  async listProject(
    projectId: string,
    enterpriseId: string,
    filters: AuditFilters
  ): Promise<AuditPage> {
    let query = this.client
      .from('admin_audit_log')
      .select(
        'id, occurred_at, actor_issuer, actor_subject, action, target_type, result, reason_code, before_state, after_state',
        { count: 'exact' }
      )
      .or(`project_id.eq.${projectId},and(project_id.is.null,enterprise_id.eq.${enterpriseId})`);
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.result) query = query.eq('result', filters.result);
    if (filters.from) query = query.gte('occurred_at', filters.from);
    if (filters.to) query = query.lte('occurred_at', filters.to);
    const start = (filters.page - 1) * filters.perPage;
    const { data, error, count } = await query
      .order('occurred_at', { ascending: false })
      .range(start, start + filters.perPage - 1);
    if (error) failDatabase();
    return this.page(rows(data), count ?? 0, filters);
  }

  async listEnterprise(enterpriseId: string, filters: AuditFilters): Promise<AuditPage> {
    const relations = await this.client
      .from('enterprise_projects')
      .select('project_id')
      .eq('enterprise_id', enterpriseId);
    if (relations.error) failDatabase();
    const projectIds = rows(relations.data)
      .map((row) => text(row.project_id))
      .filter(Boolean);
    let query = this.client
      .from('admin_audit_log')
      .select(
        'id, occurred_at, actor_issuer, actor_subject, action, target_type, result, reason_code, before_state, after_state',
        { count: 'exact' }
      );
    query = projectIds.length
      ? query.or(`enterprise_id.eq.${enterpriseId},project_id.in.(${projectIds.join(',')})`)
      : query.eq('enterprise_id', enterpriseId);
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.result) query = query.eq('result', filters.result);
    if (filters.from) query = query.gte('occurred_at', filters.from);
    if (filters.to) query = query.lte('occurred_at', filters.to);
    const start = (filters.page - 1) * filters.perPage;
    const { data, error, count } = await query
      .order('occurred_at', { ascending: false })
      .range(start, start + filters.perPage - 1);
    if (error) failDatabase();
    return this.page(rows(data), count ?? 0, filters);
  }
}
