export interface BetterAuthSessionLike {
  issuerAccessToken?: string | null;
}

export interface BetterAuthSessionRestoreClient {
  refreshExecutionSession?: () => Promise<unknown>;
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

export async function restoreBetterAuthSession(
  client: BetterAuthSessionRestoreClient,
  options: BetterAuthSessionRestoreOptions = {}
): Promise<boolean> {
  const attempts = Math.max(1, options.retries ?? 3);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 300);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (typeof client.refreshExecutionSession === 'function') {
      await client.refreshExecutionSession().catch(() => undefined);
    }

    const session =
      typeof client.getAlternunSession === 'function'
        ? await client.getAlternunSession().catch(() => null)
        : null;

    if (session?.issuerAccessToken) {
      return true;
    }

    if (attempt < attempts - 1 && retryDelayMs > 0) {
      await delay(retryDelayMs);
    }
  }

  return false;
}
