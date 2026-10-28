import { useCallback, useEffect, useState } from 'react';
import { requestMarketplace } from '../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../marketplace/copy';
import {
  describeNotification,
  notificationsPath,
  notificationsReadPath,
  unreadIds,
} from '../../marketplace/notifications';
import type { AdminNotificationList } from '../../marketplace/notifications.types';
import { LoadingPanel, SectionMessage } from './components';
import type { NotificationsState } from './notifications-page.types';

const copy = marketplaceCopy.notifications;

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? marketplaceCopy.common.notAvailable
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function NotificationsPage(): JSX.Element {
  const [state, setState] = useState<NotificationsState>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  const load = useCallback(() => {
    requestMarketplace<AdminNotificationList>(notificationsPath)
      .then((data) => setState({ kind: 'success', data }))
      .catch((requestError: unknown) => setState({ kind: 'error', error: requestError }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markRead(ids?: string[]): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      await requestMarketplace(notificationsReadPath, {
        method: 'POST',
        body: ids ? { ids } : {},
      });
      load();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === 'loading') return <LoadingPanel />;

  return (
    <div className='page-grid'>
      <section className='panel hero-panel'>
        <h2>{copy.heading}</h2>
        <p>{copy.intro}</p>
      </section>

      {error ? (
        <p className='error-text' role='alert'>
          {marketplaceErrorMessage(error)}
        </p>
      ) : null}

      <section className='panel'>
        {state.kind === 'error' ? (
          <p className='error-text'>{marketplaceErrorMessage(state.error)}</p>
        ) : state.data.items.length === 0 ? (
          <SectionMessage>{copy.empty}</SectionMessage>
        ) : (
          <>
            <div className='panel-heading'>
              <h3>{copy.unread(state.data.unreadCount)}</h3>
              <button
                className='secondary-button'
                disabled={busy || state.data.unreadCount === 0}
                onClick={() => void markRead()}
                type='button'
              >
                {copy.markAllRead}
              </button>
            </div>
            <ul className='notification-list'>
              {state.data.items.map((item) => {
                const description = describeNotification(item);
                return (
                  <li
                    className={`notification-item${item.readAt === null ? ' is-unread' : ''}`}
                    key={item.id}
                  >
                    <div>
                      <strong>{description.title}</strong>
                      <span>{description.detail}</span>
                      <small>{formatDateTime(item.createdAt)}</small>
                    </div>
                    {item.readAt === null ? (
                      <button
                        className='secondary-button'
                        disabled={busy}
                        onClick={() => void markRead(unreadIds([item]))}
                        type='button'
                      >
                        {copy.markRead}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
