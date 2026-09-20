import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import TopNav from '../TopNav';

let mockBalance = null;
let mockAuthLoading = false;
let mockBalanceError = null;
jest.mock('../../auth/AppAuthProvider', () => ({ useAuth: () => ({ loading: mockAuthLoading }) }));
beforeEach(() => {
  mockAuthLoading = false;
  mockBalanceError = null;
  mockBalance = null;
});
jest.mock('../AirsDashboardProvider', () => ({
  useAirsDashboardSnapshot: () => ({
    error: mockBalanceError,
    snapshot: mockBalance == null ? null : { balanceAIRS: mockBalance },
  }),
}));
jest.mock('@alternun/ui', () => ({
  TIERS: {
    bronze: { label: 'Bronze', color: '#cd7f32' },
    silver: { label: 'Silver', color: '#a8b8cc' },
    gold: { label: 'Gold', color: '#d4b96a' },
    platinum: { label: 'Platinum', color: '#9ba9c4' },
  },
  resolveTier: (score) =>
    score >= 20000 ? 'platinum' : score >= 5000 ? 'gold' : score >= 1000 ? 'silver' : 'bronze',
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
  notifications: [],
  onSignIn: jest.fn(),
  onConnectWallet: jest.fn(),
  onToggleTheme: jest.fn(),
  onCycleLanguage: jest.fn(),
  onOpenProfile: jest.fn(),
  onOpenSettings: jest.fn(),
  onSignOut: jest.fn(),
};

it.each(
  [
    [30, 'Bronze', '#cd7f32'],
    [1000, 'Silver', '#a8b8cc'],
    [5000, 'Gold', '#d4b96a'],
    [20000, 'Platinum', '#9ba9c4'],
  ].flatMap((row) => ['dark', 'light'].map((theme) => [...row, theme]))
)(
  'keeps the shared %s AIRS tier (%s, %s) across routes in %s mode',
  (score, label, color, themeMode) => {
    mockBalance = score;
    let tree;
    act(() => {
      tree = renderer.create(<TopNav {...props} themeMode={themeMode} activeSection='dashboard' />);
    });
    const expectTier = () => {
      expect(
        tree.root
          .findAllByType(Text)
          .some((node) => JSON.stringify(node.props.children).includes(label))
      ).toBe(true);
      expect(
        tree.root
          .findAllByType(TouchableOpacity)
          .some((node) => StyleSheet.flatten(node.props.style)?.borderColor === color)
      ).toBe(true);
    };
    expectTier();
    const trigger = tree.root
      .findAllByType(TouchableOpacity)
      .find((node) => StyleSheet.flatten(node.props.style)?.borderColor === color);
    act(() => trigger.props.onPress());
    const dropdownBadge = tree.root.findAllByProps({ testID: 'dropdown-tier-badge' })[0];
    expect(StyleSheet.flatten(dropdownBadge.props.style)).toMatchObject({
      backgroundColor: `${color}14`,
      borderColor: `${color}80`,
    });
    expect(
      tree.root
        .findAllByType(TouchableOpacity)
        .some((node) => StyleSheet.flatten(node.props.style)?.backgroundColor === color)
    ).toBe(false);
    act(() => {
      tree.update(<TopNav {...props} themeMode={themeMode} activeSection='mi-perfil' />);
    });
    expectTier();
    act(() => {
      tree.update(<TopNav {...props} themeMode={themeMode} activeSection='settings' />);
    });
    expectTier();
    act(() => {
      tree.unmount();
    });
  }
);

it('shows a skeleton until auth and the initial balance settle, then retains the tier on refresh', () => {
  mockAuthLoading = true;
  let tree;
  act(() => {
    tree = renderer.create(<TopNav {...props} signedIn={false} />);
  });
  expect(tree.root.findAllByProps({ testID: 'account-badge-skeleton' }).length).toBeGreaterThan(0);
  mockAuthLoading = false;
  act(() => {
    tree.update(<TopNav {...props} />);
  });
  expect(tree.root.findAllByProps({ testID: 'account-badge-skeleton' }).length).toBeGreaterThan(0);
  mockBalance = 30;
  act(() => {
    tree.update(<TopNav {...props} />);
  });
  expect(tree.root.findAllByProps({ testID: 'account-badge-skeleton' })).toHaveLength(0);
  mockBalanceError = new Error('Refresh failed');
  act(() => {
    tree.update(<TopNav {...props} />);
  });
  expect(
    tree.root
      .findAllByType(TouchableOpacity)
      .some((node) => StyleSheet.flatten(node.props.style)?.borderColor === '#cd7f32')
  ).toBe(true);
  act(() => tree.unmount());
});

it('ends the skeleton with a neutral account badge if the initial balance fails', () => {
  mockBalanceError = new Error('Balance unavailable');
  let tree;
  act(() => {
    tree = renderer.create(<TopNav {...props} />);
  });
  expect(tree.root.findAllByProps({ testID: 'account-badge-skeleton' })).toHaveLength(0);
  expect(
    tree.root
      .findAllByType(Text)
      .some((node) => JSON.stringify(node.props.children).includes('Bronze'))
  ).toBe(false);
  act(() => tree.unmount());
});
