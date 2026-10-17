import { useEffect, useState } from 'react';
import type { AdminRole } from '../../../auth/oidc-client';
import {
  MarketplaceRequestError,
  requestMarketplace,
  type CommentStatus,
  type Project,
  type ProjectComment,
} from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import { hasMarketplacePermission } from '../../../marketplace/permissions';
import type { SectionResult } from '../../../marketplace/project-detail-model';
import { SectionMessage, StatusPill } from '../components';

const statuses: CommentStatus[] = ['pending', 'visible', 'hidden', 'rejected'];
type ModerationAction = 'approve' | 'reject' | 'hide' | 'restore';
type QueueState = SectionResult<ProjectComment[]> | { kind: 'loading' };

type Props = {
  project: Project;
  initialPending: SectionResult<ProjectComment[]>;
  roles: readonly AdminRole[];
  onChanged: (message: string, pendingDelta: number) => void;
};

export function commentsForStatus(
  comments: readonly ProjectComment[],
  status: CommentStatus
): ProjectComment[] {
  return comments.filter((comment) => comment.status === status);
}

export function commentActionAvailability(
  roles: readonly AdminRole[],
  status: CommentStatus
): Record<ModerationAction, boolean> {
  const canModerate = hasMarketplacePermission(roles, 'comments:moderate');
  return {
    approve: canModerate && status === 'pending',
    reject: canModerate && status === 'pending',
    hide: canModerate && status === 'visible',
    restore: canModerate && status === 'hidden',
  };
}

export function commentReasonError(action: ModerationAction, reason: string): string | null {
  return (action === 'reject' || action === 'hide') && !reason.trim()
    ? marketplaceCopy.comments.reasonRequired
    : null;
}

export function relativeCommentDate(value: string, now = Date.now()): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return marketplaceCopy.common.notAvailable;
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return marketplaceCopy.comments.relative.justNow;
  if (minutes === 1) return marketplaceCopy.comments.relative.minuteAgo;
  if (minutes < 60) return `${minutes} ${marketplaceCopy.comments.relative.minutesAgo}`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return marketplaceCopy.comments.relative.hourAgo;
  if (hours < 24) return `${hours} ${marketplaceCopy.comments.relative.hoursAgo}`;
  const days = Math.floor(hours / 24);
  return days === 1
    ? marketplaceCopy.comments.relative.dayAgo
    : `${days} ${marketplaceCopy.comments.relative.daysAgo}`;
}

