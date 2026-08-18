/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
import { describe, expect, it, jest } from '@jest/globals';

import {
  fetchAirsDashboardSnapshot,
  normalizeAirsDashboardSnapshot,
  withAirsRequestTimeout,
} from '../airsSnapshot';
import { resolveAirsDashboardLoadState } from '../airsDashboardState';

describe('AIRS dashboard snapshots', () => {
  it('rejects a payload without an explicit numeric balance instead of silently showing zero', () => {
    expect(
      normalizeAirsDashboardSnapshot({
        userId: 'user-1',
        lifetimeEarnedAIRS: 20,
      })
    ).toBeNull();
  });

  it('preserves an explicit zero AIRS balance', () => {
    expect(
      normalizeAirsDashboardSnapshot({
        userId: 'user-1',
        balanceAIRS: 0,
        lifetimeEarnedAIRS: 0,
      })
    ).toMatchObject({ balanceAIRS: 0, lifetimeEarnedAIRS: 0 });
  });

  it('loads the authoritative balance from the AIRS snapshot endpoint', async () => {
    const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async (): Promise<unknown> => ({
        userId: 'user-1',
        balanceAIRS: 20,
        lifetimeEarnedAIRS: 20,
      }),
    } as Response);

    await expect(
      fetchAirsDashboardSnapshot({
        apiBaseUrl: 'https://api.alternun.co',
        sessionToken: 'session-token',
        fetchImpl,
      })
    ).resolves.toMatchObject({ balanceAIRS: 20 });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.alternun.co/v1/airs/me',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer session-token', Accept: 'application/json' },
      })
    );
  });

  it('does not substitute a demo balance when the authoritative endpoint fails', async () => {
    const fetchImpl = jest
      .fn<typeof fetch>()
      .mockResolvedValue({ ok: false, status: 500 } as Response);

    await expect(
      fetchAirsDashboardSnapshot({
        apiBaseUrl: 'https://api.alternun.co',
        sessionToken: 'session-token',
        fetchImpl,
      })
    ).rejects.toThrow('AIRS snapshot request failed (500)');
  });

  it('aborts and rejects a request that exceeds the AIRS refresh timeout', async () => {
    jest.useFakeTimers();
    let receivedSignal: AbortSignal | null = null;

    const request = withAirsRequestTimeout(
      (signal) =>
        new Promise<never>((_resolve, reject) => {
          receivedSignal = signal;
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
      8_000
    );

    jest.advanceTimersByTime(8_000);

    await expect(request).rejects.toThrow('AIRS request timed out after 8000ms.');
    expect(receivedSignal?.aborted).toBe(true);
    jest.useRealTimers();
  });

  it('settles a failed initial load instead of keeping dashboard AIRS content loading', () => {
    const error = new Error('AIRS snapshot request failed (500)');

    expect(resolveAirsDashboardLoadState({ snapshot: null, isLoading: false, error })).toEqual({
      isInitialLoading: false,
      error,
    });
  });
});
