import type { ProjectType } from '../../marketplace/project-types.types';

export type ProjectTypesState =
  | { kind: 'loading' }
  | { kind: 'success'; data: ProjectType[] }
  | { kind: 'error'; error: unknown };

export type ProjectTypeRowProps = {
  type: ProjectType;
  busy: boolean;
  canManage: boolean;
  onToggleDocument: (type: ProjectType) => void;
  onToggleActive: (type: ProjectType) => void;
};
