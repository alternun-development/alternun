import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type { Translator } from '@alternun/i18n';
import { useAuth } from '../auth/AppAuthProvider';
import type { NotificationItem, NotifType } from '../dashboard/NotificationDropdown';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';

const REFRESH_INTERVAL_MS = 15_000;

type NotificationPayload = Record<string, unknown>;

interface NotificationFeedRecord {
  id: string;
  eventType: string;
  severity: NotifType;
  payload: NotificationPayload;
  read: boolean;
  archived: boolean;
  createdAt: string;
}

type NotificationsAction =
  | { type: 'REPLACE'; items: NotificationItem[] }
  | { type: 'MARK_READ'; id: string }
  | { type: 'MARK_UNREAD'; id: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'ARCHIVE'; id: string }
  | { type: 'UNARCHIVE'; id: string }
  | { type: 'DELETE'; id: string };

interface NotificationsContextType {
  items: NotificationItem[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  markAllRead: () => void;
  archive: (id: string) => void;
  unarchive: (id: string) => void;
  deleteNotif: (id: string) => void;
  dismiss: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

function textPayload(payload: NotificationPayload, key: string): string | number | undefined {
  const value = payload[key];
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

function notificationCopy(
  record: NotificationFeedRecord,
  t: Translator
): Pick<NotificationItem, 'title' | 'body'> {
  const key = `notifications.events.${record.eventType}`;

  switch (record.eventType) {
    case 'airs_credited':
      return {
        title: t.t(`${key}.title`),
        body: t.t(`${key}.body`, { amount: textPayload(record.payload, 'amount') }),
      };
    case 'wallet_connected':
      return {
        title: t.t(`${key}.title`),
        body: t.t(`${key}.body`, { chain: textPayload(record.payload, 'chain') }),
      };
    case 'registration_completed':
    case 'referral_confirmed':
    case 'profile_completed':
      return { title: t.t(`${key}.title`), body: t.t(`${key}.body`) };
    default:
      return {
        title: t.t('notifications.events.generic.title'),
        body: t.t('notifications.events.generic.body'),
      };
  }
}

function toNotificationItem(record: NotificationFeedRecord, t: Translator): NotificationItem {
  const copy = notificationCopy(record, t);
  const timestamp = new Date(record.createdAt);

  return {
    id: record.id,
    type: record.severity,
    title: copy.title,
    body: copy.body,
    timestamp: Number.isNaN(timestamp.getTime()) ? new Date(0) : timestamp,
    read: record.read,
    archived: record.archived,
  };
}

function notificationsReducer(
  state: NotificationItem[],
  action: NotificationsAction
): NotificationItem[] {
  switch (action.type) {
    case 'REPLACE':
      return action.items;
    case 'MARK_READ':
      return state.map((notification) =>
        notification.id === action.id ? { ...notification, read: true } : notification
      );
    case 'MARK_UNREAD':
      return state.map((notification) =>
        notification.id === action.id ? { ...notification, read: false } : notification
      );
    case 'MARK_ALL_READ':
      return state.map((notification) =>
        !notification.archived ? { ...notification, read: true } : notification
      );
    case 'ARCHIVE':
      return state.map((notification) =>
        notification.id === action.id ? { ...notification, archived: true } : notification
      );
    case 'UNARCHIVE':
      return state.map((notification) =>
        notification.id === action.id ? { ...notification, archived: false } : notification
      );
    case 'DELETE':
      return state.filter((notification) => notification.id !== action.id);
    default:
      return state;
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { user, loading: authLoading, client } = useAuth();
  const translator = useAppTranslation();
  const translatorRef = useRef(translator);
  const clientRef = useRef(client);
  translatorRef.current = translator;
  clientRef.current = client;
  const [items, dispatch] = useReducer(notificationsReducer, []);
  const userId = typeof user?.id === 'string' && user.id.trim() ? user.id : null;

  const refresh = useCallback(async (): Promise<void> => {
    if (authLoading) return;

    if (!userId) {
      dispatch({ type: 'REPLACE', items: [] });
      return;
    }

    const sessionToken = await clientRef.current.getSessionToken();
    if (!sessionToken) {
      dispatch({ type: 'REPLACE', items: [] });
      return;
    }

    const response = await fetch(
      `${resolveMobileApiBaseUrl().replace(/\/+$/, '')}/v1/notifications`,
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
      }
    );
    if (!response.ok) {
      throw new Error('Unable to load notifications.');
    }

    const body = (await response.json()) as { notifications?: NotificationFeedRecord[] };
    const records = Array.isArray(body.notifications) ? body.notifications : [];
    dispatch({
      type: 'REPLACE',
      items: records.map((record) => toNotificationItem(record, translatorRef.current)),
    });
  }, [authLoading, userId]);

  useEffect(() => {
    void refresh().catch(() => undefined);
    if (!userId) return undefined;

    const interval = setInterval(() => void refresh().catch(() => undefined), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh, userId]);

  const updateRemote = useCallback(
    async (id: string, patch: Record<string, boolean>): Promise<void> => {
      const sessionToken = await clientRef.current.getSessionToken();
      if (!sessionToken) throw new Error('No notification session token is available.');

      const response = await fetch(
        `${resolveMobileApiBaseUrl().replace(/\/+$/, '')}/v1/notifications/${encodeURIComponent(
          id
        )}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(patch),
        }
      );
      if (!response.ok) throw new Error('Unable to update notification.');
    },
    []
  );

  const updateOptimistically = useCallback(
    (action: NotificationsAction, id: string, patch: Record<string, boolean>): void => {
      dispatch(action);
      void updateRemote(id, patch).catch(() => void refresh().catch(() => undefined));
    },
    [refresh, updateRemote]
  );

  const markRead = useCallback(
    (id: string): void => updateOptimistically({ type: 'MARK_READ', id }, id, { read: true }),
    [updateOptimistically]
  );
  const markUnread = useCallback(
    (id: string): void => updateOptimistically({ type: 'MARK_UNREAD', id }, id, { read: false }),
    [updateOptimistically]
  );
  const archive = useCallback(
    (id: string): void => updateOptimistically({ type: 'ARCHIVE', id }, id, { archived: true }),
    [updateOptimistically]
  );
  const unarchive = useCallback(
    (id: string): void => updateOptimistically({ type: 'UNARCHIVE', id }, id, { archived: false }),
    [updateOptimistically]
  );
  const deleteNotif = useCallback(
    (id: string): void => updateOptimistically({ type: 'DELETE', id }, id, { deleted: true }),
    [updateOptimistically]
  );

  const markAllRead = useCallback((): void => {
    dispatch({ type: 'MARK_ALL_READ' });
    void (async () => {
      const sessionToken = await clientRef.current.getSessionToken();
      if (!sessionToken) throw new Error('No notification session token is available.');
      const response = await fetch(
        `${resolveMobileApiBaseUrl().replace(/\/+$/, '')}/v1/notifications/read-all`,
        { method: 'POST', headers: { Authorization: `Bearer ${sessionToken}` } }
      );
      if (!response.ok) throw new Error('Unable to mark notifications as read.');
    })().catch(() => void refresh().catch(() => undefined));
  }, [refresh]);

  const value = useMemo<NotificationsContextType>(
    () => ({
      items,
      unreadCount: items.filter((notification) => !notification.read && !notification.archived)
        .length,
      refresh,
      markRead,
      markUnread,
      markAllRead,
      archive,
      unarchive,
      deleteNotif,
      dismiss: deleteNotif,
    }),
    [archive, deleteNotif, items, markAllRead, markRead, markUnread, refresh, unarchive]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextType {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}
