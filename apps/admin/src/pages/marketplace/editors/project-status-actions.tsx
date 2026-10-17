import { useState } from 'react';
import { requestMarketplace, type Project, type ProjectStatus } from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import { hasMarketplacePermission } from '../../../marketplace/permissions';
import type {
  ProjectStatusAction,
  ProjectStatusActionDefinition,
  ProjectStatusActionsProps,
} from './project-status-actions.types';

export const projectStatusActions: Readonly<
  Record<ProjectStatusAction, ProjectStatusActionDefinition>
> = {
  publish: {
    target: 'published',
    permission: 'projects:publish',
    requiresReason: false,
    effect: marketplaceCopy.actions.publishEffect,
  },
  pause: {
    target: 'paused',
    permission: 'projects:pause',
    requiresReason: true,
    effect: marketplaceCopy.actions.pauseEffect,
  },
  resume: {
    target: 'published',
    permission: 'projects:publish',
    requiresReason: false,
    effect: marketplaceCopy.actions.resumeEffect,
  },
  archive: {
    target: 'archived',
    permission: 'projects:archive',
    requiresReason: true,
    effect: marketplaceCopy.actions.archiveEffect,
  },
};

function availableActions(status: ProjectStatus): ProjectStatusAction[] {
  if (status === 'draft') return ['publish', 'archive'];
  if (status === 'published') return ['pause', 'archive'];
  if (status === 'paused') return ['resume', 'archive'];
  return [];
}

export function ProjectStatusActions({
  project,
  roles,
  ready,
  onChanged,
}: ProjectStatusActionsProps): JSX.Element {
  const [selected, setSelected] = useState<ProjectStatusAction>();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<unknown>();
  const [reasonError, setReasonError] = useState('');
  const [saving, setSaving] = useState(false);
  const actions = availableActions(project.status);

  async function confirm(): Promise<void> {
    if (!selected) return;
    const definition = projectStatusActions[selected];
    if (definition.requiresReason && !reason.trim()) {
      setReasonError(marketplaceCopy.actions.reasonRequired);
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await requestMarketplace<Project>(`/v1/admin/projects/${project.id}/${selected}`, {
        method: 'POST',
        body: reason.trim() ? { reason: reason.trim() } : {},
      });
      setSelected(undefined);
      setReason('');
      onChanged(marketplaceCopy.actions.success);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className='panel'>
      <h3>{marketplaceCopy.actions.heading}</h3>
      {error ? <p className='error-text'>{marketplaceErrorMessage(error)}</p> : null}
      <div className='marketplace-form-actions'>
        {actions.map((action) => {
          const definition = projectStatusActions[action];
          const roleAllowed = hasMarketplacePermission(roles, definition.permission);
          const readyAllowed = action !== 'publish' || ready;
          const reason = !roleAllowed
            ? marketplaceCopy.permissions.changeStatus
            : !readyAllowed
            ? marketplaceCopy.permissions.publishIncomplete
            : undefined;
          return (
            <div className='marketplace-disabled-action' key={action}>
              <button
                className={
                  action === 'publish' || action === 'resume'
                    ? 'primary-button'
                    : 'secondary-button'
                }
                disabled={Boolean(reason)}
                onClick={() => setSelected(action)}
                title={reason}
                type='button'
              >
                {marketplaceCopy.actions[action]}
              </button>
              {reason ? <small>{reason}</small> : null}
            </div>
          );
        })}
      </div>

      {selected ? (
        <div aria-modal='true' className='marketplace-confirmation' role='dialog'>
          <h4>{marketplaceCopy.actions[selected]}</h4>
          <p>{projectStatusActions[selected].effect}</p>
          {projectStatusActions[selected].requiresReason ? (
            <label>
              <span>{marketplaceCopy.actions.reason}</span>
              <textarea
                rows={3}
                value={reason}
                placeholder={marketplaceCopy.actions.reasonPlaceholder}
                onChange={(event) => {
                  setReason(event.target.value);
                  setReasonError('');
                }}
              />
              {reasonError ? <strong className='error-text'>{reasonError}</strong> : null}
            </label>
          ) : null}
          <div className='marketplace-form-actions'>
            <button
              className='secondary-button'
              onClick={() => setSelected(undefined)}
              type='button'
            >
              {marketplaceCopy.actions.cancel}
            </button>
            <button
              className='primary-button'
              disabled={saving}
              onClick={() => void confirm()}
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
