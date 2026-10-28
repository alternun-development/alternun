import type { AdminNotificationList } from '../../marketplace/notifications.types';

export type NotificationsState =
  | { kind: 'loading' }
  | { kind: 'success'; data: AdminNotificationList }
  | { kind: 'error'; error: unknown };
