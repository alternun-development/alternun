/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceApiError, marketplaceError } from './marketplace.errors';
import { MARKETPLACE_SUPABASE } from './marketplace.repository';
import type {
  AdminActor,
  ProjectMembershipRecord,
  ProjectMembershipScope,
} from './marketplace.types';

type Row = Record<string, unknown>;
type MembershipFilters = { enterpriseId?: string; projectId?: string };
type MembershipListScope = { enterpriseIds: readonly string[]; projectIds: readonly string[] };

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

function mapMembership(row: Row): ProjectMembershipRecord {
  return {
    id: text(row.id),
    member: { issuer: text(row.member_issuer), subject: text(row.member_subject) },
    memberUserId: nullableText(row.member_user_id),
    enterpriseId: text(row.enterprise_id),
    projectId: nullableText(row.project_id),
    scopeType: text(row.scope_type) as ProjectMembershipRecord['scopeType'],
    role: text(row.role) as ProjectMembershipRecord['role'],
    status: text(row.status) as ProjectMembershipRecord['status'],
    grantedBy: {
      issuer: text(row.granted_by_issuer),
      subject: text(row.granted_by_subject),
    },
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    revokedAt: nullableText(row.revoked_at),
  };
}

export function memberKey(issuer: string, subject: string): string {
  return JSON.stringify([issuer, subject]);
}

function failDatabase(error: { code?: string } | null): never {
  if (error?.code === '23505') marketplaceError('MEMBERSHIP_CONFLICT');
  throw new MarketplaceApiError('MARKETPLACE_UNAVAILABLE', 'Marketplace storage is unavailable.');
}

@Injectable()
export class MarketplaceMembershipRepository {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  private async queryList(
    filters: MembershipFilters,
    scope?: { field: 'enterprise_id' | 'project_id'; ids: readonly string[] }
  ): Promise<ProjectMembershipRecord[]> {
    if (scope?.ids.length === 0) return [];
    let query = this.client
      .from('project_memberships')
      .select('*')
      .order('created_at', { ascending: false });
    if (filters.enterpriseId) query = query.eq('enterprise_id', filters.enterpriseId);
    if (filters.projectId) query = query.eq('project_id', filters.projectId);
    if (scope) query = query.in(scope.field, [...scope.ids]);
    const { data, error } = await query;
    if (error) failDatabase(error);
    return rows(data).map(mapMembership);
  }

  async list(
    filters: MembershipFilters,
    scope?: MembershipListScope
  ): Promise<ProjectMembershipRecord[]> {
    if (!scope) return this.queryList(filters);
    const memberships = [
      ...(await this.queryList(filters, {
        field: 'enterprise_id',
        ids: scope.enterpriseIds,
      })),
      ...(await this.queryList(filters, { field: 'project_id', ids: scope.projectIds })),
    ];
    const seen = new Set<string>();
    return memberships.filter((membership) => {
      if (seen.has(membership.id)) return false;
      seen.add(membership.id);
      return true;
    });
  }

  /** The one verified account with this email; null when none, a conflict when it is ambiguous. */
  async findVerifiedUserByEmail(
    email: string
  ): Promise<{ id: string; issuer: string; subject: string; email: string } | null> {
    const { data, error } = await this.client
      .from('users')
      .select('id, iss, sub, email, raw_claims')
      .eq('email_verified', true)
      .ilike(
        'email',
        email.trim().replace(/[\\%_]/g, (match) => `\\${match}`)
      )
      .limit(2);
    if (error) failDatabase(error);
    const matches = rows(data);
    if (matches.length > 1) marketplaceError('MEMBERSHIP_CONFLICT');
    const row = matches[0];
    if (!row) return null;
    // Accounts synced by the Authentik webhook store a hashed principal in `sub`; the panel token
    // carries the Authentik user UUID, kept in the raw claims.
    const claims = record(row.raw_claims);
    return {
      id: text(row.id),
      issuer: text(row.iss),
      subject: text(claims.uuid) || text(claims.sub) || text(row.sub),
      email: text(row.email).trim().toLowerCase(),
    };
  }

