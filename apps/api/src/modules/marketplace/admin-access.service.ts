import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveUserId } from '../../common/auth/resolve-user-id';
import { MarketplaceApiError } from './marketplace.errors';
import { MARKETPLACE_SUPABASE } from './marketplace.repository';
import {
  GLOBAL_ADMIN_ROLES,
  type AdminAccess,
  type AdminAccessRepositoryPort,
  type AdminAccessScope,
} from './admin-access.types';

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

/** Issuer stored on memberships the app grants: the console's, so they also work there. */
export function memberIssuer(env: Record<string, string | undefined>): string {
  return (env.ADMIN_AUTH_ISSUER ?? '').trim() || 'airs-app';
}

function single(value: unknown): Row {
  const row = Array.isArray(value) ? (value[0] as unknown) : value;
  return row && typeof row === 'object' ? (row as Row) : {};
}

@Injectable()
export class AdminAccessRepository implements AdminAccessRepositoryPort {
  constructor(@Inject(MARKETPLACE_SUPABASE) private readonly client: SupabaseClient) {}

  private unavailable(): never {
    throw new MarketplaceApiError('MARKETPLACE_UNAVAILABLE', 'Marketplace storage is unavailable.');
  }

  async findVerifiedEmail(userId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from('users')
      .select('email, email_verified')
      .eq('id', userId)
      .maybeSingle();
    if (error) this.unavailable();
    const row = (data ?? {}) as Row;
    const email = text(row.email);
    return email && row.email_verified === true ? email.trim().toLowerCase() : null;
  }

  async findGlobalRole(email: string): Promise<string | null> {
    const { data, error } = await this.client
      .from('platform_admins')
      .select('role')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle();
    if (error) this.unavailable();
    return text((data as Row | null)?.role);
  }

  // Best effort: when the sync fails the person keeps the memberships they already have.
  async syncDomainMemberships(userId: string, issuer: string): Promise<number> {
    const result = await this.client.rpc('marketplace_sync_domain_memberships', {
      p_user_id: userId,
      p_member_issuer: issuer,
    });
    if (result.error) return 0;
    const granted = (result.data as Row | null)?.granted;
    return typeof granted === 'number' ? granted : 0;
  }

  async listActiveMemberships(userId: string): Promise<AdminAccessScope[]> {
    // project_memberships.project_id has no foreign key to projects, so project slugs are
    // looked up separately; enterprises can be embedded.
    const { data, error } = await this.client
      .from('project_memberships')
      .select('role, enterprise_id, project_id, enterprises(slug)')
      .eq('member_user_id', userId)
      .eq('status', 'active');
    if (error) this.unavailable();
    const rows = (data ?? []) as Row[];
    const projectIds = [
      ...new Set(rows.map((row) => text(row.project_id)).filter((id): id is string => !!id)),
    ];
    const projectSlugs = new Map<string, string>();
    if (projectIds.length > 0) {
      const projects = await this.client.from('projects').select('id, slug').in('id', projectIds);
      if (projects.error) this.unavailable();
      for (const project of (projects.data ?? []) as Row[]) {
        const id = text(project.id);
        const slug = text(project.slug);
        if (id && slug) projectSlugs.set(id, slug);
      }
    }
    return rows.map((row) => {
      const projectId = text(row.project_id);
      return {
        role: text(row.role) ?? '',
        enterpriseId: text(row.enterprise_id) ?? '',
        enterpriseSlug: text(single(row.enterprises).slug),
        projectId,
        projectSlug: projectId ? projectSlugs.get(projectId) ?? null : null,
      };
    });
  }

  /**
   * Active memberships of the user that cover this project (or, with a null project, the whole
   * enterprise), with the identity stored on them.
   */
  async listProjectMembershipIdentities(
    userId: string,
    enterpriseId: string,
    projectId: string | null
  ): Promise<Array<{ role: string; issuer: string; subject: string }>> {
    const { data, error } = await this.client
      .from('project_memberships')
      .select('role, member_issuer, member_subject, scope_type, project_id')
      .eq('member_user_id', userId)
      .eq('enterprise_id', enterpriseId)
      .eq('status', 'active');
    if (error) this.unavailable();
    return ((data ?? []) as Row[])
      .filter(
        (row) =>
          row.scope_type === 'enterprise' || (projectId !== null && row.project_id === projectId)
      )
      .map((row) => ({
        role: text(row.role) ?? '',
        issuer: text(row.member_issuer) ?? '',
        subject: text(row.member_subject) ?? '',
      }))
      .filter((row) => row.role && row.issuer && row.subject);
  }
}

/** Combines the Alternun global role and per-project memberships into one access summary. */
export function buildAdminAccess(
  globalRole: string | null,
  scopes: AdminAccessScope[]
): AdminAccess {
  const isGlobalAdmin = (GLOBAL_ADMIN_ROLES as readonly string[]).includes(globalRole ?? '');
  const validScopes = scopes.filter((scope) => scope.role && scope.enterpriseId);
  const roles: string[] = validScopes.map((scope) => scope.role);
  if (isGlobalAdmin && globalRole) roles.unshift(globalRole);
  return {
    globalRole: isGlobalAdmin ? globalRole : null,
    isGlobalAdmin,
    scopes: validScopes,
    roles: Array.from(new Set<string>(roles)),
  };
}

@Injectable()
export class AdminAccessService {
  /** Bearer token -> app user id; replaceable in tests. */
  resolveUser: (token: string) => Promise<string> = (token) => resolveUserId(token);
  /** Environment (ADMIN_AUTH_ISSUER); replaceable in tests. */
  env: Record<string, string | undefined> = process.env;

  constructor(
    @Inject(AdminAccessRepository) private readonly repository: AdminAccessRepositoryPort
  ) {}

  async forToken(token: string): Promise<AdminAccess> {
    const userId = await this.resolveUser(token);
    // Domain admins (e.g. @alternun.io) get their memberships before they are listed.
    await this.repository.syncDomainMemberships(userId, memberIssuer(this.env));
    const [email, scopes] = await Promise.all([
      this.repository.findVerifiedEmail(userId),
      this.repository.listActiveMemberships(userId),
    ]);
    // Global admin status needs a verified email: an unverified address could belong to anyone.
    const globalRole = email ? await this.repository.findGlobalRole(email) : null;
    return buildAdminAccess(globalRole, scopes);
  }
}
