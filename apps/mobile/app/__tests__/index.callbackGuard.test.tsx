/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('react-native', () => require('react-native-web'));

jest.mock('expo-router', () => ({
  __esModule: true,
  Redirect: () => null,
  useFocusEffect: () => {},
  usePathname: jest.fn(),
  useRootNavigationState: () => ({ key: 'ready' }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../components/auth/AppAuthProvider', () => ({
  __esModule: true,
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: jest.fn(),
    signOutUser: jest.fn(),
    client: null,
  }),
}));

jest.mock('../../components/dashboard/Dashboard', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/dashboard/AirsDashboardProvider', () => ({
  __esModule: true,
  useAirsDashboardSnapshot: () => ({
    snapshot: null,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

jest.mock('../../components/landing/PublicLandingPage', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/settings/AppPreferencesProvider', () => ({
  __esModule: true,
  useAppPreferences: () => ({ showAirsIntro: false, setShowAirsIntro: jest.fn() }),
}));

jest.mock('../../components/auth/authExecutionMode', () => ({
  __esModule: true,
  isBetterAuthExecutionEnabled: () => false,
}));

jest.mock('../../components/auth/authCallbackFlow', () => ({
  __esModule: true,
  buildWebAuthCallbackRedirectPath: () => '/auth/callback?code=test-code',
}));

// virtual: true — CI does not build packages/auth/dist before running mobile
// tests, so the real module is unresolvable there; this mock never needs it.
jest.mock(
  '@alternun/auth',
  () => ({
    __esModule: true,
    readPendingAuthentikOAuthProvider: () => null,
  }),
  { virtual: true }
);

import { usePathname } from 'expo-router';
import HomeScreen from '../index';

const mockUsePathname = usePathname as unknown as jest.MockedFunction<typeof usePathname>;

type RenderState = {
  container: HTMLDivElement;
  root: Root;
};

function renderHomeScreen(): RenderState {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<HomeScreen />);
  });

  return { container, root };
}

describe('HomeScreen auth callback redirect guard', () => {
  let renderState: RenderState | null = null;
  let replaceMock: jest.Mock;
  const originalLocation = window.location;

  beforeEach(() => {
    renderState = null;
    replaceMock = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search: '', hash: '', replace: replaceMock },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
    if (renderState) {
      act(() => {
        renderState.root.unmount();
      });
    }
    renderState?.container.remove();
    jest.clearAllMocks();
  });

  it('redirects to the callback route when a callback payload is present and not already there', () => {
    mockUsePathname.mockReturnValue('/');

    renderState = renderHomeScreen();

    expect(replaceMock).toHaveBeenCalledWith('/auth/callback?code=test-code');
  });

  it('does not re-trigger the redirect once already on /auth/callback (regression: infinite reload loop)', () => {
    mockUsePathname.mockReturnValue('/auth/callback');

    renderState = renderHomeScreen();

    expect(replaceMock).not.toHaveBeenCalled();
  });
});
