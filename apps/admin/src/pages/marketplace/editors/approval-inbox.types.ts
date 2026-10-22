import type { AdminRole } from '../../../auth/oidc-client';
import type { ActivityCompletion, Project, ProjectActivity } from '../../../marketplace/api';

export type ApprovalInboxProps = {
  project: Project;
  activities: ProjectActivity[];
  completions: ActivityCompletion[];
  roles: readonly AdminRole[];
  onChanged: (message: string) => void;
};
