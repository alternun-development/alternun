import { useState } from 'react';
import {
  requestMarketplace,
  type Enterprise,
  type EnterpriseStatus,
} from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import { hasMarketplacePermission } from '../../../marketplace/permissions';
import type {
  EnterpriseStatusAction,
  EnterpriseStatusActionDefinition,
  EnterpriseStatusActionsProps,
} from './enterprise-status-actions.types';

// The API requires a reason to pause or archive (STATUS_REASON_REQUIRED).
export const enterpriseStatusActions: Readonly<
  Record<EnterpriseStatusAction, EnterpriseStatusActionDefinition>
> = {
  pause: {
    target: 'paused',
    requiresReason: true,
    effect: marketplaceCopy.enterpriseActions.pauseEffect,
  },
  resume: {
    target: 'active',
    requiresReason: false,
    effect: marketplaceCopy.enterpriseActions.resumeEffect,
  },
  archive: {
    target: 'archived',
    requiresReason: true,
    effect: marketplaceCopy.enterpriseActions.archiveEffect,
  },
};

export function availableEnterpriseActions(status: EnterpriseStatus): EnterpriseStatusAction[] {
  if (status === 'active') return ['pause', 'archive'];
  if (status === 'paused') return ['resume', 'archive'];
  return [];
}

export function EnterpriseStatusActions({
  enterprise,
  roles,
  onChanged,
}: EnterpriseStatusActionsProps): JSX.Element | null {
  const [selected, setSelected] = useState<EnterpriseStatusAction>();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<unknown>();
  const [reasonError, setReasonError] = useState('');
  const [saving, setSaving] = useState(false);
  const actions = availableEnterpriseActions(enterprise.status);
  const allowed = hasMarketplacePermission(roles, 'enterprises:status');

  if (actions.length === 0) return null;

  async function confirm(): Promise<void> {
    if (!selected) return;
    if (enterpriseStatusActions[selected].requiresReason && !reason.trim()) {
      setReasonError(marketplaceCopy.actions.reasonRequired);
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const changed = await requestMarketplace<Enterprise>(
        `/v1/admin/enterprises/${encodeURIComponent(enterprise.id)}/${selected}`,
        { method: 'POST', body: reason.trim() ? { reason: reason.trim() } : {} }
      );
      setSelected(undefined);
      setReason('');
      onChanged(changed);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className='panel'>
      <h3>{marketplaceCopy.enterpriseActions.heading}</h3>
      {error ? <p className='error-text'>{marketplaceErrorMessage(error)}</p> : null}
      <div className='marketplace-form-actions'>
        {actions.map((action) => (
          <div className='marketplace-disabled-action' key={action}>
            <button
              className={action === 'resume' ? 'primary-button' : 'secondary-button'}
              disabled={!allowed}
              onClick={() => setSelected(action)}
              title={allowed ? undefined : marketplaceCopy.enterpriseActions.noPermission}
              type='button'
            >
              {marketplaceCopy.enterpriseActions[action]}
            </button>
            {allowed ? null : <small>{marketplaceCopy.enterpriseActions.noPermission}</small>}
          </div>
        ))}
      </div>

      {selected ? (
        <div aria-modal='true' className='marketplace-confirmation' role='dialog'>
          <h4>{marketplaceCopy.enterpriseActions[selected]}</h4>
          <p>{enterpriseStatusActions[selected].effect}</p>
          {enterpriseStatusActions[selected].requiresReason ? (
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
