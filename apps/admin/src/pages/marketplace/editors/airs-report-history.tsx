import { useEffect, useState } from 'react';
import { requestMarketplace } from '../../../marketplace/api';
import { airsReportDetailPath, describeTimelineAction } from '../../../marketplace/airs-reports';
import type { AirsReportDetail } from '../../../marketplace/airs-reports.types';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import type {
  AirsReportHistoryProps,
  AirsReportHistoryState,
  AirsReportHistoryViewProps,
} from './airs-report-history.types';

const copy = marketplaceCopy.airsReports.history;

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? marketplaceCopy.common.notAvailable
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function AirsReportHistoryView({ detail }: AirsReportHistoryViewProps): JSX.Element {
  const timeline = detail.timeline ?? [];
  const rewards = detail.rewards ?? [];
  return (
    <div className='airs-report-history'>
      <h5>{copy.heading}</h5>
      {timeline.length === 0 ? (
        <p>{copy.empty}</p>
      ) : (
        <ol className='airs-report-timeline'>
          {timeline.map((entry, index) => (
            <li
              className={entry.result === 'denied' ? 'is-denied' : undefined}
              key={`${entry.action}-${entry.occurredAt}-${index}`}
            >
              <span>{describeTimelineAction(entry)}</span>
              <small>{formatDateTime(entry.occurredAt)}</small>
            </li>
          ))}
        </ol>
      )}
      <h5>{copy.rewardsHeading}</h5>
      {rewards.length === 0 ? (
        <p>{copy.rewardsEmpty}</p>
      ) : (
        <ul className='airs-report-rewards'>
          {rewards.map((reward) => (
            <li key={reward.kind}>
              <strong>{copy.rewardKind[reward.kind]}</strong>
              <span>
                {reward.amount} Airs · {copy.rewardStatus[reward.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AirsReportHistory({ reportId }: AirsReportHistoryProps): JSX.Element {
  const [state, setState] = useState<AirsReportHistoryState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ kind: 'loading' });
    requestMarketplace<AirsReportDetail>(airsReportDetailPath(reportId))
      .then((data) => {
        if (active) setState({ kind: 'success', data });
      })
      .catch((error: unknown) => {
        if (active) setState({ kind: 'error', error });
      });
    return () => {
      active = false;
    };
  }, [reportId]);

  if (state.kind === 'loading') return <p>{copy.loading}</p>;
  if (state.kind === 'error') {
    return <p className='error-text'>{marketplaceErrorMessage(state.error)}</p>;
  }
  return <AirsReportHistoryView detail={state.data} />;
}
