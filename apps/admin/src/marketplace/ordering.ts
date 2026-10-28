import { requestMarketplace } from './api';

/** Returns the ids with the item at `index` moved one place up (-1) or down (+1). */
export function moveId(ids: readonly string[], index: number, delta: -1 | 1): string[] {
  const target = index + delta;
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) return [...ids];
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function saveMarketplaceOrder<T>(
  collection: 'enterprises' | 'projects',
  ids: readonly string[]
): Promise<T[]> {
  return requestMarketplace<T[]>(`/v1/admin/${collection}/order`, {
    method: 'PUT',
    body: { ids },
  });
}
