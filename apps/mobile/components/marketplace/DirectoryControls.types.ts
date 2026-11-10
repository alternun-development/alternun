import type { SearchFilterOption } from '../common/SearchFilterBar';
import type { DirectoryView, EnterprisePalette, Translate } from './types';

/** Colors the shared directory controls read; both Explorer palettes satisfy it. */
export type DirectoryControlsPalette = Pick<
  EnterprisePalette,
  'surface' | 'border' | 'text' | 'muted' | 'primaryDeep' | 'fill'
>;

export interface DirectoryControlsProps {
  /** Test ID prefix, e.g. `enterprise` gives `enterprise-search-input` and `enterprise-view-list`. */
  idPrefix: string;
  query: string;
  onQueryChange: (query: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  view: DirectoryView;
  onViewChange: (view: DirectoryView) => void;
  palette: DirectoryControlsPalette;
  t: Translate;
  /** Filter menu options; the first one means "no filter". Hidden with fewer than two. */
  filters?: readonly SearchFilterOption[];
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
  /** Heading of the filter menu. */
  filterLabel?: string;
}

export interface DirectoryPaginationProps {
  idPrefix: string;
  label: string;
  page: number;
  pageCount: number;
  palette: DirectoryControlsPalette;
  t: Translate;
  onChange: (page: number) => void;
}