export function CommentModerationQueue({
  project,
  initialPending,
  roles,
  onChanged,
}: Props): JSX.Element {
  const [status, setStatus] = useState<CommentStatus>('pending');
  const [result, setResult] = useState<QueueState>(initialPending);
  const [actionError, setActionError] = useState<unknown>();
  const [savingId, setSavingId] = useState<string>();
  const [confirmation, setConfirmation] = useState<{
    comment: ProjectComment;
    action: 'reject' | 'hide';
  }>();
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  useEffect(() => {
    setStatus('pending');
    setResult(initialPending);
  }, [project.id, initialPending]);

  async function load(nextStatus: CommentStatus): Promise<void> {
    setResult({ kind: 'loading' });
    setActionError(undefined);
    try {
      const comments = await requestMarketplace<ProjectComment[]>(
        `/v1/admin/projects/${project.id}/comments?status=${nextStatus}`
      );
      setResult({ kind: 'success', data: commentsForStatus(comments, nextStatus) });
    } catch (error) {
      setResult(
        error instanceof MarketplaceRequestError && error.status === 403
          ? { kind: 'forbidden' }
          : { kind: 'error', error }
      );
    }
  }

  function chooseStatus(nextStatus: CommentStatus): void {
    setStatus(nextStatus);
    void load(nextStatus);
  }

  async function moderate(
    comment: ProjectComment,
    action: ModerationAction,
    moderationReason?: string
  ): Promise<void> {
    setSavingId(comment.id);
    setActionError(undefined);
    try {
      await requestMarketplace(
        `/v1/admin/projects/${project.id}/comments/${comment.id}/${action}`,
        {
          method: 'POST',
          ...(moderationReason ? { body: { reason: moderationReason } } : {}),
        }
      );
      setConfirmation(undefined);
      setReason('');
      const pendingDelta = status === 'pending' ? -1 : 0;
      onChanged(marketplaceCopy.comments[`${action}Success`], pendingDelta);
      await load(status);
    } catch (error) {
      setActionError(error);
    } finally {
      setSavingId(undefined);
    }
  }

  function confirmModeration(): void {
    if (!confirmation) return;
    const validationMessage = commentReasonError(confirmation.action, reason);
    setReasonError(validationMessage ?? '');
    if (validationMessage) return;
    void moderate(confirmation.comment, confirmation.action, reason.trim());
  }

  const actions = commentActionAvailability(roles, status);
  const canModerate = hasMarketplacePermission(roles, 'comments:moderate');
  const comments = result.kind === 'success' ? commentsForStatus(result.data, status) : [];

  return (
    <section className='panel'>
      <h3>{marketplaceCopy.comments.heading}</h3>
      <p>{marketplaceCopy.comments.intro}</p>
      <div
        aria-label={marketplaceCopy.comments.filtersLabel}
        className='marketplace-tabs'
        role='tablist'
      >
        {statuses.map((item) => (
          <button
            aria-selected={status === item}
            className={status === item ? 'is-active' : ''}
            key={item}
            onClick={() => chooseStatus(item)}
            role='tab'
            type='button'
          >
            {marketplaceCopy.comments.filters[item]}
          </button>
        ))}
      </div>

      {actionError ? (
        <p className='error-text' role='alert'>
          {marketplaceErrorMessage(actionError)}
        </p>
      ) : null}

      {result.kind === 'loading' ? (
        <div className='marketplace-placeholder' aria-live='polite'>
          <span className='marketplace-skeleton' aria-hidden='true' />
          <span>{marketplaceCopy.common.loading}</span>
        </div>
      ) : null}
      {result.kind === 'forbidden' ? (
        <SectionMessage>{marketplaceCopy.errors.sectionForbidden}</SectionMessage>
      ) : null}
      {result.kind === 'error' ? (
        <div role='alert'>
          <p className='error-text'>{marketplaceErrorMessage(result.error)}</p>
          <button className='secondary-button' onClick={() => void load(status)} type='button'>
            {marketplaceCopy.common.retry}
          </button>
        </div>
      ) : null}
      {result.kind === 'success' && comments.length === 0 ? (
        <SectionMessage>{marketplaceCopy.comments.empty[status]}</SectionMessage>
      ) : null}
      {result.kind === 'success' && comments.length > 0 ? (
        <div className='marketplace-card-grid'>
          {comments.map((comment) => (
            <article className='metric-card' key={comment.id}>
              <StatusPill status={comment.status} />
              <h4>{comment.authorDisplayName}</h4>
              <p>{comment.body}</p>
              <time dateTime={comment.createdAt}>{relativeCommentDate(comment.createdAt)}</time>
              <div className='marketplace-form-actions'>
                {status === 'pending' ? (
                  <>
                    <button
                      className='primary-button'
                      disabled={!actions.approve || savingId === comment.id}
                      onClick={() => void moderate(comment, 'approve')}
                      title={
                        !actions.approve ? marketplaceCopy.permissions.moderateComments : undefined
                      }
                      type='button'
                    >
                      {marketplaceCopy.comments.approve}
                    </button>
                    <button
                      className='secondary-button'
                      disabled={!actions.reject || savingId === comment.id}
                      onClick={() => setConfirmation({ comment, action: 'reject' })}
                      title={
                        !actions.reject ? marketplaceCopy.permissions.moderateComments : undefined
                      }
                      type='button'
                    >
                      {marketplaceCopy.comments.reject}
                    </button>
                  </>
                ) : null}
                {status === 'visible' ? (
                  <button
                    className='secondary-button'
                    disabled={!actions.hide || savingId === comment.id}
                    onClick={() => setConfirmation({ comment, action: 'hide' })}
                    title={!actions.hide ? marketplaceCopy.permissions.moderateComments : undefined}
                    type='button'
                  >
                    {marketplaceCopy.comments.hide}
                  </button>
                ) : null}
                {status === 'hidden' ? (
                  <button
                    className='primary-button'
                    disabled={!actions.restore || savingId === comment.id}
                    onClick={() => void moderate(comment, 'restore')}
                    title={
                      !actions.restore ? marketplaceCopy.permissions.moderateComments : undefined
                    }
                    type='button'
                  >
                    {marketplaceCopy.comments.restore}
                  </button>
                ) : null}
              </div>
              {!canModerate && status !== 'rejected' ? (
                <small>{marketplaceCopy.permissions.moderateComments}</small>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {confirmation ? (
        <div aria-modal='true' className='marketplace-confirmation' role='dialog'>
          <h4>
            {confirmation.action === 'reject'
              ? marketplaceCopy.comments.rejectTitle
              : marketplaceCopy.comments.hideTitle}
          </h4>
          <p>
            {confirmation.action === 'reject'
              ? marketplaceCopy.comments.rejectEffect
              : marketplaceCopy.comments.hideEffect}
          </p>
          <label>
            <span>{marketplaceCopy.comments.reason}</span>
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
              onClick={() => {
                setConfirmation(undefined);
                setReason('');
                setReasonError('');
              }}
              type='button'
            >
              {marketplaceCopy.actions.cancel}
            </button>
            <button
              className='primary-button'
              disabled={Boolean(savingId)}
              onClick={confirmModeration}
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
