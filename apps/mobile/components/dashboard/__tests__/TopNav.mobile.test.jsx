import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import TopNav from '../TopNav';

// A phone: below the 720px mobile breakpoint, above the extra small one.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 360, height: 800, scale: 2, fontScale: 1 }),
}));
jest.mock('expo-blur', () => ({ __esModule: true, BlurView: () => null }));
jest.mock('expo-image', () => ({ __esModule: true, Image: () => null }));
jest.mock('../../auth/AppAuthProvider', () => ({ useAuth: () => ({ loading: false }) }));
jest.mock('../AirsDashboardProvider', () => ({
  useAirsDashboardSnapshot: () => ({ error: null, snapshot: { balanceAIRS: 20 } }),
}));
jest.mock('@alternun/ui', () => ({
  TIERS: { bronze: { label: 'Bronze', color: '#cd7f32' } },
  resolveTier: () => 'bronze',
}));
jest.mock('@alternun/i18n', () => ({ getLocaleLabel: () => 'English' }));
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ t: (key, _params, fallback) => fallback ?? key }),
}));
jest.mock('../NotificationDropdown', () => () => null);

const props = {
  signedIn: true,
  walletConnected: false,
  walletAddress: '',
  themeMode: 'dark',
  language: 'es',
  userDisplayName: 'Edward',
  notifications: [],
  onSignIn: jest.fn(),
  onConnectWallet: jest.fn(),
  onToggleTheme: jest.fn(),
  onCycleLanguage: jest.fn(),
  onOpenProfile: jest.fn(),
  onOpenSettings: jest.fn(),
  onSignOut: jest.fn(),
};

it('fits the phone pill to a short name instead of a fixed width', () => {
  let tree;
  act(() => {
    tree = renderer.create(<TopNav {...props} activeSection='dashboard' />);
  });
  const pill = StyleSheet.flatten(
    tree.root.findAllByProps({ testID: 'account-badge-pill' })[0].props.style
  );
  expect(pill.width).toBeUndefined();
  // 360 - (103 logo + 2 x 8 padding + 10) leaves 231 at most.
  expect(pill.maxWidth).toBe(231);
  act(() => tree.unmount());
});

it('opens notifications under the pill, at the same place as the menu', () => {
  let tree;
  act(() => {
    tree = renderer.create(<TopNav {...props} activeSection='dashboard' />);
  });
  const anchor = () =>
    StyleSheet.flatten(
      tree.root.findAll(
        (node) => node.props.testID === 'notification-dropdown-anchor' && node.props.style
      )[0].props.style
    );
  expect(tree.root.findAllByProps({ testID: 'notification-dropdown-anchor' })).not.toHaveLength(0);
  act(() =>
    tree.root
      .findAllByProps({ testID: 'account-badge-bell' })[0]
      .props.onPress({ stopPropagation: () => {} })
  );
  // Pill height 36 + 8 gap, right edge of the pill, fits a 360 wide screen.
  expect([anchor().top, anchor().right, anchor().width]).toEqual([44, 0, 300]);

  act(() => tree.root.findAllByProps({ testID: 'account-badge-pill' })[0].props.onPress());
  const menu = tree.root.findAll(
    (node) =>
      typeof node.type !== 'string' &&
      StyleSheet.flatten(node.props.style)?.width === 220 &&
      StyleSheet.flatten(node.props.style)?.top !== undefined
  )[0];
  expect(StyleSheet.flatten(menu.props.style).top).toBe(anchor().top);
  act(() => tree.unmount());
});
