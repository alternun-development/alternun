import type { AdminRole } from '../../../auth/oidc-client';
import type { Project } from '../../../marketplace/api';
import type {
  AirsReportRecipientLookup,
  AirsReportRecord,
  SubmitAirsReportResponse,
} from '../../../marketplace/airs-reports.types';

export type AirsReportEditorProps = {
  project: Project;
  roles: readonly AdminRole[];
};

export type RecentReportsState =
  | { kind: 'loading' }
  | { kind: 'success'; data: AirsReportRecord[] }
  | { kind: 'forbidden' }
  | { kind: 'error'; error: unknown };

export type LookupState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'done'; lookup: AirsReportRecipientLookup }
  | { kind: 'error'; error: unknown };

export type FormStep = 'edit' | 'confirm' | 'done';

export type SubmittedState = {
  response: SubmitAirsReportResponse;
};
