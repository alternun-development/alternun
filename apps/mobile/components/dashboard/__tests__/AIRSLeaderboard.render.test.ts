/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-var-requires */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import AIRSLeaderboard from '../AIRSLeaderboard';
import { changeLeaderboardScope } from '../leaderboardTransitions';

const mockLayoutAnimationConfigureNext = jest.fn<void, [unknown]>();

jest.mock('react-native', () => {
  const reactNativeWeb = require('react-native-web');

  return {
    ...reactNativeWeb,
    LayoutAnimation: {
      configureNext: mockLayoutAnimationConfigureNext,
      Presets: {
        easeInEaseOut: {},
      },
    },
  };
});

jest.mock('../../../utils/runtimeConfig', () => ({
  resolveMobileApiBaseUrl: (): string => 'http://127.0.0.1:3000',
}));

type AIRSLeaderboardProps = React.ComponentProps<typeof AIRSLeaderboard>;
type RenderState = {
  container: HTMLDivElement;
  root: Root;
};

function createClient(): NonNullable<AIRSLeaderboardProps['client']> {
  return {
    getSessionToken: async (): Promise<string | null> => 'session-token',
  };
}

function renderAIRSLeaderboard(element: React.ReactElement): RenderState {
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

function clickElementByTestId(container: HTMLElement, testId: string): void {
  const element = container.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

  if (!element) {
    throw new Error(`Unable to find element with test id: ${testId}`);
  }

  act(() => {
    element.click();
  });
}

describe('AIRSLeaderboard render', () => {
  const originalFetch = globalThis.fetch;
  let renderState: RenderState | null = null;

  beforeEach(() => {
    mockLayoutAnimationConfigureNext.mockReset();
    renderState = null;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    globalThis.fetch = originalFetch;
    if (renderState) {
      act(() => {
        renderState.root.unmount();
      });
    }
    renderState?.container.remove();
  });

  it('renders the initial ranking copy after loading', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<{
          entries: Array<{
            rank: number;
            userId: string;
            displayName: string;
            airsBalance: number;
            airsLifetimeEarned: number;
            isMe: boolean;
          }>;
          requestingUserEntry: {
            rank: number;
            userId: string;
            displayName: string;
            airsBalance: number;
            airsLifetimeEarned: number;
            isMe: boolean;
          } | null;
        }> => ({
          entries: [
            {
              rank: 1,
              userId: 'user-1',
              displayName: 'Tiranicida A.',
              airsBalance: 20,
              airsLifetimeEarned: 20,
              isMe: false,
            },
          ],
          requestingUserEntry: {
            rank: 4,
            userId: 'user-me',
            displayName: 'Edward Calderon',
            airsBalance: 12,
            airsLifetimeEarned: 12,
            isMe: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<{
          globalRank: number;
          countryRank: number;
          cityRank: number;
          country: string;
          city: string;
        }> => ({
          globalRank: 4,
          countryRank: 12,
          cityRank: 3,
          country: 'Colombia',
          city: 'Bogotá',
        }),
      }) as unknown as typeof fetch;

    renderState = renderAIRSLeaderboard(
      React.createElement(AIRSLeaderboard, {
        isDark: true,
        client: createClient(),
        signedIn: true,
      })
    );

    await act(async () => {
      await flushEffects();
      await flushEffects();
    });

    expect(renderState.container.textContent).toContain('Top AIRS');
    expect(renderState.container.textContent).toContain('Ranking global de acumuladores');
    expect(renderState.container.textContent).toContain('Tu posición global: #4');
  });

  it('configures a layout animation when the ranking scope changes', () => {
    const configureNextCalls: unknown[] = [];
    const setScopeCalls: string[] = [];

    const configureNext = (config: unknown): void => {
      configureNextCalls.push(config);
    };
    const setScope = (scope: string): void => {
      setScopeCalls.push(scope);
    };

    changeLeaderboardScope('country', 'global', setScope, configureNext);

    expect(configureNextCalls).toHaveLength(1);
    expect(setScopeCalls).toEqual(['country']);
  });

  it('skips layout animation when the ranking scope stays the same', () => {
    const configureNextCalls: unknown[] = [];
    const setScopeCalls: string[] = [];

    const configureNext = (config: unknown): void => {
      configureNextCalls.push(config);
    };
    const setScope = (scope: string): void => {
      setScopeCalls.push(scope);
    };

    changeLeaderboardScope('global', 'global', setScope, configureNext);

    expect(configureNextCalls).toHaveLength(0);
    expect(setScopeCalls).toHaveLength(0);
  });

  it('switches to the country and city ranking branches', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<{
          entries: Array<{
            rank: number;
            userId: string;
            displayName: string;
            airsBalance: number;
            airsLifetimeEarned: number;
            isMe: boolean;
          }>;
          requestingUserEntry: {
            rank: number;
            userId: string;
            displayName: string;
            airsBalance: number;
            airsLifetimeEarned: number;
            isMe: boolean;
          } | null;
        }> => ({
          entries: [
            {
              rank: 1,
              userId: 'user-1',
              displayName: 'Tiranicida A.',
              airsBalance: 20,
              airsLifetimeEarned: 20,
              isMe: false,
            },
          ],
          requestingUserEntry: {
            rank: 4,
            userId: 'user-me',
            displayName: 'Edward Calderon',
            airsBalance: 12,
            airsLifetimeEarned: 12,
            isMe: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<{
          globalRank: number;
          countryRank: number;
          cityRank: number;
          country: string;
          city: string;
        }> => ({
          globalRank: 4,
          countryRank: 12,
          cityRank: 3,
          country: 'Colombia',
          city: 'Bogotá',
        }),
      }) as unknown as typeof fetch;

    renderState = renderAIRSLeaderboard(
      React.createElement(AIRSLeaderboard, {
        isDark: true,
        client: createClient(),
        signedIn: true,
      })
    );

    await act(async () => {
      await flushEffects();
      await flushEffects();
    });

    clickElementByTestId(renderState.container, 'airs-scope-country');
    expect(renderState.container.textContent).toContain('Ranking en Colombia');
    expect(renderState.container.textContent).toContain('Ranking por país próximamente');

    clickElementByTestId(renderState.container, 'airs-scope-city');
    expect(renderState.container.textContent).toContain('Ranking en Bogotá');
    expect(renderState.container.textContent).toContain('Ranking por ciudad próximamente');
  });

  it('renders the signed-out prompt', () => {
    renderState = renderAIRSLeaderboard(
      React.createElement(AIRSLeaderboard, {
        isDark: true,
        client: createClient(),
        signedIn: false,
      })
    );

    expect(renderState.container.textContent).toContain(
      'Inicia sesión para ver el ranking de AIRS'
    );
  });

  it('renders the leaderboard error state when the request fails', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<{
          globalRank: number | null;
          countryRank: number | null;
          cityRank: number | null;
          country: string | null;
          city: string | null;
        }> => ({
          globalRank: null,
          countryRank: null,
          cityRank: null,
          country: null,
          city: null,
        }),
      }) as unknown as typeof fetch;

    renderState = renderAIRSLeaderboard(
      React.createElement(AIRSLeaderboard, {
        isDark: true,
        client: createClient(),
        signedIn: true,
      })
    );

    await act(async () => {
      await flushEffects();
      await flushEffects();
    });

    expect(renderState.container.textContent).toContain('Failed to load leaderboard (503)');
  });

  it('renders the empty leaderboard state when there are no entries', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<{
          entries: [];
          requestingUserEntry: null;
        }> => ({
          entries: [],
          requestingUserEntry: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<{
          globalRank: number | null;
          countryRank: number | null;
          cityRank: number | null;
          country: string | null;
          city: string | null;
        }> => ({
          globalRank: null,
          countryRank: null,
          cityRank: null,
          country: null,
          city: null,
        }),
      }) as unknown as typeof fetch;

    renderState = renderAIRSLeaderboard(
      React.createElement(AIRSLeaderboard, {
        isDark: true,
        client: createClient(),
        signedIn: true,
      })
    );

    await act(async () => {
      await flushEffects();
      await flushEffects();
    });

    expect(renderState.container.textContent).toContain('Aún no hay usuarios con AIRS acumulados.');
  });

  it('renders the out-of-top user row in the global ranking', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<{
          entries: Array<{
            rank: number;
            userId: string;
            displayName: string;
            airsBalance: number;
            airsLifetimeEarned: number;
            isMe: boolean;
          }>;
          requestingUserEntry: {
            rank: number;
            userId: string;
            displayName: string;
            airsBalance: number;
            airsLifetimeEarned: number;
            isMe: boolean;
          } | null;
        }> => ({
          entries: [
            {
              rank: 1,
              userId: 'user-1',
              displayName: 'Tiranicida A.',
              airsBalance: 20,
              airsLifetimeEarned: 20,
              isMe: false,
            },
          ],
          requestingUserEntry: {
            rank: 25,
            userId: 'user-me',
            displayName: 'Edward Calderon',
            airsBalance: 12,
            airsLifetimeEarned: 12,
            isMe: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<{
          globalRank: number;
          countryRank: number;
          cityRank: number;
          country: string;
          city: string;
        }> => ({
          globalRank: 25,
          countryRank: 12,
          cityRank: 3,
          country: 'Colombia',
          city: 'Bogotá',
        }),
      }) as unknown as typeof fetch;

    renderState = renderAIRSLeaderboard(
      React.createElement(AIRSLeaderboard, {
        isDark: true,
        client: createClient(),
        signedIn: true,
      })
    );

    await act(async () => {
      await flushEffects();
      await flushEffects();
    });

    expect(renderState.container.textContent).toContain('Tu posición global: #25');
    expect(renderState.container.textContent).toContain('· · ·');
  });
});
