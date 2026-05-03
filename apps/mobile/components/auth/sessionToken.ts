type SessionTokenClient = {
  getSessionToken: () => Promise<string | null>;
  getUser?: () => Promise<unknown>;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function resolveSessionTokenWithRetry(
  client: SessionTokenClient,
  options: {
    attempts?: number;
    retryDelayMs?: number;
  } = {}
): Promise<string | null> {
  const attempts = Math.max(1, options.attempts ?? 4);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 250);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const token = await client.getSessionToken().catch(() => null);
    if (typeof token === 'string' && token.trim().length > 0) {
      return token.trim();
    }

    if (attempt < attempts - 1) {
      if (client.getUser) {
        await client.getUser().catch(() => null);
      }
      if (retryDelayMs > 0) {
        await delay(retryDelayMs);
      }
    }
  }

  return null;
}
