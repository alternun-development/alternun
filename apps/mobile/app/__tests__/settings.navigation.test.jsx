import React from 'react';
import renderer, { act } from 'react-test-renderer';
import TopNav from '../../components/dashboard/TopNav';
import SettingsScreen from '../settings';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));
jest.mock('@alternun/i18n', () => ({ getLocaleLabel: () => 'English' }));
jest.mock('../../components/dashboard/TopNav', () => jest.fn(() => null));
jest.mock('../../components/auth/AppAuthProvider', () => ({
  useAuth: () => ({ user: null, signOutUser: jest.fn() }),
}));
jest.mock('../../components/settings/AppPreferencesProvider', () => ({
  useAppPreferences: () => ({
    themeMode: 'dark',
    language: 'en',
    showAirsIntro: false,
    showWelcomeBonusModal: false,
    motionLevel: 'off',
    toggleThemeMode: jest.fn(),
    cycleLanguage: jest.fn(),
    cycleMotionLevel: jest.fn(),
    setShowAirsIntro: jest.fn(),
    setShowWelcomeBonusModal: jest.fn(),
  }),
}));
jest.mock('../../components/i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ t: (key, _params, fallback) => fallback ?? key }),
}));

it('opens the profile route from the top navigation', () => {
  let tree;
  act(() => {
    tree = renderer.create(<SettingsScreen />);
  });
  act(() => TopNav.mock.calls.at(-1)[0].onOpenProfile());
  expect(mockPush).toHaveBeenCalledWith('/mi-perfil');
  act(() => tree.unmount());
});
