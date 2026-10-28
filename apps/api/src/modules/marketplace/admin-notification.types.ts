export type AdminNotificationEvent =
  | 'report_submitted'
  | 'report_needs_review'
  | 'report_approved'
  | 'report_rejected';

export interface AdminNotificationRecord {
  id: string;
  eventType: AdminNotificationEvent;
  reportId: string | null;
  projectId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

/** Who is reading: the token identity, plus the email only when it is verified. */
export interface AdminNotificationViewer {
  issuer: string;
  subject: string;
  email: string | null;
}

export interface AdminNotificationDraft {
  eventType: AdminNotificationEvent;
  reportId: string;
  projectId: string;
  payload: Record<string, unknown>;
  recipientEmail?: string;
  recipientIssuer?: string;
  recipientSubject?: string;
}

// GET /v1/admin/notifications
export interface AdminNotificationListResponse {
  items: AdminNotificationRecord[];
  unreadCount: number;
}

// POST /v1/admin/notifications/read
export interface MarkNotificationsReadResponse {
  updated: number;
}