  /** Emails of known members, keyed by memberKey(issuer, subject). */
  async emailsForMembers(
    members: ReadonlyArray<{ issuer: string; subject: string }>
  ): Promise<Map<string, string>> {
    const found = new Map<string, string>();
    // Subjects are Authentik UUIDs or hashed principals; anything else cannot be a filter value.
    const subjects: string[] = [];
    for (const { subject } of members) {
      if (/^[A-Za-z0-9._:@-]+$/.test(subject) && !subjects.includes(subject)) {
        subjects.push(subject);
      }
    }
    if (!subjects.length) return found;
    const list = subjects.join(',');
    const { data, error } = await this.client
      .from('users')
      .select('sub, email, email_verified, raw_claims')
      .or(`sub.in.(${list}),raw_claims->>uuid.in.(${list})`);
    if (error) failDatabase(error);
    const emailBySubject = new Map<string, string>();
    for (const row of rows(data)) {
      if (row.email_verified !== true || !text(row.email)) continue;
      const email = text(row.email).trim().toLowerCase();
      emailBySubject.set(text(row.sub), email);
      const uuid = text(record(row.raw_claims).uuid);
      if (uuid) emailBySubject.set(uuid, email);
    }
    for (const member of members) {
      const email = emailBySubject.get(member.subject);
      if (email) found.set(memberKey(member.issuer, member.subject), email);
    }
    return found;
  }

  /** Active memberships a person still holds with this role, optionally ignoring one. */
  async countActiveWithRole(
    member: { issuer: string; subject: string },
    role: ProjectMembershipRecord['role'],
    exceptId?: string
  ): Promise<number> {
    let query = this.client
      .from('project_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('member_issuer', member.issuer)
      .eq('member_subject', member.subject)
      .eq('role', role)
      .eq('status', 'active');
    if (exceptId) query = query.neq('id', exceptId);
    const { count, error } = await query;
    if (error) failDatabase(error);
    return count ?? 0;
  }

  async find(id: string): Promise<ProjectMembershipRecord | null> {
    const { data, error } = await this.client
      .from('project_memberships')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) failDatabase(error);
    return data ? mapMembership(data as Row) : null;
  }

  async grant(
    input: {
      memberIssuer: string;
      memberSubject: string;
      memberUserId?: string;
      enterpriseId: string;
      projectId?: string;
      scopeType: ProjectMembershipScope['scopeType'];
      role: ProjectMembershipRecord['role'];
    },
    actor: AdminActor,
    requestId: string
  ): Promise<ProjectMembershipRecord> {
    const { data, error } = await this.client.rpc('marketplace_grant_project_membership', {
      p_member_issuer: input.memberIssuer,
      p_member_subject: input.memberSubject,
      p_member_user_id: input.memberUserId ?? null,
      p_enterprise_id: input.enterpriseId,
      p_project_id: input.projectId ?? null,
      p_scope_type: input.scopeType,
      p_role: input.role,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
      p_reason: null,
    });
    if (error) failDatabase(error);
    const result = record(data);
    if (result.ok !== true) marketplaceError(text(result.reasonCode) || 'VALIDATION_FAILED');
    return mapMembership(record(result.membership));
  }

  async change(
    membershipId: string,
    role: ProjectMembershipRecord['role'],
    status: ProjectMembershipRecord['status'],
    actor: AdminActor,
    requestId: string,
    reason?: string
  ): Promise<ProjectMembershipRecord> {
    const { data, error } = await this.client.rpc('marketplace_change_project_membership', {
      p_membership_id: membershipId,
      p_new_role: role,
      p_new_status: status,
      p_actor_issuer: actor.issuer,
      p_actor_subject: actor.subject,
      p_actor_roles: [...actor.roles],
      p_request_id: requestId,
      p_reason: reason ?? null,
    });
    if (error) failDatabase(error);
    const result = record(data);
    if (result.ok !== true) marketplaceError(text(result.reasonCode) || 'VALIDATION_FAILED');
    return mapMembership(record(result.membership));
  }
}
