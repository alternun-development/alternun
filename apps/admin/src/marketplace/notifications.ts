import { marketplaceCopy } from './copy';
import type { AdminNotification, NotificationText } from './notifications.types';

export const notificationsPath = '/v1/admin/notifications';
export const notificationsReadPath = '/v1/admin/notifications/read';

function airs(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toLocaleString('en-US')} Airs`
    : marketplaceCopy.common.notAvailable;
}

function text(value: unknown): string {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : marketplaceCopy.common.notAvailable;
}

/** A readable title and detail for one notification, built from its event and payload. */
export function describeNotification(item: AdminNotification): NotificationText {
  const copy = marketplaceCopy.notifications.events;
  const guest = text(item.payload.recipientEmail);
  const amount = airs(item.payload.amount);
  const base = `${amount} · ${guest}`;
  switch (item.eventType) {
    case 'report_needs_review':
      return { title: copy.needsReview, detail: base };
    case 'report_submitted':
      return { title: copy.submitted, detail: base };
    case 'report_approved':
      return { title: copy.approved, detail: base };
    case 'report_rejected': {
      const reason = typeof item.payload.reason === 'string' ? item.payload.reason.trim() : '';
      return {
        title: copy.rejected,
        detail: reason ? `${base} · ${marketplaceCopy.notifications.reason}: ${reason}` : base,
      };
    }
    default:
      return { title: marketplaceCopy.notifications.unknown, detail: base };
  }
}

export function unreadIds(items: readonly AdminNotification[]): string[] {
  return items.filter((item) => item.readAt === null).map((item) => item.id);
}
