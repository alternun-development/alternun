import type { AdminRole } from '../../../auth/oidc-client';
import type { Project, ProjectMedia } from '../../../marketplace/api';

export type MediaEditorProps = {
  project: Project;
  media: ProjectMedia[];
  roles: readonly AdminRole[];
  onChanged: (message: string) => void;
};
