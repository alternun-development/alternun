import { useState } from 'react';
import { requestMarketplace, type ProjectActivity } from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import { hasMarketplacePermission } from '../../../marketplace/permissions';
import { slugFromName } from '../project-create-wizard';
import { SectionMessage, StatusPill } from '../components';
import type { ActivityDraft, ActivityEditorProps } from './activity-editor.types';

const emptyDraft: ActivityDraft = {
  title: '',
  description: '',
  defaultPoints: '1',
  maximumPoints: '1',
};

export function ActivityEditor({
  project,
  activities,
  roles,
  onChanged,
}: ActivityEditorProps): JSX.Element {
  const [draft, setDraft] = useState<ActivityDraft>();
  const [error, setError] = useState<unknown>();
  const [fieldError, setFieldError] = useState('');
  const [saving, setSaving] = useState(false);
  const canWrite = hasMarketplacePermission(roles, 'activities:write');
  const canPublish = hasMarketplacePermission(roles, 'activities:publish');

  function edit(activity: ProjectActivity): void {
    const content = activity.content[activity.defaultLocale] ?? Object.values(activity.content)[0];
    setDraft({
      id: activity.id,
      title: content?.title ?? '',
      description: content?.description ?? '',
      defaultPoints: String(activity.defaultAirsAmount),
      maximumPoints: String(activity.maxAirsPerAward),
      content: activity.content,
    });
  }

  async function save(): Promise<void> {
    if (!draft) return;
    const defaultPoints = Number(draft.defaultPoints);
    const maximumPoints = Number(draft.maximumPoints);
    if (!draft.title.trim() || !draft.description.trim() || slugFromName(draft.title).length < 3) {
      setFieldError(marketplaceCopy.activitiesEditor.invalidContent);
      return;
    }
    if (
      !Number.isFinite(defaultPoints) ||
      !Number.isFinite(maximumPoints) ||
      defaultPoints <= 0 ||
      maximumPoints < defaultPoints
    ) {
      setFieldError(marketplaceCopy.activitiesEditor.invalidPoints);
      return;
    }
    setSaving(true);
    setError(undefined);
    const body = {
      ...(draft.id ? {} : { code: slugFromName(draft.title) }),
      defaultLocale: project.defaultLocale,
      content: {
        ...draft.content,
        [project.defaultLocale]: {
          title: draft.title.trim(),
          description: draft.description.trim(),
        },
      },
      defaultAirsAmount: defaultPoints,
      maxAirsPerAward: maximumPoints,
      ...(draft.id ? {} : { repeatPeriod: 'none', maxAwardsPerPeriod: 1 }),
    };
    try {
      await requestMarketplace<ProjectActivity>(
        draft.id
          ? `/v1/admin/projects/${project.id}/activities/${draft.id}`
          : `/v1/admin/projects/${project.id}/activities`,
        { method: draft.id ? 'PATCH' : 'POST', body }
      );
      setDraft(undefined);
      onChanged(marketplaceCopy.activitiesEditor.success);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function transition(activity: ProjectActivity, action: 'publish' | 'pause'): Promise<void> {
    setSaving(true);
    setError(undefined);
    try {
      await requestMarketplace<ProjectActivity>(
        `/v1/admin/projects/${project.id}/activities/${activity.id}/${action}`,
        { method: 'POST', body: {} }
      );
      onChanged(marketplaceCopy.activitiesEditor.statusSuccess);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className='panel'>
      <div className='panel-heading'>
        <h3>{marketplaceCopy.projectDetail.activities.heading}</h3>
        {canWrite ? (
          <button className='primary-button' onClick={() => setDraft(emptyDraft)} type='button'>
            {marketplaceCopy.activitiesEditor.add}
          </button>
        ) : null}
      </div>
      {error ? <p className='error-text'>{marketplaceErrorMessage(error)}</p> : null}
      {!activities.length ? (
        <SectionMessage>{marketplaceCopy.projectDetail.activities.empty}</SectionMessage>
      ) : (
        <div className='marketplace-card-grid'>
          {activities.map((activity) => {
            const content =
              activity.content[activity.defaultLocale] ?? Object.values(activity.content)[0];
            const statusAction = activity.status === 'published' ? 'pause' : 'publish';
            return (
              <article className='metric-card' key={activity.id}>
                <StatusPill status={activity.status} />
                <h4>{content?.title ?? marketplaceCopy.common.notAvailable}</h4>
                <p>{content?.description ?? marketplaceCopy.common.notAvailable}</p>
                <strong>
                  {activity.defaultAirsAmount} {marketplaceCopy.projectDetail.activities.points}
                </strong>
                <div className='marketplace-compact-actions'>
                  {canWrite ? (
                    <button
                      className='secondary-button'
                      onClick={() => edit(activity)}
                      type='button'
                    >
                      {marketplaceCopy.activitiesEditor.edit}
                    </button>
                  ) : null}
                  <button
                    className='secondary-button'
                    disabled={!canPublish || saving}
                    onClick={() => void transition(activity, statusAction)}
                    title={!canPublish ? marketplaceCopy.permissions.unavailable : undefined}
                    type='button'
                  >
                    {statusAction === 'publish'
                      ? marketplaceCopy.activitiesEditor.publish
                      : marketplaceCopy.activitiesEditor.pause}
                  </button>
                </div>
                {!canPublish ? <small>{marketplaceCopy.permissions.unavailable}</small> : null}
              </article>
            );
          })}
        </div>
      )}

      {draft ? (
        <div className='marketplace-inline-form'>
          <label>
            <span>{marketplaceCopy.activitiesEditor.title}</span>
            <input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </label>
          <label>
            <span>{marketplaceCopy.activitiesEditor.description}</span>
            <textarea
              rows={4}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </label>
          <label>
            <span>{marketplaceCopy.activitiesEditor.defaultPoints}</span>
            <input
              min='0.000001'
              step='0.01'
              type='number'
              value={draft.defaultPoints}
              onChange={(event) => setDraft({ ...draft, defaultPoints: event.target.value })}
            />
          </label>
          <label>
            <span>{marketplaceCopy.activitiesEditor.maximumPoints}</span>
            <input
              min='0.000001'
              step='0.01'
              type='number'
              value={draft.maximumPoints}
              onChange={(event) => setDraft({ ...draft, maximumPoints: event.target.value })}
            />
          </label>
          {fieldError ? <strong className='error-text'>{fieldError}</strong> : null}
          <div className='marketplace-form-actions'>
            <button className='secondary-button' onClick={() => setDraft(undefined)} type='button'>
              {marketplaceCopy.activitiesEditor.cancel}
            </button>
            <button
              className='primary-button'
              disabled={saving}
              onClick={() => void save()}
              type='button'
            >
              {marketplaceCopy.activitiesEditor.save}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
