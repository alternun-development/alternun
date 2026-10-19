import type { AdminRole } from '../../../auth/oidc-client';
import type { Project, ProjectActivity } from '../../../marketplace/api';

export type ActivityEditorProps = {
  project: Project;
  activities: ProjectActivity[];
  roles: readonly AdminRole[];
  onChanged: (message: string) => void;
};

export type ActivityDraft = {
  id?: string;
  title: string;
  description: string;
  defaultPoints: string;
  maximumPoints: string;
  content?: ProjectActivity['content'];
};
