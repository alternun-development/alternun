// Tiny in-memory TTL cache for chain balance/activity lookups (task 07). In-memory is fine for
// v1 given Lambda's per-instance lifetime (cache hits only help within a warm instance, cold
// starts just miss and re-fetch) — revisit with a shared store (Redis/DynamoDB) if cold-start
// cache-misses against rate-limited public RPCs become a real problem.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const TTL_MS = 60_000; // balances/activity don't need to be real-time; public RPCs are rate-limited.
const store = new Map<string, CacheEntry<unknown>>();

export async function withTtlCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = store.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const value = await fetcher();
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}
