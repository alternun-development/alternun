import type { AccessRow } from '../../marketplace/project-access.types';

export type ProjectAccessState =
  | { kind: 'loading' }
  | { kind: 'success'; rows: AccessRow[] }
  | { kind: 'error'; error: unknown };

export type ProjectAccessTableProps = {
  rows: readonly AccessRow[];
};
