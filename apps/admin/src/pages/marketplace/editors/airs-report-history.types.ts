import type { AirsReportDetail } from '../../../marketplace/airs-reports.types';

export type AirsReportHistoryProps = {
  reportId: string;
};

export type AirsReportHistoryViewProps = {
  detail: AirsReportDetail;
};

export type AirsReportHistoryState =
  | { kind: 'loading' }
  | { kind: 'success'; data: AirsReportDetail }
  | { kind: 'error'; error: unknown };
