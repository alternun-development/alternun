import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

let viteServer;
let marketplaceCopy;
let notifications;

function item(eventType, payload = {}, readAt = null) {
  return {
    id: `n-${eventType}-${readAt ?? 'unread'}`,
    eventType,
    reportId: 'r-1',
    projectId: 'p-1',
    payload,
    createdAt: '2026-10-27T12:00:00Z',
    readAt,
  };
}

before(async () => {
  viteServer = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  ({ marketplaceCopy } = await viteServer.ssrLoadModule('/src/marketplace/copy.ts'));
  notifications = await viteServer.ssrLoadModule('/src/marketplace/notifications.ts');
});

after(async () => {
  await viteServer?.close();
});

test('each event reads as a sentence with the amount and the guest', () => {
  const events = marketplaceCopy.notifications.events;
  const payload = { amount: 1250, recipientEmail: 'guest@example.test' };

  assert.deepEqual(notifications.describeNotification(item('report_needs_review', payload)), {
    title: events.needsReview,
    detail: '1,250 Airs · guest@example.test',
  });
  assert.equal(
    notifications.describeNotification(item('report_submitted', payload)).title,
    events.submitted
  );
  assert.equal(
    notifications.describeNotification(item('report_approved', payload)).title,
    events.approved
  );
});

test('a rejection shows its reason, and missing data falls back instead of breaking', () => {
  const rejected = notifications.describeNotification(
    item('report_rejected', {
      amount: 10,
      recipientEmail: 'guest@example.test',
      reason: ' Invoice does not match ',
    })
  );
  assert.match(rejected.detail, /Reason: Invoice does not match$/);

  const bare = notifications.describeNotification(item('report_approved', {}));
  assert.equal(
    bare.detail,
    `${marketplaceCopy.common.notAvailable} · ${marketplaceCopy.common.notAvailable}`
  );

  const unknown = notifications.describeNotification(item('something_new', {}));
  assert.equal(unknown.title, marketplaceCopy.notifications.unknown);
});

test('only unread notifications are offered to mark as read', () => {
  const items = [
    item('report_submitted'),
    item('report_approved', {}, '2026-10-27T13:00:00Z'),
    item('report_rejected'),
  ];
  assert.deepEqual(notifications.unreadIds(items), [items[0].id, items[2].id]);
  assert.deepEqual(notifications.unreadIds([]), []);
});

test('the paths and the unread label are stable', () => {
  assert.equal(notifications.notificationsPath, '/v1/admin/notifications');
  assert.equal(notifications.notificationsReadPath, '/v1/admin/notifications/read');
  assert.equal(marketplaceCopy.notifications.unread(0), 'All read');
  assert.equal(marketplaceCopy.notifications.unread(3), '3 unread');
});
