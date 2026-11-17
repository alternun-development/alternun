/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await */
import React from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

let mockUser: unknown = null;
const mockAccess = jest.fn();

// The real auth client is memoized; a stable mock keeps the hook's effect from re-running.
const mockClient = { getSessionToken: async () => 'tok' };
jest.mock('../../components/auth/AppAuthProvider', () => ({
  useAuth: () => ({ user: mockUser, client: mockClient }),
}));
jest.mock('../../utils/airsReports', () => ({
  createAirsReviewClient: () => ({ access: () => mockAccess() }),
}));

import { useAirsReviewAccess } from '../useAirsReviewAccess';

function Probe(): React.JSX.Element {
  return <Text>{String(useAirsReviewAccess())}</Text>;
}

async function render(): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<Probe />);
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer!;
}
const value = (r: ReactTestRenderer) => (r.toJSON() as { children: string[] }).children[0];

beforeEach(() => {
  mockUser = null;
  mockAccess.mockReset();
});

describe('useAirsReviewAccess', () => {
  it('is false while signed out and never asks the API', async () => {
    const r = await render();
    expect(value(r)).toBe('false');
    expect(mockAccess).not.toHaveBeenCalled();
  });

  it('follows the API answer for signed-in people', async () => {
    mockUser = { id: 'u1' };
    mockAccess.mockResolvedValue({ canApprove: true });
    expect(value(await render())).toBe('true');

    mockAccess.mockResolvedValue({ canApprove: false });
    expect(value(await render())).toBe('false');
  });

  it('stays false when the API cannot answer', async () => {
    mockUser = { id: 'u1' };
    mockAccess.mockRejectedValue(new Error('offline'));
    expect(value(await render())).toBe('false');
  });
});
