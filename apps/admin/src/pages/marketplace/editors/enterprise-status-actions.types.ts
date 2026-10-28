import type { AdminRole } from '../../../auth/oidc-client';
import type { Enterprise, EnterpriseStatus } from '../../../marketplace/api';

export type EnterpriseStatusAction = 'pause' | 'resume' | 'archive';

export type EnterpriseStatusActionDefinition = {
  target: EnterpriseStatus;
  requiresReason: boolean;
  effect: string;
};

export type EnterpriseStatusActionsProps = {
  enterprise: Enterprise;
  roles: readonly AdminRole[];
  onChanged: (enterprise: Enterprise) => void;
};
