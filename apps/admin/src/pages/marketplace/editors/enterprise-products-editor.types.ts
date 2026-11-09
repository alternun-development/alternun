import type { AdminRole } from '../../../auth/oidc-client';
import type { Enterprise } from '../../../marketplace/api';

export type EnterpriseProductsEditorProps = {
  enterprise: Enterprise;
  roles: readonly AdminRole[];
  onChanged: (message: string) => void;
};
