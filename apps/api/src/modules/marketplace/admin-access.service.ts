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

  async listActiveMemberships(userId: string): Promise<AdminAccessScope[]> {
    const { data, error } = await this.client
      .from('project_memberships')
      .select('role, enterprise_id, project_id, enterprises(slug), projects(slug)')
      .eq('member_user_id', userId)
      .eq('status', 'active');
    if (error) this.unavailable();
    return ((data ?? []) as Row[]).map((row) => ({
      role: text(row.role) ?? '',
      enterpriseId: text(row.enterprise_id) ?? '',
      enterpriseSlug: text(single(row.enterprises).slug),
      projectId: text(row.project_id),
      projectSlug: text(single(row.projects).slug),
    }));
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

  constructor(
    @Inject(AdminAccessRepository) private readonly repository: AdminAccessRepositoryPort
  ) {}

  async forToken(token: string): Promise<AdminAccess> {
    const userId = await this.resolveUser(token);
    const [email, scopes] = await Promise.all([
      this.repository.findVerifiedEmail(userId),
      this.repository.listActiveMemberships(userId),
    ]);
    // Global admin status needs a verified email: an unverified address could belong to anyone.
    const globalRole = email ? await this.repository.findGlobalRole(email) : null;
    return buildAdminAccess(globalRole, scopes);
  }
}
