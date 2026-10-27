import { useCallback, useEffect, useState } from 'react';
import { MarketplaceRequestError, requestMarketplace } from '../../marketplace/api';
import {
  airsReportActionPath,
  airsReportDetailPath,
  airsReportQueuePath,
  airsReportRejectReasonError,
  formatAirs,
} from '../../marketplace/airs-reports';
import type {
  AirsReportDetail,
  AirsReportRecord,
  AirsReportTransition,
} from '../../marketplace/airs-reports.types';
import { marketplaceCopy, marketplaceErrorMessage } from '../../marketplace/copy';
import { useMarketplaceRoles } from '../../marketplace/permissions';
import { LoadingPanel, SectionMessage } from './components';
import { AirsReportStatusPill } from './editors/airs-report-editor';
import type { DetailState, QueueItemProps, QueueState } from './airs-report-queue-page.types';

const copy = marketplaceCopy.airsReports.queue;

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? marketplaceCopy.common.notAvailable
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function QueueItem({ report, busy, onApprove, onReject }: QueueItemProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<DetailState>({ kind: 'loading' });

  function toggle(): void {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setDetail({ kind: 'loading' });
    requestMarketplace<AirsReportDetail>(airsReportDetailPath(report.id))
      .then((data) => setDetail({ kind: 'success', data }))
      .catch((error: unknown) => setDetail({ kind: 'error', error }));
  }

  // The hash approved is the one just reviewed; a changed report is refused by the server.
  const reviewedHash =
    detail.kind === 'success' ? detail.data.report.snapshotHash : report.snapshotHash;

  return (
    <article className='metric-card'>
      <AirsReportStatusPill status={report.status} />
      <h4>{formatAirs(report.amount)}</h4>
      <p>
        {copy.guest}: {report.recipientName ?? report.recipientEmail}
        {report.recipientName ? ` (${report.recipientEmail})` : ''}
      </p>
      <small>
        {copy.submittedOn} {formatDate(report.submittedAt)} · {copy.document}:{' '}
        {report.documentNumber ?? marketplaceCopy.common.notAvailable}
      </small>
      <p>
        <strong>{copy.reason}:</strong> {report.concept}
      </p>

      {open ? (
        <div className='marketplace-inline-form'>
          <h5>{copy.totalsHeading}</h5>
          {detail.kind === 'loading' ? <p>{copy.loading}</p> : null}
          {detail.kind === 'error' ? (
            <p className='error-text' role='alert'>
              {marketplaceErrorMessage(detail.error)}
            </p>
          ) : null}
          {detail.kind === 'success' ? (
            <>
              <p>
                {copy.totalDay(
                  detail.data.recipientTotals.dailyTotal,
                  detail.data.recipientTotals.dailyLimit
                )}
              </p>
              <p>
                {copy.totalMonth(
                  detail.data.recipientTotals.monthlyTotal,
                  detail.data.recipientTotals.monthlyLimit
                )}
              </p>
            </>
          ) : null}
        </div>
      ) : null}

      <div className='marketplace-compact-actions'>
        <button className='secondary-button' onClick={toggle} type='button'>
          {open ? copy.hideDetails : copy.details}
        </button>
        <button
          className='primary-button'
          disabled={busy}
          onClick={() => onApprove(report, reviewedHash)}
          type='button'
        >
          {copy.approve}
        </button>
        <button
          className='secondary-button'
          disabled={busy}
          onClick={() => onReject(report)}
          type='button'
        >
          {copy.reject}
        </button>
      </div>
    </article>
  );
}

export function AirsReportQueuePage(): JSX.Element {
  const roles = useMarketplaceRoles();
  const [state, setState] = useState<QueueState>({ kind: 'loading' });
  const [rejecting, setRejecting] = useState<AirsReportRecord>();
  const [reason, setReason] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [success, setSuccess] = useState<string>();

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    requestMarketplace<AirsReportRecord[]>(airsReportQueuePath)
      .then((data) => setState({ kind: 'success', data }))
      .catch((requestError: unknown) =>
        setState(
          requestError instanceof MarketplaceRequestError &&
            (requestError.code === 'AIRS_REPORT_APPROVER_NOT_ALLOWED' ||
              requestError.status === 403)
            ? { kind: 'not-approver' }
            : { kind: 'error', error: requestError }
        )
      );
  }, []);

  useEffect(load, [load]);

  async function approve(report: AirsReportRecord, snapshotHash: string): Promise<void> {
    setBusy(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await requestMarketplace<AirsReportTransition>(airsReportActionPath(report.id, 'approve'), {
        method: 'POST',
        body: { snapshotHash },
      });
      setSuccess(copy.approved);
      load();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusy(false);
    }
  }

  async function reject(): Promise<void> {
    if (!rejecting) return;
    const reasonError = airsReportRejectReasonError(reason);
    if (reasonError) {
      setFieldError(reasonError);
      return;
    }
    setBusy(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await requestMarketplace<AirsReportTransition>(airsReportActionPath(rejecting.id, 'reject'), {
        method: 'POST',
        body: { reason: reason.trim() },
      });
      setRejecting(undefined);
      setReason('');
      setSuccess(copy.rejected);
      load();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusy(false);
    }
  }

  if (!roles || state.kind === 'loading') return <LoadingPanel />;

  return (
    <div className='page-grid'>
      <section className='panel hero-panel'>
        <h2>{copy.heading}</h2>
        <p>{copy.intro}</p>
      </section>

      {success ? (
        <p className='marketplace-success' role='status'>
          {success}
        </p>
      ) : null}
      {error ? (
        <p className='error-text' role='alert'>
          {marketplaceErrorMessage(error)}
        </p>
      ) : null}

      {state.kind === 'not-approver' ? (
        <section className='panel'>
          <SectionMessage>{copy.notApprover}</SectionMessage>
        </section>
      ) : null}

      {state.kind === 'error' ? (
        <section className='panel' role='alert'>
          <p className='error-text'>{marketplaceErrorMessage(state.error)}</p>
          <button className='secondary-button' onClick={load} type='button'>
            {marketplaceCopy.common.retry}
          </button>
        </section>
      ) : null}

      {state.kind === 'success' ? (
        <section className='panel'>
          {state.data.length === 0 ? (
            <SectionMessage>{copy.empty}</SectionMessage>
          ) : (
            <div className='marketplace-card-grid'>
              {state.data.map((report) => (
                <QueueItem
                  busy={busy}
                  key={report.id}
                  onApprove={(item, hash) => void approve(item, hash)}
                  onReject={(item) => {
                    setRejecting(item);
                    setReason('');
                    setFieldError('');
                  }}
                  report={report}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {rejecting ? (
        <div aria-modal='true' className='marketplace-confirmation' role='dialog'>
          <h4>{copy.rejectTitle}</h4>
          <p>{copy.rejectEffect}</p>
          <label>
            <span>{copy.rejectReason}</span>
            <textarea
              rows={3}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setFieldError('');
              }}
            />
          </label>
          {fieldError ? <strong className='error-text'>{fieldError}</strong> : null}
          <div className='marketplace-form-actions'>
            <button
              className='secondary-button'
              disabled={busy}
              onClick={() => setRejecting(undefined)}
              type='button'
            >
              {copy.cancel}
            </button>
            <button
              className='primary-button'
              disabled={busy}
              onClick={() => void reject()}
              type='button'
            >
              {copy.confirmReject}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
