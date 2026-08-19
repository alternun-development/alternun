/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-floating-promises */
import React from 'react';
import { act, create } from 'react-test-renderer';

const mockAuth = {
  user: null as { id: string } | null,
  loading: false,
  client: { getSessionToken: jest.fn() },
};

jest.mock('../../auth/AppAuthProvider', () => ({
  useAuth: () => mockAuth,
}));
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    t: (key: string, params?: { amount?: string | number }) =>
      params?.amount == null ? key : `${key}:${params.amount}`,
  }),
}));
jest.mock('../../../utils/runtimeConfig', () => ({
  resolveMobileApiBaseUrl: () => 'http://127.0.0.1:3000',
}));

import { NotificationsProvider, useNotifications } from '../NotificationsContext';

describe('NotificationsProvider', () => {
  afterEach(() => {
    mockAuth.user = null;
    mockAuth.client.getSessionToken.mockReset();
    jest.restoreAllMocks();
  });

  it('starts empty until the authenticated notification feed is loaded', () => {
    let items: ReturnType<typeof useNotifications>['items'] = [];
    let renderer: ReturnType<typeof create>;

    function Probe(): null {
      items = useNotifications().items;
      return null;
    }

    act(() => {
      renderer = create(
        <NotificationsProvider>
          <Probe />
        </NotificationsProvider>
      );
    });

    expect(items).toEqual([]);
    act(() => renderer.unmount());
  });

  it('loads persisted event notifications for the authenticated user', async () => {
    mockAuth.user = { id: 'app-user-123' };
    mockAuth.client.getSessionToken.mockResolvedValue('session-token');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: [
          {
            id: 'notification-1',
            eventType: 'airs_credited',
            severity: 'success',
            payload: { amount: 10 },
            read: false,
            archived: false,
            createdAt: '2026-08-19T12:00:00.000Z',
          },
        ],
      }),
    } as Response);
    let items: ReturnType<typeof useNotifications>['items'] = [];
    let renderer: ReturnType<typeof create>;

    function Probe(): null {
      items = useNotifications().items;
      return null;
    }

    await act(async () => {
      renderer = create(
        <NotificationsProvider>
          <Probe />
        </NotificationsProvider>
      );
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/v1/notifications',
      expect.objectContaining({ headers: { Authorization: 'Bearer session-token' } })
    );
    expect(items).toEqual([
      expect.objectContaining({
        id: 'notification-1',
        title: 'notifications.events.airs_credited.title',
        body: 'notifications.events.airs_credited.body:10',
        read: false,
      }),
    ]);
    await act(async () => renderer.unmount());
  });

  it('discards a prior account response that completes after logout', async () => {
    mockAuth.user = { id: 'account-a' };
    mockAuth.client.getSessionToken.mockResolvedValue('account-a-token');
    let resolveResponse: (value: Response) => void;
    jest.spyOn(global, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        })
    );
    let items: ReturnType<typeof useNotifications>['items'] = [];
    let renderer: ReturnType<typeof create>;

    function Probe(): null {
      items = useNotifications().items;
      return null;
    }

    await act(async () => {
      renderer = create(
        <NotificationsProvider>
          <Probe />
        </NotificationsProvider>
      );
      await Promise.resolve();
    });

    mockAuth.user = null;
    await act(async () => {
      renderer.update(
        <NotificationsProvider>
          <Probe />
        </NotificationsProvider>
      );
      await Promise.resolve();
    });

    await act(async () => {
      resolveResponse({
        ok: true,
        json: async () => ({
          notifications: [
            {
              id: 'account-a-notification',
              eventType: 'registration_completed',
              severity: 'success',
              payload: {},
              read: false,
              archived: false,
              createdAt: '2026-08-19T12:00:00.000Z',
            },
          ],
        }),
      } as Response);
      await Promise.resolve();
    });

    expect(items).toEqual([]);
    await act(async () => renderer.unmount());
  });

  it('persists every user action while updating the rendered feed immediately', async () => {
    mockAuth.user = { id: 'app-user-123' };
    mockAuth.client.getSessionToken.mockResolvedValue('session-token');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: [
          {
            id: 'notification-1',
            eventType: 'wallet_connected',
            severity: 'info',
            payload: { chain: 'Ethereum' },
            read: false,
            archived: false,
            createdAt: 'not-a-date',
          },
          {
            id: 'notification-2',
            eventType: 'unknown_event',
            severity: 'warning',
            payload: {},
            read: false,
            archived: false,
            createdAt: '2026-08-19T12:00:00.000Z',
          },
        ],
      }),
    } as Response);
    let notifications: ReturnType<typeof useNotifications>;
    let renderer: ReturnType<typeof create>;

    function Probe(): null {
      notifications = useNotifications();
      return null;
    }

    await act(async () => {
      renderer = create(
        <NotificationsProvider>
          <Probe />
        </NotificationsProvider>
      );
      await Promise.resolve();
    });

    expect(notifications.items[0]).toEqual(
      expect.objectContaining({
        body: 'notifications.events.wallet_connected.body',
        timestamp: new Date(0),
      })
    );
    expect(notifications.items[1]).toEqual(
      expect.objectContaining({ title: 'notifications.events.generic.title' })
    );

    const expectAction = async (action: () => void, assertion: () => void): Promise<void> => {
      await act(async () => {
        action();
        await Promise.resolve();
      });
      assertion();
    };

    await expectAction(
      () => notifications.markRead('notification-1'),
      () => expect(notifications.items[0]?.read).toBe(true)
    );
    await expectAction(
      () => notifications.markUnread('notification-1'),
      () => expect(notifications.items[0]?.read).toBe(false)
    );
    await expectAction(
      () => notifications.archive('notification-1'),
      () => expect(notifications.items[0]?.archived).toBe(true)
    );
    await expectAction(
      () => notifications.unarchive('notification-1'),
      () => expect(notifications.items[0]?.archived).toBe(false)
    );
    await expectAction(
      () => notifications.markAllRead(),
      () => expect(notifications.unreadCount).toBe(0)
    );
    await expectAction(
      () => notifications.deleteNotif('notification-1'),
      () => expect(notifications.items).toHaveLength(1)
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/v1/notifications/read-all',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/v1/notifications/notification-1',
      expect.objectContaining({ method: 'PATCH' })
    );
    await act(async () => renderer.unmount());
  });
});
