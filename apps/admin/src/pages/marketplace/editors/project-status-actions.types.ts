import type { AdminRole } from '../../../auth/oidc-client';
import type { Project, ProjectStatus } from '../../../marketplace/api';
import type { MarketplacePermission } from '../../../marketplace/permissions';

export type ProjectStatusAction = 'publish' | 'pause' | 'resume' | 'archive';

export type ProjectStatusActionDefinition = {
  target: ProjectStatus;
  permission: MarketplacePermission;
  requiresReason: boolean;
  effect: string;
};

export type ProjectStatusActionsProps = {
  project: Project;
  roles: readonly AdminRole[];
  ready: boolean;
  onChanged: (message: string) => void;
};
