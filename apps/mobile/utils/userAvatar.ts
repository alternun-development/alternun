import { useSyncExternalStore } from 'react';
import { resolveMobileApiBaseUrl } from './runtimeConfig';
import type { HonorAwardKind, HonorAwardTier } from './honorAwards';

/** How a person appears in Airs: their social photo, an illustration or a badge they hold. */
export type UserAvatarKind = 'social' | 'preset' | 'tier' | 'achievement' | 'honor_award';

/** Art of an honor award chosen as avatar. */
export interface UserAvatarArt {
  title?: string;
  tier?: HonorAwardTier;
  kind?: HonorAwardKind;
  artPreset?: string | null;
  badgeImageUrl?: string | null;
}

export interface UserAvatarChoice {
  /** null means the default: the social photo when there is one, otherwise initials. */
  kind: UserAvatarKind | null;
  ref: string | null;
  art: UserAvatarArt | null;
}

export interface UserAvatarState {
  choice: UserAvatarChoice;
  /** Photo of the social account used to sign in (Google, Discord), if any. */
  socialUrl: string | null;
}

export const DEFAULT_AVATAR_CHOICE: UserAvatarChoice = { kind: null, ref: null, art: null };

export class UserAvatarRequestError extends Error {
  constructor(readonly status: number, readonly code?: string) {
    super(code ?? `HTTP_${status}`);
    this.name = 'UserAvatarRequestError';
  }
}

/** The person's own avatar read: their choice and the social photo kept at sign-in. */
export interface UserAvatarRead {
  choice: UserAvatarChoice;
  socialUrl: string | null;
}

export interface UserAvatarClient {
  get(): Promise<UserAvatarRead>;
  set(kind: UserAvatarKind | null, ref?: string | null): Promise<UserAvatarChoice>;
}

function normalizeChoice(value: unknown): UserAvatarChoice {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const kind = typeof record.kind === 'string' ? (record.kind as UserAvatarKind) : null;
  const ref = typeof record.ref === 'string' ? record.ref : null;
  const art = record.art && typeof record.art === 'object' ? (record.art as UserAvatarArt) : null;
  return { kind, ref, art };
}

export function createUserAvatarClient(
  getToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
  apiUrl = resolveMobileApiBaseUrl()
): UserAvatarClient {
  const url = `${apiUrl.replace(/\/+$/, '')}/v1/me/avatar`;

  async function request(method: 'GET' | 'PUT', body?: unknown): Promise<unknown> {
    const token = await getToken();
    if (!token) throw new UserAvatarRequestError(401, 'AUTH_REQUIRED');
    const response = await fetcher(url, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      let code: string | undefined;
      try {
        const payload = (await response.json()) as { code?: unknown; message?: unknown };
        code = typeof payload.code === 'string' ? payload.code : undefined;
      } catch {
        // The status code is enough.
      }
      throw new UserAvatarRequestError(response.status, code);
    }
    return response.json();
  }

  return {
    get: async () => {
      const payload = await request('GET');
      const photo =
        payload && typeof payload === 'object'
          ? (payload as Record<string, unknown>).socialUrl
          : null;
      return {
        choice: normalizeChoice(payload),
        socialUrl:
          typeof photo === 'string' && /^https:\/\//i.test(photo.trim()) ? photo.trim() : null,
      };
    },
    set: async (kind, ref) => normalizeChoice(await request('PUT', { kind, ref: ref ?? null })),
  };
}

/** The social photo of the session user: avatarUrl, or the picture the provider sent. */
export function socialAvatarUrl(
  user: { avatarUrl?: string | null; metadata?: Record<string, unknown> | null } | null | undefined
): string | null {
  const metadata = user?.metadata ?? {};
  const candidates = [
    user?.avatarUrl,
    metadata.avatarUrl,
    metadata.avatar_url,
    metadata.picture,
    metadata.image,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && /^https:\/\//i.test(candidate.trim())) {
      return candidate.trim();
    }
  }
  return null;
}

// A tiny shared store so every avatar (profile, top bar, menus) updates at once.
let state: UserAvatarState = { choice: DEFAULT_AVATAR_CHOICE, socialUrl: null };
const listeners = new Set<() => void>();

export function getUserAvatarState(): UserAvatarState {
  return state;
}

export function setUserAvatarState(next: Partial<UserAvatarState>): void {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export function resetUserAvatarState(): void {
  setUserAvatarState({ choice: DEFAULT_AVATAR_CHOICE, socialUrl: null });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUserAvatarState(): UserAvatarState {
  return useSyncExternalStore(subscribe, getUserAvatarState, getUserAvatarState);
}
