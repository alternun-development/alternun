/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/require-await */
import React from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

let mockUser: unknown = null;
let mockToken: string | null = 'tok';
const mockLoad = jest.fn();

// The real auth client is memoized; a stable mock keeps the hook's effect from re-running.
const mockClient = { getSessionToken: async () => mockToken };
jest.mock('../../components/auth/AppAuthProvider', () => ({
  useAuth: () => ({ user: mockUser, client: mockClient }),
}));
jest.mock('../../utils/adminAccess', () => ({
  ...jest.requireActual('../../utils/adminAccess'),
  loadRemoteAdminAccess: (...args: unknown[]) => mockLoad(...args),
}));

import { useAdminAccess } from '../useAdminAccess';

function Probe(): React.JSX.Element {
  return <Text>{JSON.stringify(useAdminAccess())}</Text>;
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
const value = (r: ReactTestRenderer) =>
  JSON.parse((r.toJSON() as { children: string[] }).children[0]) as Record<string, unknown> | null;

beforeEach(() => {
  mockUser = null;
  mockToken = 'tok';
  mockLoad.mockReset();
});

describe('useAdminAccess', () => {
  it('is null while signed out and never calls the API', async () => {
    const r = await render();
    expect(value(r)).toBeNull();
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('merges the API answer for signed-in users', async () => {
    mockUser = { roles: ['authenticated'] };
    mockLoad.mockResolvedValue({
      globalRole: 'platform_owner',
      isGlobalAdmin: true,
      scopes: [],
      roles: ['platform_owner'],
    });
    const r = await render();
    expect(mockLoad).toHaveBeenCalledWith('tok');
    expect(value(r)).toMatchObject({ isGlobalAdmin: true, roles: ['platform_owner'] });
  });

  it('falls back to the session roles when there is no token or the API fails', async () => {
    mockUser = { metadata: { rawClaims: { alternun_roles: ['sub_admin'] } } };
    mockToken = null;
    let r = await render();
    expect(mockLoad).not.toHaveBeenCalled();
    expect(value(r)).toMatchObject({ isGlobalAdmin: false, canOpenAdminPanel: true });

    mockToken = 'tok';
    mockLoad.mockRejectedValue(new Error('offline'));
    r = await render();
    expect(value(r)).toMatchObject({ roles: ['sub_admin'] });
  });
});
