import { useState } from 'react';
import type { AdminRole } from '../../../auth/oidc-client';
import {
  requestMarketplace,
  type ActivityCompletion,
  type Project,
  type ProjectActivity,
} from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import { hasMarketplacePermission } from '../../../marketplace/permissions';
import { SectionMessage } from '../components';

type Props = {
  project: Project;
  activities: ProjectActivity[];
  completions: ActivityCompletion[];
  roles: readonly AdminRole[];
  onChanged: (message: string) => void;
};

export function completionActionAvailability(roles: readonly AdminRole[]): {
  approve: boolean;
  reject: boolean;
  reverse: boolean;
} {
  return {
    approve: hasMarketplacePermission(roles, 'completions:award'),
    reject: hasMarketplacePermission(roles, 'completions:reject'),
    reverse: hasMarketplacePermission(roles, 'completions:reverse'),
  };
}

function activityTitle(activity: ProjectActivity | undefined): string {
  if (!activity) return marketplaceCopy.common.notAvailable;
  return (
    activity.content[activity.defaultLocale]?.title ??
    Object.values(activity.content)[0]?.title ??
    marketplaceCopy.common.notAvailable
  );
}

export function ApprovalInbox({
  project,
  activities,
  completions,
  roles,
  onChanged,
}: Props): JSX.Element {
  const [error, setError] = useState<unknown>();
  const [savingId, setSavingId] = useState<string>();
  const [reversing, setReversing] = useState<ActivityCompletion>();
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const pending = completions.filter((completion) => completion.status === 'pending');
  const awarded = completions.filter((completion) => completion.status === 'awarded');
  const {
    approve: canApprove,
    reject: canReject,
    reverse: canReverse,
  } = completionActionAvailability(roles);

  async function decide(completion: ActivityCompletion, action: 'award' | 'reject'): Promise<void> {
    setSavingId(completion.id);
    setError(undefined);
    try {
      await requestMarketplace(
        `/v1/admin/projects/${project.id}/completions/${completion.id}/${action}`,
        { method: 'POST', body: {} }
      );
      onChanged(
        action === 'award'
          ? marketplaceCopy.approvals.approveSuccess
          : marketplaceCopy.approvals.rejectSuccess
      );
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSavingId(undefined);
    }
  }

  async function reverse(): Promise<void> {
    if (!reversing) return;
    if (!reason.trim()) {
      setReasonError(marketplaceCopy.actions.reasonRequired);
      return;
    }
    setSavingId(reversing.id);
    setError(undefined);
    try {
      await requestMarketplace(
        `/v1/admin/projects/${project.id}/completions/${reversing.id}/reverse`,
        { method: 'POST', body: { reason: reason.trim() } }
      );
      setReversing(undefined);
      setReason('');
      onChanged(marketplaceCopy.approvals.reverseSuccess);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSavingId(undefined);
    }
  }

  return (
    <section className='panel'>
      <h3>{marketplaceCopy.approvals.heading}</h3>
      {error ? <p className='error-text'>{marketplaceErrorMessage(error)}</p> : null}
      {!pending.length ? (
        <SectionMessage>{marketplaceCopy.approvals.empty}</SectionMessage>
      ) : (
        <div className='marketplace-card-grid'>
          {pending.map((completion, index) => {
            const activity = activities.find((item) => item.id === completion.activityId);
            return (
              <article className='metric-card' key={completion.id}>
                <dl className='record-grid'>
                  <div>
                    <dt>{marketplaceCopy.approvals.user}</dt>
                    <dd>
                      {marketplaceCopy.projectDetail.team.member} {index + 1}
                    </dd>
                  </div>
                  <div>
                    <dt>{marketplaceCopy.approvals.activity}</dt>
                    <dd>{activityTitle(activity)}</dd>
                  </div>
                  <div>
                    <dt>{marketplaceCopy.approvals.points}</dt>
                    <dd>{activity?.defaultAirsAmount ?? marketplaceCopy.common.notAvailable}</dd>
                  </div>
                </dl>
                <div className='marketplace-form-actions'>
                  <button
                    className='primary-button'
                    disabled={!canApprove || savingId === completion.id}
                    onClick={() => void decide(completion, 'award')}
                    title={!canApprove ? marketplaceCopy.permissions.award : undefined}
                    type='button'
                  >
                    {marketplaceCopy.approvals.approve}
                  </button>
                  <button
                    className='secondary-button'
                    disabled={!canReject || savingId === completion.id}
                    onClick={() => void decide(completion, 'reject')}
                    title={!canReject ? marketplaceCopy.permissions.unavailable : undefined}
                    type='button'
                  >
                    {marketplaceCopy.approvals.reject}
                  </button>
                </div>
                {!canApprove ? <small>{marketplaceCopy.permissions.award}</small> : null}
              </article>
            );
          })}
        </div>
      )}

      {canReverse && awarded.length ? (
        <details className='marketplace-secondary-menu'>
          <summary>{marketplaceCopy.approvals.more}</summary>
          {awarded.map((completion) => (
            <button
              className='secondary-button'
              key={completion.id}
              onClick={() => setReversing(completion)}
              type='button'
            >
              {marketplaceCopy.approvals.reverse}:{' '}
              {activityTitle(activities.find((activity) => activity.id === completion.activityId))}
            </button>
          ))}
        </details>
      ) : null}

      {reversing ? (
        <div aria-modal='true' className='marketplace-confirmation' role='dialog'>
          <h4>{marketplaceCopy.approvals.reverseTitle}</h4>
          <p>{marketplaceCopy.approvals.reverseEffect}</p>
          <label>
            <span>{marketplaceCopy.approvals.reason}</span>
            <textarea
              rows={3}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError('');
              }}
            />
          </label>
          {reasonError ? <strong className='error-text'>{reasonError}</strong> : null}
          <div className='marketplace-form-actions'>
            <button
              className='secondary-button'
              onClick={() => setReversing(undefined)}
              type='button'
            >
              {marketplaceCopy.actions.cancel}
            </button>
            <button
              className='primary-button'
              disabled={Boolean(savingId)}
              onClick={() => void reverse()}
              type='button'
            >
              {marketplaceCopy.actions.confirm}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
