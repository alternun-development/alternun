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

/** The subset of a web keyboard event the view switcher reacts to. */
export interface DirectoryKeyEvent {
  nativeEvent: { key: string };
  preventDefault?: () => void;
}
