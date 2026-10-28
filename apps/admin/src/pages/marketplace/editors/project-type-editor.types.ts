import type { AdminRole } from '../../../auth/oidc-client';
import type { Project } from '../../../marketplace/api';
import type { ProjectType } from '../../../marketplace/project-types.types';

export type ProjectTypeEditorProps = {
  project: Project;
  roles: readonly AdminRole[];
  onChanged: (message: string) => void;
};

export type ProjectTypeOptionsState =
  | { kind: 'loading' }
  | { kind: 'success'; data: ProjectType[] }
  | { kind: 'error'; error: unknown };
