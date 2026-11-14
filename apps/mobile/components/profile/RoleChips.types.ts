import type { AdminAccessScope } from '../../utils/adminAccess';

export interface RoleChipsProps {
  roles: readonly string[];
  /** Per-project/enterprise memberships, shown under their role when `showScopes` is set. */
  scopes?: readonly AdminAccessScope[];
  showScopes?: boolean;
  accent: string;
  muted: string;
  align?: 'center' | 'flex-start';
}
