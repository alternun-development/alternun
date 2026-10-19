import type { AdminRole } from '../../../auth/oidc-client';
import type {
  ParticipantHistory,
  Project,
  ProjectActivity,
  ProjectParticipant,
} from '../../../marketplace/api';

export type ParticipantEditorProps = {
  project: Project;
  participants: ProjectParticipant[];
  activities: ProjectActivity[];
  roles: readonly AdminRole[];
  onChanged: (message: string) => void;
};

export type HistoryState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; data: ParticipantHistory[] }
  | { kind: 'forbidden' }
  | { kind: 'error'; error: unknown };
