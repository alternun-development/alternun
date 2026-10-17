import { useState } from 'react';
import type { AdminRole } from '../../../auth/oidc-client';
import {
  MarketplaceRequestError,
  requestMarketplace,
  type ParticipantHistory,
  type Project,
  type ProjectActivity,
  type ProjectParticipant,
} from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import { hasMarketplacePermission } from '../../../marketplace/permissions';
import { SectionMessage, StatusPill } from '../components';

type Props = {
  project: Project;
  participants: ProjectParticipant[];
  activities: ProjectActivity[];
  roles: readonly AdminRole[];
  onChanged: (message: string) => void;
};

type HistoryState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; data: ParticipantHistory[] }
  | { kind: 'forbidden' }
  | { kind: 'error'; error: unknown };

export function participantActionAvailability(roles: readonly AdminRole[]): {
  read: boolean;
  manage: boolean;
} {
  return {
    read: hasMarketplacePermission(roles, 'participants:read'),
    manage: hasMarketplacePermission(roles, 'participants:manage'),
  };
}

export function participantRemovalReasonError(reason: string): string | null {
  return reason.trim() ? null : marketplaceCopy.participants.reasonRequired;
}

export function participantHistoryPath(projectId: string, participantId: string): string {
  return `/v1/admin/projects/${projectId}/participants/${participantId}/history`;
}

