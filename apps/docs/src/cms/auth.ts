import { UserManager, WebStorageStateStore, type UserManagerSettings } from 'oidc-client-ts';
import type { CmsAuthIdentity, DocsCmsCustomFields } from './types';

type ClaimBag = Record<string, unknown>;

export interface DocsCmsSession {
  expired: boolean;
  profile: ClaimBag;
}

export interface DocsCmsUserManager {
  getUser(): Promise<DocsCmsSession | null>;
  removeUser(): Promise<void>;
  signinRedirect(options?: { state?: { returnTo?: string } }): Promise<void>;
  signinRedirectCallback(): Promise<DocsCmsSession>;
  signoutRedirect(options?: { post_logout_redirect_uri?: string }): Promise<void>;
}

function readClaimArray(claims: ClaimBag, key: string): string[] {
  const value = claims[key];

  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  if (typeof value === 'string' && value.length > 0) {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeGroup(value: string): string {
  return value.trim().toLowerCase();
}

export function createDocsCmsUserManager(config: DocsCmsCustomFields): DocsCmsUserManager {
  const origin = typeof window === 'undefined' ? 'http://127.0.0.1:8083' : window.location.origin;

  const settings: UserManagerSettings = {
    authority: config.auth.issuer,
    client_id: config.auth.clientId,
    redirect_uri: `${origin}/admin/auth/callback`,
    post_logout_redirect_uri: `${origin}/admin`,
    response_type: 'code',
    scope: 'openid profile email offline_access',
    automaticSilentRenew: true,
    monitorSession: false,
    loadUserInfo: false,
    userStore:
      typeof window === 'undefined'
        ? undefined
        : new WebStorageStateStore({ store: window.localStorage }),
    extraQueryParams: config.auth.audience
      ? {
          audience: config.auth.audience,
        }
      : undefined,
  };

  return new UserManager(settings) as unknown as DocsCmsUserManager;
}

export async function getActiveCmsSession(
  userManager: DocsCmsUserManager
): Promise<DocsCmsSession | null> {
  const user = await userManager.getUser();

  if (!user || user.expired) {
    return null;
  }

  return user;
}

export function canAccessCms(user: DocsCmsSession | null, config: DocsCmsCustomFields): boolean {
  if (!user) {
    return false;
  }

  const claims = user.profile;
  const allowedGroups = new Set(config.auth.allowedGroups.map(normalizeGroup));
  const userGroups = [
    ...readClaimArray(claims, 'groups'),
    ...readClaimArray(claims, 'roles'),
    ...readClaimArray(claims, 'alternun_roles'),
  ].map(normalizeGroup);

  return userGroups.some((group) => allowedGroups.has(group));
}

export function extractCmsIdentity(user: DocsCmsSession | null): CmsAuthIdentity | null {
  if (!user) {
    return null;
  }

  const claims = user.profile;
  const email = typeof claims.email === 'string' ? claims.email : undefined;
  const name =
    (typeof claims.name === 'string' && claims.name.length > 0 ? claims.name : undefined) ??
    (typeof claims.preferred_username === 'string' && claims.preferred_username.length > 0
      ? claims.preferred_username
      : undefined) ??
    email ??
    'Alternun Editor';

  return {
    email,
    name,
    groups: [
      ...readClaimArray(claims, 'groups'),
      ...readClaimArray(claims, 'roles'),
      ...readClaimArray(claims, 'alternun_roles'),
    ],
  };
}
