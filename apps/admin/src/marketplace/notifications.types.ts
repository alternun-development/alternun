// Shapes of the console inbox endpoints (issue #249 B10). They mirror
// apps/api/src/modules/marketplace/admin-notification.types.ts.

export type AdminNotificationEvent =
  | 'report_submitted'
  | 'report_needs_review'
  | 'report_approved'
  | 'report_rejected';

export type AdminNotification = {
  id: string;
  eventType: AdminNotificationEvent;
  reportId: string | null;
  projectId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
};

export type AdminNotificationList = {
  items: AdminNotification[];
  unreadCount: number;
};

export type NotificationText = {
  title: string;
  detail: string;
};