function activityTitle(activity: ProjectActivity): string {
  return (
    activity.content[activity.defaultLocale]?.title ??
    Object.values(activity.content)[0]?.title ??
    marketplaceCopy.common.notAvailable
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? marketplaceCopy.common.notAvailable
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

export function ParticipantEditor({
  project,
  participants,
  activities,
  roles,
  onChanged,
}: Props): JSX.Element {
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [removing, setRemoving] = useState<ProjectParticipant>();
  const [reason, setReason] = useState('');
  const [recording, setRecording] = useState(false);
  const [participantId, setParticipantId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [selected, setSelected] = useState<ProjectParticipant>();
  const [history, setHistory] = useState<HistoryState>({ kind: 'idle' });
  const [error, setError] = useState<unknown>();
  const [fieldError, setFieldError] = useState('');
  const [saving, setSaving] = useState(false);
  const { manage: canManage } = participantActionAvailability(roles);
  const activeParticipants = participants.filter((participant) => participant.status === 'active');
  const publishedActivities = activities.filter((activity) => activity.status === 'published');

  async function addParticipant(): Promise<void> {
    if (!email.trim()) {
      setFieldError(marketplaceCopy.errors.PARTICIPANT_INPUT_INVALID);
      return;
    }
    setSaving(true);
    setError(undefined);
    setFieldError('');
    try {
      await requestMarketplace(`/v1/admin/projects/${project.id}/participants`, {
        method: 'POST',
        body: { email: email.trim() },
      });
      setAdding(false);
      setEmail('');
      onChanged(marketplaceCopy.participants.added);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function removeParticipant(): Promise<void> {
    if (!removing) return;
    const reasonError = participantRemovalReasonError(reason);
    if (reasonError) {
      setFieldError(reasonError);
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await requestMarketplace(
        `/v1/admin/projects/${project.id}/participants/${removing.id}/remove`,
        { method: 'POST', body: { reason: reason.trim() } }
      );
      setRemoving(undefined);
      setReason('');
      setFieldError('');
      onChanged(marketplaceCopy.participants.removed);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function recordActivity(): Promise<void> {
    const participant = activeParticipants.find((item) => item.id === participantId);
    const activity = publishedActivities.find((item) => item.id === activityId);
    if (!participant || !activity) {
      setFieldError(marketplaceCopy.participants.assignmentRequired);
      return;
    }
    setSaving(true);
    setError(undefined);
    setFieldError('');
    try {
      await requestMarketplace(
        `/v1/admin/projects/${project.id}/activities/${activity.id}/completions`,
        { method: 'POST', body: { userId: participant.userId } }
      );
      setRecording(false);
      setParticipantId('');
      setActivityId('');
      onChanged(marketplaceCopy.participants.completionSaved);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function loadHistory(participant: ProjectParticipant): Promise<void> {
    setSelected(participant);
    setHistory({ kind: 'loading' });
    try {
      const data = await requestMarketplace<ParticipantHistory[]>(
        participantHistoryPath(project.id, participant.id)
      );
      setHistory({ kind: 'success', data });
    } catch (requestError) {
      setHistory(
        requestError instanceof MarketplaceRequestError && requestError.status === 403
          ? { kind: 'forbidden' }
          : { kind: 'error', error: requestError }
      );
    }
  }

  const recordDisabledReason = !canManage
    ? marketplaceCopy.permissions.participants
    : activeParticipants.length === 0
    ? marketplaceCopy.participants.noActiveParticipants
    : publishedActivities.length === 0
    ? marketplaceCopy.participants.noPublishedActivities
    : undefined;

  return (
    <section className='panel'>
      <div className='panel-heading'>
        <div>
          <h3>{marketplaceCopy.participants.heading}</h3>
          <p>{marketplaceCopy.participants.intro}</p>
        </div>
        <button
          className='primary-button'
          disabled={!canManage}
          onClick={() => setAdding(true)}
          title={!canManage ? marketplaceCopy.permissions.participants : undefined}
          type='button'
        >
          {marketplaceCopy.participants.add}
        </button>
      </div>

      {error ? <p className='error-text'>{marketplaceErrorMessage(error)}</p> : null}
      {!canManage ? <small>{marketplaceCopy.permissions.participants}</small> : null}

      <div className='marketplace-compact-actions'>
        <button
          className='secondary-button'
          disabled={Boolean(recordDisabledReason)}
          onClick={() => setRecording(true)}
          title={recordDisabledReason}
          type='button'
        >
          {marketplaceCopy.participants.recordActivity}
        </button>
        {recordDisabledReason ? <small>{recordDisabledReason}</small> : null}
      </div>

      {!participants.length ? (
        <SectionMessage>{marketplaceCopy.participants.empty}</SectionMessage>
      ) : (
        <div className='marketplace-card-grid'>
          {participants.map((participant) => (
            <article className='metric-card' key={participant.id}>
              <StatusPill status={participant.status} />
              <h4>{participant.displayName}</h4>
              <p>{participant.email}</p>
              <small>
                {marketplaceCopy.participants.joined} {formatDate(participant.addedAt)}
              </small>
              <strong>
                {marketplaceCopy.participants.summary(
                  participant.completedActivities,
                  participant.receivedAirs
                )}
              </strong>
              <div className='marketplace-compact-actions'>
                <button
                  className='secondary-button'
                  onClick={() => void loadHistory(participant)}
                  type='button'
                >
                  {marketplaceCopy.participants.viewHistory}
                </button>
                {participant.status === 'active' ? (
                  <button
                    className='secondary-button'
                    disabled={!canManage}
                    onClick={() => {
                      setRemoving(participant);
                      setFieldError('');
                    }}
                    title={!canManage ? marketplaceCopy.permissions.participants : undefined}
                    type='button'
                  >
                    {marketplaceCopy.participants.remove}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {adding ? (
        <div className='marketplace-inline-form'>
          <label>
            <span>{marketplaceCopy.participants.email}</span>
            <input
              autoComplete='email'
              placeholder={marketplaceCopy.participants.emailPlaceholder}
              type='email'
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldError('');
              }}
            />
            <small>{marketplaceCopy.participants.emailHint}</small>
          </label>
          {fieldError ? <strong className='error-text'>{fieldError}</strong> : null}
          <div className='marketplace-form-actions'>
            <button className='secondary-button' onClick={() => setAdding(false)} type='button'>
              {marketplaceCopy.participants.cancel}
            </button>
            <button
              className='primary-button'
              disabled={saving}
              onClick={() => void addParticipant()}
              type='button'
            >
              {marketplaceCopy.participants.save}
            </button>
          </div>
        </div>
      ) : null}

      {recording ? (
        <div className='marketplace-inline-form'>
          <h4>{marketplaceCopy.participants.recordHeading}</h4>
          <label>
            <span>{marketplaceCopy.participants.participant}</span>
            <select
              value={participantId}
              onChange={(event) => setParticipantId(event.target.value)}
            >
              <option value=''>{marketplaceCopy.participants.chooseParticipant}</option>
              {activeParticipants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.displayName} — {participant.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{marketplaceCopy.participants.activity}</span>
            <select value={activityId} onChange={(event) => setActivityId(event.target.value)}>
              <option value=''>{marketplaceCopy.participants.chooseActivity}</option>
              {publishedActivities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activityTitle(activity)}
                </option>
              ))}
            </select>
          </label>
          {fieldError ? <strong className='error-text'>{fieldError}</strong> : null}
          <div className='marketplace-form-actions'>
            <button className='secondary-button' onClick={() => setRecording(false)} type='button'>
              {marketplaceCopy.participants.cancel}
            </button>
            <button
              className='primary-button'
              disabled={saving}
              onClick={() => void recordActivity()}
              type='button'
            >
              {marketplaceCopy.participants.saveCompletion}
            </button>
          </div>
        </div>
      ) : null}

      {removing ? (
        <div aria-modal='true' className='marketplace-confirmation' role='dialog'>
          <h4>{marketplaceCopy.participants.removeTitle}</h4>
          <p>{marketplaceCopy.participants.removeEffect}</p>
          <label>
            <span>{marketplaceCopy.participants.reason}</span>
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
              onClick={() => setRemoving(undefined)}
              type='button'
            >
              {marketplaceCopy.participants.cancel}
            </button>
            <button
              className='primary-button'
              disabled={saving}
              onClick={() => void removeParticipant()}
              type='button'
            >
              {marketplaceCopy.participants.confirmRemove}
            </button>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className='marketplace-inline-form'>
          <div className='panel-heading'>
            <div>
              <h4>{marketplaceCopy.participants.historyHeading}</h4>
              <p>{selected.displayName}</p>
            </div>
            <button
              className='secondary-button'
              onClick={() => {
                setSelected(undefined);
                setHistory({ kind: 'idle' });
              }}
              type='button'
            >
              {marketplaceCopy.participants.closeHistory}
            </button>
          </div>
          {history.kind === 'loading' ? <p>{marketplaceCopy.participants.historyLoading}</p> : null}
          {history.kind === 'forbidden' ? (
            <SectionMessage>{marketplaceCopy.errors.sectionForbidden}</SectionMessage>
          ) : null}
          {history.kind === 'error' ? (
            <div role='alert'>
              <p className='error-text'>{marketplaceErrorMessage(history.error)}</p>
              <button
                className='secondary-button'
                onClick={() => void loadHistory(selected)}
                type='button'
              >
                {marketplaceCopy.common.retry}
              </button>
            </div>
          ) : null}
          {history.kind === 'success' && history.data.length === 0 ? (
            <SectionMessage>{marketplaceCopy.participants.historyEmpty}</SectionMessage>
          ) : null}
          {history.kind === 'success' && history.data.length > 0 ? (
            <div className='marketplace-card-grid'>
              {history.data.map((item) => (
                <article className='metric-card' key={item.id}>
                  <StatusPill status={item.status} />
                  <h4>{item.activity}</h4>
                  <dl className='record-grid'>
                    <div>
                      <dt>{marketplaceCopy.participants.points}</dt>
                      <dd>{item.awardedAirs ?? marketplaceCopy.common.notAvailable}</dd>
                    </div>
                    <div>
                      <dt>{marketplaceCopy.participants.date}</dt>
                      <dd>{formatDate(item.completedAt)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
