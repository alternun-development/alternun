import { useCallback, useEffect, useState } from 'react';
import type { AdminRole } from '../../../auth/oidc-client';
import {
  MarketplaceRequestError,
  requestMarketplace,
  type AuditPage,
  type AuditRecord,
  type Project,
} from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import { hasMarketplacePermission } from '../../../marketplace/permissions';
import { SectionMessage } from '../components';

export type AuditFilter = 'all' | 'changes' | 'denied';
type AuditState =
  | { kind: 'loading' }
  | { kind: 'forbidden' }
  | { kind: 'error'; error: unknown }
  | { kind: 'success'; page: AuditPage };

const filters: AuditFilter[] = ['all', 'changes', 'denied'];

export function auditFilterResult(filter: AuditFilter): AuditRecord['result'] | undefined {
  if (filter === 'changes') return 'allowed';
  if (filter === 'denied') return 'denied';
  return undefined;
}

export function auditQueryPath(projectId: string, filter: AuditFilter, page: number): string {
  const params = new URLSearchParams({ page: String(page), perPage: '20' });
  const result = auditFilterResult(filter);
  if (result) params.set('result', result);
  return `/v1/admin/projects/${encodeURIComponent(projectId)}/audit?${params.toString()}`;
}

export function auditEventMessage(event: AuditRecord): string {
  if (event.result === 'denied') {
    const reasons = marketplaceCopy.audit.reasons;
    const reason =
      event.reasonCode && event.reasonCode in reasons
        ? reasons[event.reasonCode as keyof typeof reasons]
        : reasons.default;
    return `${marketplaceCopy.audit.deniedPrefix} ${reason}`;
  }
  const actions = marketplaceCopy.audit.actions;
  const action =
    event.action in actions
      ? actions[event.action as keyof typeof actions]
      : marketplaceCopy.audit.fallbackAction;
  return `${event.actor || marketplaceCopy.audit.unknownActor} ${action}`;
}

export function auditFieldLabel(field: string): string {
  const fields = marketplaceCopy.audit.fields;
  if (field in fields) return fields[field as keyof typeof fields];
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function auditDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? marketplaceCopy.common.notAvailable
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function AuditHistory({
  project,
  roles,
}: {
  project: Project;
  roles: readonly AdminRole[];
}): JSX.Element {
  const [filter, setFilter] = useState<AuditFilter>('all');
  const [state, setState] = useState<AuditState>({ kind: 'loading' });
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (page: number, append: boolean): Promise<void> => {
      if (!hasMarketplacePermission(roles, 'audit:read')) {
        setState({ kind: 'forbidden' });
        return;
      }
      if (append) setLoadingMore(true);
      else setState({ kind: 'loading' });
      try {
        const next = await requestMarketplace<AuditPage>(auditQueryPath(project.id, filter, page));
        setState((current) => ({
          kind: 'success',
          page:
            append && current.kind === 'success'
              ? { ...next, data: [...current.page.data, ...next.data] }
              : next,
        }));
      } catch (error) {
        setState(
          error instanceof MarketplaceRequestError && error.status === 403
            ? { kind: 'forbidden' }
            : { kind: 'error', error }
        );
      } finally {
        setLoadingMore(false);
      }
    },
    [filter, project.id, roles]
  );

  useEffect(() => {
    void load(1, false);
  }, [load]);

  return (
    <section className='panel'>
      <h3>{marketplaceCopy.audit.heading}</h3>
      <p>{marketplaceCopy.audit.intro}</p>
      <div
        aria-label={marketplaceCopy.audit.filtersLabel}
        className='marketplace-tabs'
        role='tablist'
      >
        {filters.map((item) => (
          <button
            aria-selected={filter === item}
            className={filter === item ? 'is-active' : ''}
            key={item}
            onClick={() => setFilter(item)}
            role='tab'
            type='button'
          >
            {marketplaceCopy.audit.filters[item]}
          </button>
        ))}
      </div>

      {state.kind === 'loading' ? (
        <div className='marketplace-placeholder' aria-live='polite'>
          <span className='marketplace-skeleton' aria-hidden='true' />
          <span>{marketplaceCopy.common.loading}</span>
        </div>
      ) : null}
      {state.kind === 'forbidden' ? (
        <SectionMessage>{marketplaceCopy.errors.sectionForbidden}</SectionMessage>
      ) : null}
      {state.kind === 'error' ? (
        <div role='alert'>
          <p className='error-text'>{marketplaceErrorMessage(state.error)}</p>
          <button className='secondary-button' onClick={() => void load(1, false)} type='button'>
            {marketplaceCopy.common.retry}
          </button>
        </div>
      ) : null}
      {state.kind === 'success' && state.page.data.length === 0 ? (
        <SectionMessage>{marketplaceCopy.audit.empty}</SectionMessage>
      ) : null}
      {state.kind === 'success' && state.page.data.length > 0 ? (
        <>
          <div className='marketplace-card-grid'>
            {state.page.data.map((event) => (
              <article className='metric-card' key={event.id}>
                <h4>{auditEventMessage(event)}</h4>
                <time dateTime={event.createdAt}>{auditDate(event.createdAt)}</time>
                {event.changedFields.length > 0 ? (
                  <p>
                    <strong>{marketplaceCopy.audit.changedFields}:</strong>{' '}
                    {event.changedFields.map(auditFieldLabel).join(', ')}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
          {state.page.hasMore ? (
            <button
              className='secondary-button'
              disabled={loadingMore}
              onClick={() => void load(state.page.page + 1, true)}
              type='button'
            >
              {loadingMore ? marketplaceCopy.audit.loadingMore : marketplaceCopy.audit.loadMore}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
