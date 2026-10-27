import type {
  AuthentikGroupRole,
  AuthentikGroupSync,
  AuthentikGroupSyncDependencies,
  AuthentikGroupSyncStatus,
} from './authentik-group-sync.types';

// Group names are the ones bootstrap-authentik-integrations.py maps to the admin roles claim.
export const AUTHENTIK_GROUP_BY_ROLE: Readonly<Record<AuthentikGroupRole, string>> = {
  partner_operator: 'Alternun Partner Operator',
  sub_admin: 'Alternun Sub Admin',
  partner_readonly: 'Alternun Partner Read Only',
};

const REQUEST_TIMEOUT_MS = 8000;

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

/** API base from AUTHENTIK_API_URL, or null when the sync is not configured or the URL is unsafe. */
export function resolveAuthentikApiBase(env: Record<string, string | undefined>): string | null {
  const raw = (env.AUTHENTIK_API_URL ?? '').trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalHost(url.hostname))) {
    return null;
  }
  if (url.username || url.password || url.search || url.hash) return null;
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${path.endsWith('/api/v3') ? path : `${path}/api/v3`}`;
}

function results(body: unknown): Array<Record<string, unknown>> {
  const list = (body as { results?: unknown } | null)?.results;
  return Array.isArray(list)
    ? list.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    : [];
}

/**
 * Keeps the Authentik group of an admin role in step with project memberships, so nobody has to
 * add the group by hand. The membership in the database is the authority: the group only makes the
 * role appear in the person's token. Every call is best effort, uses an admin token that comes
 * from AUTHENTIK_API_TOKEN, and never throws or logs the token.
 */
export function createAuthentikGroupSync(
  dependencies: AuthentikGroupSyncDependencies
): AuthentikGroupSync {
  const base = resolveAuthentikApiBase(dependencies.env);
  const token = (dependencies.env.AUTHENTIK_API_TOKEN ?? '').trim();

  async function request(
    path: string,
    init: { method: 'GET' | 'POST'; body?: unknown }
  ): Promise<{ ok: boolean; status: number; body: unknown }> {
    const response = await dependencies.fetch(`${base ?? ''}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body: unknown = response.status === 204 ? null : await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, body };
  }

  async function change(
    action: 'add_user' | 'remove_user',
    email: string,
    role: AuthentikGroupRole
  ): Promise<AuthentikGroupSyncStatus> {
    if (!base || !token) return 'skipped';
    const wanted = email.trim().toLowerCase();
    try {
      const users = await request(`/core/users/?email=${encodeURIComponent(wanted)}&page_size=5`, {
        method: 'GET',
      });
      if (!users.ok) return 'failed';
      const user = results(users.body).find(
        (item) => String(item.email ?? '').toLowerCase() === wanted && item.is_active !== false
      );
      if (user?.pk === undefined || user.pk === null) return 'skipped';

      const groupName = AUTHENTIK_GROUP_BY_ROLE[role];
      const groups = await request(
        `/core/groups/?name=${encodeURIComponent(groupName)}&page_size=5`,
        {
          method: 'GET',
        }
      );
      if (!groups.ok) return 'failed';
      const group = results(groups.body).find((item) => item.name === groupName);
      if (typeof group?.pk !== 'string' || !group.pk) return 'failed';

      const done = await request(`/core/groups/${encodeURIComponent(group.pk)}/${action}/`, {
        method: 'POST',
        body: { pk: user.pk },
      });
      if (!done.ok) return 'failed';
      return action === 'add_user' ? 'added' : 'removed';
    } catch {
      return 'failed';
    }
  }

  return {
    add: (email, role) => change('add_user', email, role),
    remove: (email, role) => change('remove_user', email, role),
  };
}

export const AUTHENTIK_GROUP_SYNC = Symbol('AUTHENTIK_GROUP_SYNC');
