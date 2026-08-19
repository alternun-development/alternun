/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await, @typescript-eslint/no-floating-promises */
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
});
