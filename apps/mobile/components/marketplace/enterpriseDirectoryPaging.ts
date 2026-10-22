import type { EnterpriseDirectoryView } from './types';

export const ENTERPRISE_DIRECTORY_VIEWS: readonly EnterpriseDirectoryView[] = [
  'list',
  'grid',
  'compact',
];

export const ENTERPRISE_PAGE_SIZE: Readonly<Record<EnterpriseDirectoryView, number>> = {
  list: 3,
  grid: 4,
  compact: 6,
};

export function enterprisePageCount(total: number, view: EnterpriseDirectoryView): number {
  return Math.max(1, Math.ceil(total / ENTERPRISE_PAGE_SIZE[view]));
}

/** Items for a 1-based page, clamping the page into range. */
export function enterprisePageItems<T>(
  items: readonly T[],
  view: EnterpriseDirectoryView,
  page: number
): T[] {
  const size = ENTERPRISE_PAGE_SIZE[view];
  const current = Math.min(Math.max(1, page), enterprisePageCount(items.length, view));
  return items.slice((current - 1) * size, current * size);
}

// Remembered for the lifetime of the JS session (until the app or tab reloads).
let rememberedView: EnterpriseDirectoryView = 'list';

export function getRememberedEnterpriseView(): EnterpriseDirectoryView {
  return rememberedView;
}

export function rememberEnterpriseView(view: EnterpriseDirectoryView): void {
  rememberedView = view;
}
