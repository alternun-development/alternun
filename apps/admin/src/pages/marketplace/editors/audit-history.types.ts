import type { AdminRole } from '../../../auth/oidc-client';
import type { AuditPage, Project } from '../../../marketplace/api';

export type AuditFilter = 'all' | 'changes' | 'denied';

export type AuditState =
  | { kind: 'loading' }
  | { kind: 'forbidden' }
  | { kind: 'error'; error: unknown }
  | { kind: 'success'; page: AuditPage };

export type AuditHistoryProps = {
  /** Project whose history is listed. */
  project?: Project;
  /** When set, the enterprise history is listed instead of a project's. */
  enterpriseId?: string;
  roles: readonly AdminRole[];
};
