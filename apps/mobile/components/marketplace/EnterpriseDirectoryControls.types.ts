import type { EnterpriseDirectoryView, EnterprisePalette, Translate } from './types';

export interface EnterpriseViewSwitcherProps {
  view: EnterpriseDirectoryView;
  palette: EnterprisePalette;
  t: Translate;
  onChange: (view: EnterpriseDirectoryView) => void;
}

export interface EnterprisePaginationProps {
  page: number;
  pageCount: number;
  palette: EnterprisePalette;
  t: Translate;
  onChange: (page: number) => void;
}
