import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import TopNav from '../TopNav';

// Below the 360px extra small breakpoint.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 340, height: 700, scale: 2, fontScale: 1 }),
}));
jest.mock('expo-blur', () => ({ __esModule: true, BlurView: () => null }));
jest.mock('expo-image', () => ({ __esModule: true, Image: () => null }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});
jest.mock('../../auth/AppAuthProvider', () => ({ useAuth: () => ({ loading: false }) }));
jest.mock('../AirsDashboardProvider', () => ({
  useAirsDashboardSnapshot: () => ({ error: null, snapshot: { balanceAIRS: 30 } }),
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
  language: 'en',
  userDisplayName: 'Edward',
  notifications: [{ id: 'n1', read: false }],
  onSignIn: jest.fn(),
  onConnectWallet: jest.fn(),
  onToggleTheme: jest.fn(),
  onCycleLanguage: jest.fn(),
  onOpenProfile: jest.fn(),
  onOpenSettings: jest.fn(),
  onSignOut: jest.fn(),
};

const texts = (tree) => tree.root.findAllByType(Text).map((n) => JSON.stringify(n.props.children));
const byId = (tree, id) => tree.root.findAllByProps({ testID: id });

it('opens a full-screen menu from the hamburger with the sections and notifications', () => {
  const onNavigateToNotifications = jest.fn();
  let tree;
  act(() => {
    tree = renderer.create(
      <TopNav {...props} onNavigateToNotifications={onNavigateToNotifications} />
    );
  });
  expect(byId(tree, 'account-badge-pill')).toHaveLength(0);
  expect(byId(tree, 'fullscreen-menu')).toHaveLength(0);

  act(() => byId(tree, 'nav-hamburger')[0].props.onPress());
  expect(byId(tree, 'fullscreen-menu').length).toBeGreaterThan(0);
  expect(texts(tree).some((t) => t.includes('Explorer'))).toBe(true);
  expect(texts(tree).some((t) => t.includes('Notifications'))).toBe(true);

  act(() => byId(tree, 'fullscreen-menu-notifications')[0].props.onPress());
  expect(onNavigateToNotifications).toHaveBeenCalledTimes(1);
  expect(byId(tree, 'fullscreen-menu')).toHaveLength(0);

  act(() => byId(tree, 'nav-hamburger')[0].props.onPress());
  act(() => byId(tree, 'fullscreen-menu-close')[0].props.onPress());
  expect(byId(tree, 'fullscreen-menu')).toHaveLength(0);
  act(() => tree.unmount());
});

const pressLabel = (tree, label) => {
  let node = tree.root
    .findAllByType(Text)
    .find((n) => JSON.stringify(n.props.children).includes(label));
  while (node && !node.props.onPress) node = node.parent;
  act(() => node.props.onPress());
};
const openMenu = (tree) => act(() => byId(tree, 'nav-hamburger')[0].props.onPress());

it('runs every full-screen menu action and closes the menu where it navigates away', () => {
  const handlers = {
    onNavigate: jest.fn(),
    onCycleLanguage: jest.fn(),
    onToggleTheme: jest.fn(),
    onCycleMotionLevel: jest.fn(),
    onOpenSettings: jest.fn(),
    onSignOut: jest.fn(),
  };
  let tree;
  act(() => {
    tree = renderer.create(<TopNav {...props} {...handlers} />);
  });

  openMenu(tree);
  pressLabel(tree, 'Explorer');
  expect(handlers.onNavigate).toHaveBeenCalledWith('explorar');
  expect(byId(tree, 'fullscreen-menu')).toHaveLength(0);

  openMenu(tree);
  pressLabel(tree, 'labels.settings');
  pressLabel(tree, 'labels.language');
  pressLabel(tree, 'labels.theme');
  pressLabel(tree, 'Animación');
  expect(handlers.onCycleLanguage).toHaveBeenCalledTimes(1);
  expect(handlers.onToggleTheme).toHaveBeenCalledTimes(1);
  expect(handlers.onCycleMotionLevel).toHaveBeenCalledTimes(1);
  pressLabel(tree, 'navigation.moreSettings');
  expect(handlers.onOpenSettings).toHaveBeenCalledTimes(1);
  expect(byId(tree, 'fullscreen-menu')).toHaveLength(0);

  openMenu(tree);
  pressLabel(tree, 'Sign Out');
  expect(handlers.onSignOut).toHaveBeenCalledTimes(1);

  openMenu(tree);
  act(() => tree.root.findByProps({ statusBarTranslucent: true }).props.onRequestClose());
  expect(byId(tree, 'fullscreen-menu')).toHaveLength(0);
  act(() => tree.unmount());
});

it('falls back to the notification panel and offers sign in when signed out', () => {
  const onSignIn = jest.fn();
  let tree;
  act(() => {
    tree = renderer.create(<TopNav {...props} />);
  });
  openMenu(tree);
  act(() => byId(tree, 'fullscreen-menu-notifications')[0].props.onPress());
  expect(byId(tree, 'fullscreen-menu')).toHaveLength(0);

  act(() => {
    tree.update(<TopNav {...props} signedIn={false} onSignIn={onSignIn} />);
  });
  openMenu(tree);
  expect(byId(tree, 'fullscreen-menu-notifications')).toHaveLength(0);
  pressLabel(tree, 'labels.signIn');
  expect(onSignIn).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});
