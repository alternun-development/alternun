import type { AdminRole } from '../../../auth/oidc-client';
import type { Project } from '../../../marketplace/api';

export type ContentEditorProps = {
  project: Project;
  roles: readonly AdminRole[];
  onSaved: () => void;
};
