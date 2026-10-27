import type { AdminRole } from '../../../auth/oidc-client';
import type { Project } from '../../../marketplace/api';
import type { ProjectMedal } from '../../../marketplace/medals.types';

export type MedalEditorProps = {
  project: Project;
  roles: readonly AdminRole[];
};

export type MedalsState =
  | { kind: 'loading' }
  | { kind: 'success'; data: ProjectMedal[] }
  | { kind: 'error'; error: unknown };
