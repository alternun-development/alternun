/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises */
import React from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

const mockReplace = jest.fn();
let mockPathname = '/mi-perfil';
let mockParams: Record<string, string | string[]> = {};
let mockNavigationKey: string | undefined = 'root';

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useGlobalSearchParams: () => mockParams,
  useRootNavigationState: () => (mockNavigationKey ? { key: mockNavigationKey } : undefined),
  useRouter: () => ({ replace: mockReplace }),
  Unmatched: () => {
    const { Text: MockText } = jest.requireActual('react-native');
    return <MockText>not found</MockText>;
  },
}));

import { useLegacyRouteRedirect } from '../legacyRoutes';
import NotFoundScreen from '../../app/+not-found';

function Probe(): React.JSX.Element {
  return <Text>{String(useLegacyRouteRedirect())}</Text>;
}

function render(element: React.JSX.Element): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(element);
  });
  return renderer!;
}

beforeEach(() => {
  mockReplace.mockClear();
  mockPathname = '/mi-perfil';
  mockParams = {};
  mockNavigationKey = 'root';
});

describe('useLegacyRouteRedirect', () => {
  it('replaces a legacy URL with its English route, keeping the query', () => {
    mockParams = { tab: 'wallet', 'not-found': ['mi-perfil'] };
    const r = render(<Probe />);
    expect(mockReplace).toHaveBeenCalledWith('/profile?tab=wallet');
    expect(JSON.stringify(r.toJSON())).toContain('true');
  });

  it('waits for navigation to be ready before redirecting', () => {
    mockNavigationKey = undefined;
    render(<Probe />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('leaves unknown paths alone', () => {
    mockPathname = '/no-such-page';
    const r = render(<Probe />);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(JSON.stringify(r.toJSON())).toContain('false');
  });
});

describe('NotFoundScreen', () => {
  it('renders nothing while redirecting a legacy URL', () => {
    mockPathname = '/explorar/empresa/hoteles-taybo';
    const r = render(<NotFoundScreen />);
    expect(r.toJSON()).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith('/explore/enterprise/hoteles-taybo');
  });

  it('shows the not-found screen for any other URL', () => {
    mockPathname = '/nope';
    const r = render(<NotFoundScreen />);
    expect(JSON.stringify(r.toJSON())).toContain('not found');
  });
});
