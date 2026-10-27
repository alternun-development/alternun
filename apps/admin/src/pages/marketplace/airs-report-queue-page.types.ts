import type { AirsReportDetail, AirsReportRecord } from '../../marketplace/airs-reports.types';

export type QueueState =
  | { kind: 'loading' }
  | { kind: 'success'; data: AirsReportRecord[] }
  | { kind: 'not-approver' }
  | { kind: 'error'; error: unknown };

export type DetailState =
  | { kind: 'loading' }
  | { kind: 'success'; data: AirsReportDetail }
  | { kind: 'error'; error: unknown };

export type QueueItemProps = {
  report: AirsReportRecord;
  busy: boolean;
  onApprove: (report: AirsReportRecord, snapshotHash: string) => void;
  onReject: (report: AirsReportRecord) => void;
};
