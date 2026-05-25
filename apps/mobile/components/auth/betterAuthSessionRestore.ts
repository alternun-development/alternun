export interface BetterAuthSessionLike {
  issuerAccessToken?: string | null;
}

export interface BetterAuthSessionRestoreClient {
  refreshExecutionSession?: () => Promise<unknown>;
  getSessionToken?: () => Promise<string | null>;
  getUser?: () => Promise<unknown>;
  getAlternunSession?: () => Promise<BetterAuthSessionLike | null>;
}

export interface BetterAuthSessionRestoreOptions {
  retries?: number;
  retryDelayMs?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function extractSessionToken(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const nested = raw.data;
  const session = nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : null;

  const tokenCandidates = [
    raw.issuerAccessToken,
    raw.accessToken,
    raw.token,
    session?.issuerAccessToken,
    session?.accessToken,
    session?.token,
  ];

  for (const candidate of tokenCandidates) {
    if (isNonEmptyString(candidate)) {
      return candidate.trim();
    }
  }

  return null;
}

export async function restoreBetterAuthSession(
  client: BetterAuthSessionRestoreClient,
  options: BetterAuthSessionRestoreOptions = {}
): Promise<boolean> {
  const attempts = Math.max(1, options.retries ?? 3);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 300);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (typeof client.refreshExecutionSession === 'function') {
      const refreshedSession = await client.refreshExecutionSession().catch(() => null);
      if (extractSessionToken(refreshedSession)) {
        return true;
      }
    }

    if (typeof client.getSessionToken === 'function') {
      const sessionToken = await client.getSessionToken().catch(() => null);
      if (isNonEmptyString(sessionToken)) {
        return true;
      }
    }

    if (typeof client.getUser === 'function') {
      const user = await client.getUser().catch(() => null);
      if (user) {
        return true;
      }
    }

    const session =
      typeof client.getAlternunSession === 'function'
        ? await client.getAlternunSession().catch(() => null)
        : null;

    if (extractSessionToken(session)) {
      return true;
    }

    if (attempt < attempts - 1 && retryDelayMs > 0) {
      await delay(retryDelayMs);
    }
  }

  return false;
}
