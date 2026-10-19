import type { AdminRole } from '../../auth/oidc-client';
import type { Enterprise, Project } from '../../marketplace/api';

export type ProjectDraft = {
  name: string;
  slug: string;
  categoryCode: string;
  enterpriseId: string;
  location: string;
  timeZone: string;
  defaultLocale: string;
  theme: string;
  description: string;
  contribution: string;
};

export type ProjectCreateWizardProps = {
  enterprises: Enterprise[];
  roles: readonly AdminRole[];
  onCancel: () => void;
  onCreated: (project: Project) => void;
  onEnterpriseCreated: (enterprise: Enterprise) => void;
};
