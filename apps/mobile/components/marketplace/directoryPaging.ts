import type { DirectoryScope, DirectoryView } from './types';

export const DIRECTORY_VIEWS: readonly DirectoryView[] = ['list', 'grid', 'compact'];

export const DIRECTORY_PAGE_SIZE: Readonly<Record<DirectoryView, number>> = {
  list: 3,
  grid: 4,
  compact: 6,
};

export function directoryPageCount(total: number, view: DirectoryView): number {
  return Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE[view]));
}

/** Items for a 1-based page, clamping the page into range. */
export function directoryPageItems<T>(items: readonly T[], view: DirectoryView, page: number): T[] {
  const size = DIRECTORY_PAGE_SIZE[view];
  const current = Math.min(Math.max(1, page), directoryPageCount(items.length, view));
  return items.slice((current - 1) * size, current * size);
}

// Remembered per directory for the lifetime of the JS session (until the app or tab reloads).
const rememberedViews: Record<DirectoryScope, DirectoryView> = {
  projects: 'list',
  enterprises: 'list',
};

export function getRememberedDirectoryView(scope: DirectoryScope): DirectoryView {
  return rememberedViews[scope];
}

export function rememberDirectoryView(scope: DirectoryScope, view: DirectoryView): void {
  rememberedViews[scope] = view;
}
