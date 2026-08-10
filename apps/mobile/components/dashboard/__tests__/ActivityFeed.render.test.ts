/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import ActivityFeed from '../ActivityFeed';

jest.mock('react-native', () => require('react-native-web'));

jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    t: (key: string): string => {
      const translations: Record<string, string> = {
        'dashboard.activityFeed.title': 'Actividad de AIRS',
        'dashboard.activityFeed.subtitle.user': 'Actividad de AIRS en tu cuenta',
        'dashboard.activityFeed.subtitle.global': 'Actividad de AIRS en la red',
        'dashboard.activityFeed.tabs.user': 'Usuario',
        'dashboard.activityFeed.tabs.global': 'Red',
        'dashboard.activityFeed.search': 'Buscar actividad',
        'dashboard.activityFeed.filters.all': 'Todo',
        'dashboard.activityFeed.filters.compensation': 'Compensación',
        'dashboard.activityFeed.filters.purchase': 'Compra',
        'dashboard.activityFeed.filters.profile': 'Perfil',
        'dashboard.activityFeed.filters.account': 'Cuenta',
        'dashboard.activityFeed.filters.reward': 'Recompensa',
        'dashboard.activityFeed.activityTypes.compensation': 'Compensación',
        'dashboard.activityFeed.activityTypes.purchase': 'Compra',
        'dashboard.activityFeed.activityTypes.profile': 'Perfil',
        'dashboard.activityFeed.activityTypes.account': 'Cuenta',
        'dashboard.activityFeed.activityTypes.reward': 'Recompensa',
        'dashboard.activityFeed.activityTypes.certificate': 'Certificado',
        'dashboard.activityFeed.tableHeaders.action': 'Acción',
        'dashboard.activityFeed.tableHeaders.source': 'Fuente',
        'dashboard.activityFeed.tableHeaders.airs': 'AIRS',
        'dashboard.activityFeed.tableHeaders.date': 'Fecha',
        'dashboard.activityFeed.empty': 'No hay actividad para mostrar',
      };

      return translations[key] ?? key;
    },
  }),
}));

jest.mock('../../../utils/runtimeConfig', () => ({
  resolveMobileApiBaseUrl: (): string => 'http://127.0.0.1:3000',
}));

type ActivityFeedProps = React.ComponentProps<typeof ActivityFeed>;
type RenderState = {
  container: HTMLDivElement;
  root: Root;
};

function createClient(): NonNullable<ActivityFeedProps['client']> {
  return {
    getSessionToken: async (): Promise<string | null> => 'session-token',
  };
}

function renderActivityFeed(element: React.ReactElement): RenderState {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    root,
  };
}

async function flushEffects(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

function clickByTestId(container: HTMLElement, testId: string): void {
  const element = container.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Unable to find element with test id: ${testId}`);
  }

  act(() => {
    element.click();
  });
}

describe('ActivityFeed render', () => {
  const originalFetch = globalThis.fetch;
  let renderState: RenderState | null = null;

  beforeEach(() => {
    renderState = null;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    globalThis.fetch = originalFetch;
    if (renderState) {
      act(() => {
        renderState?.root.unmount();
      });
    }
    renderState?.container.remove();
  });

  it('loads activity from the API using remote pagination and updates request parameters on page changes', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<{
          entries: Array<{
            id: string;
            sourceKind: string;
            sourceRef: string;
            notes: string;
            airsDelta: number;
            recordedAt: string;
          }>;
          totalCount: number;
          page: number;
          pageSize: number;
          totalPages: number;
        }> => ({
          entries: [
            {
              id: 'entry-1',
              sourceKind: 'compensation',
              sourceRef: 'tx-1',
              notes: 'Compensación',
              airsDelta: 12,
              recordedAt: '2026-08-09T12:00:00.000Z',
            },
          ],
          totalCount: 10,
          page: 1,
          pageSize: 5,
          totalPages: 2,
        }),
      } as unknown as typeof fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<{
          entries: Array<{
            id: string;
            sourceKind: string;
            sourceRef: string;
            notes: string;
            airsDelta: number;
            recordedAt: string;
          }>;
          totalCount: number;
          page: number;
          pageSize: number;
          totalPages: number;
        }> => ({
          entries: [
            {
              id: 'entry-2',
              sourceKind: 'compensation',
              sourceRef: 'tx-2',
              notes: 'Compensación segunda',
              airsDelta: 8,
              recordedAt: '2026-08-09T12:15:00.000Z',
            },
          ],
          totalCount: 10,
          page: 2,
          pageSize: 5,
          totalPages: 2,
        }),
      } as unknown as typeof fetch);

    renderState = renderActivityFeed(
      React.createElement(ActivityFeed, {
        isDark: true,
        client: createClient(),
        signedIn: true,
      })
    );

    await act(async () => {
      await flushEffects();
      await flushEffects();
    });

    const calls = (globalThis.fetch as unknown as jest.Mock).mock.calls as Array<
      [RequestInfo | URL, RequestInit]
    >;
    const firstRequest = new URL(String(calls[0][0]));

    expect(firstRequest.searchParams.get('page')).toBe('1');
    expect(firstRequest.searchParams.get('scope')).toBe('personal');
    expect(firstRequest.pathname).toBe('/v1/airs/activity');

    clickByTestId(renderState.container, 'airs-activity-next-page');
    await act(async () => {
      await flushEffects();
      await flushEffects();
    });

    const secondRequest = new URL(
      String((globalThis.fetch as unknown as jest.Mock).mock.calls[1][0])
    );

    expect(secondRequest.searchParams.get('page')).toBe('2');
    expect(secondRequest.searchParams.get('scope')).toBe('personal');
    expect((globalThis.fetch as unknown as jest.Mock).mock.calls.length).toBe(2);
  });

  it('switches to the network scope and keeps the activity request query aligned', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<{
          entries: [];
          totalCount: number;
          page: number;
          pageSize: number;
          totalPages: number;
        }> => ({
          entries: [],
          totalCount: 0,
          page: 1,
          pageSize: 5,
          totalPages: 0,
        }),
      } as unknown as typeof fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<{
          entries: [];
          totalCount: number;
          page: number;
          pageSize: number;
          totalPages: number;
        }> => ({
          entries: [],
          totalCount: 0,
          page: 1,
          pageSize: 5,
          totalPages: 0,
        }),
      } as unknown as typeof fetch);

    renderState = renderActivityFeed(
      React.createElement(ActivityFeed, {
        isDark: true,
        client: createClient(),
        signedIn: true,
      })
    );

    await act(async () => {
      await flushEffects();
      await flushEffects();
    });

    clickByTestId(renderState.container, 'airs-activity-scope-global');

    await act(async () => {
      await flushEffects();
      await flushEffects();
    });

    const secondRequest = new URL(
      String((globalThis.fetch as unknown as jest.Mock).mock.calls[1][0])
    );
    expect(secondRequest.searchParams.get('scope')).toBe('global');
    expect((globalThis.fetch as unknown as jest.Mock).mock.calls.length).toBe(2);
  });
});
