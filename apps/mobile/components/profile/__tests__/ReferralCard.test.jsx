import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Modal, Platform, Share, StyleSheet, Text, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ReferralCard } from '../ReferralCard';

jest.mock('@alternun/ui', () => {
  const { View } = require('react-native');
  return {
    GlassCard: View,
  };
});
jest.mock('expo-clipboard', () => ({ setString: jest.fn() }));
jest.mock('react-native-qrcode-svg', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));
jest.mock('../../../utils/runtimeConfig', () => ({
  resolveMobileApiBaseUrl: () => 'https://api.example.test',
}));
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    t: (_key, params, fallback) =>
      fallback.replace(/{{(\w+)}}/g, (_, key) => String(params?.[key] ?? '')),
  }),
}));

const mockQRCode = require('react-native-qrcode-svg').default;

const VALID_LINK = 'https://example.test/auth?referralCode=ana-verde-a1b2c3';
const c = {
  bg: '#f0fdf9',
  cardBg: '#ffffff',
  cardBorder: '#d1d5db',
  border: '#d1d5db',
  text: '#0b2d31',
  muted: '#64748b',
  accent: '#0d9488',
};
const user = { id: 'user-test', email: 'ana@example.test', metadata: {} };

let tree;
let originalPlatform;
let originalShare;
let originalAddEventListener;
let originalRemoveEventListener;
let windowDimensionsSpy;

function makeSummary(referralLink = VALID_LINK) {
  return {
    user_id: 'user-test',
    referral_code: 'ana-verde-a1b2c3',
    referral_link: referralLink,
    referral_count: 0,
    referred_by_user_id: null,
    referred_by_referral_code: null,
    referred_by_name: null,
    referred_by_email: null,
    referred_users: [],
  };
}

async function mountCard(referralLink = VALID_LINK, isDark = false) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => makeSummary(referralLink),
  });
  await act(async () => {
    tree = renderer.create(<ReferralCard user={user} isDark={isDark} c={c} />);
  });
  await act(async () => Promise.resolve());
}

function findAction(label) {
  return tree.root.findAll(
    (node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function'
  )[0];
}

function modal() {
  return tree.root.findByType(Modal);
}

beforeEach(() => {
  jest.clearAllMocks();
  windowDimensionsSpy = jest
    .spyOn(require('react-native'), 'useWindowDimensions')
    .mockReturnValue({ width: 320, height: 640, scale: 1, fontScale: 1 });
  originalPlatform = Platform.OS;
  originalShare = Share.share;
  originalAddEventListener = globalThis.addEventListener;
  originalRemoveEventListener = globalThis.removeEventListener;
  Share.share = jest.fn().mockResolvedValue({ action: 'sharedAction' });
});

afterEach(() => {
  if (tree) {
    act(() => tree.unmount());
  }
  tree = null;
  Platform.OS = originalPlatform;
  Share.share = originalShare;
  globalThis.addEventListener = originalAddEventListener;
  globalThis.removeEventListener = originalRemoveEventListener;
  windowDimensionsSpy.mockRestore();
});

it('opens from the referral code and encodes the exact API referral link', async () => {
  await mountCard();

  act(() => findAction('Show referral QR code').props.onPress());

  expect(modal().props.visible).toBe(true);
  expect(modal().props.statusBarTranslucent).toBe(true);
  const qrProps = mockQRCode.mock.calls.at(-1)[0];
  expect(qrProps.value).toBe(VALID_LINK);
  expect(qrProps.quietZone).toBe(20);
  expect(qrProps.size).toBe(208);
  expect(qrProps.size + 8 + 40).toBeLessThanOrEqual(320 - 32);
});

it('closes with the X, backdrop, onRequestClose, and Escape on web', async () => {
  Platform.OS = 'web';
  let keydown;
  globalThis.addEventListener = jest.fn((event, handler) => {
    if (event === 'keydown') keydown = handler;
  });
  globalThis.removeEventListener = jest.fn();
  await mountCard();

  const open = () => act(() => findAction('Show referral QR code').props.onPress());
  open();
  act(() => tree.root.findByProps({ testID: 'referral-qr-close' }).props.onPress());
  expect(modal().props.visible).toBe(false);

  open();
  act(() => tree.root.findByProps({ testID: 'referral-qr-backdrop' }).props.onPress());
  expect(modal().props.visible).toBe(false);

  open();
  act(() => modal().props.onRequestClose());
  expect(modal().props.visible).toBe(false);

  open();
  expect(keydown).toEqual(expect.any(Function));
  act(() => keydown({ key: 'Escape' }));
  expect(modal().props.visible).toBe(false);
});

it('keeps both Copy actions and Share using the exact referral link', async () => {
  jest.useFakeTimers();
  await mountCard();

  const copyActions = tree.root.findAll(
    (node) =>
      node.type === TouchableOpacity &&
      node.props.accessibilityLabel === 'Copy' &&
      typeof node.props.onPress === 'function'
  );
  expect(copyActions).toHaveLength(2);
  act(() => copyActions[0].props.onPress());
  act(() => copyActions[1].props.onPress());
  expect(Clipboard.setString).toHaveBeenNthCalledWith(1, VALID_LINK);
  expect(Clipboard.setString).toHaveBeenNthCalledWith(2, VALID_LINK);

  await act(async () => findAction('Share your referral link').props.onPress());
  expect(Share.share).toHaveBeenCalledWith({
    title: 'Share your referral link',
    message: `Join me on Airs By Alternun: ${VALID_LINK}`,
  });
  act(() => jest.runOnlyPendingTimers());
  jest.useRealTimers();
});

it.each(['', '/auth?referralCode=ana-verde-a1b2c3', 'not-a-url', 'https://'])(
  'does not render a QR and disables Copy and Share for invalid link %p',
  async (referralLink) => {
    await mountCard(referralLink);
    act(() => findAction('Show referral QR code').props.onPress());

    expect(mockQRCode).not.toHaveBeenCalled();
    expect(
      tree.root
        .findAllByType(Text)
        .map((node) => node.props.children)
        .flat()
    ).toContain('Referral link unavailable.');

    const disabledActions = tree.root.findAll(
      (node) =>
        ['Copy', 'Share your referral link'].includes(node.props.accessibilityLabel) &&
        typeof node.props.onPress === 'function'
    );
    expect(disabledActions.length).toBeGreaterThanOrEqual(3);
    expect(disabledActions.every((node) => node.props.disabled === true)).toBe(true);
  }
);

it('uses a higher-contrast unavailable message in dark mode', async () => {
  await mountCard('', true);
  act(() => findAction('Show referral QR code').props.onPress());

  const unavailableMessage = tree.root
    .findAllByType(Text)
    .find((node) => node.props.children === 'Referral link unavailable.');

  expect(StyleSheet.flatten(unavailableMessage.props.style).color).toBe('#fca5a5');
});
