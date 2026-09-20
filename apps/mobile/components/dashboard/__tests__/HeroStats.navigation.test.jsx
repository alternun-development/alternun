import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { HeroPanel } from '@alternun/ui';
import HeroStats from '../HeroStats';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@alternun/ui', () => ({ HeroPanel: jest.fn(() => null) }));
jest.mock('../../settings/AppPreferencesProvider', () => ({
  useAppPreferences: () => ({ motionLevel: 'off' }),
}));
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ t: (key, _params, fallback) => fallback ?? key }),
}));

it('opens the profile from the hero status badge', () => {
  let tree;
  act(() => {
    tree = renderer.create(<HeroStats totalAIRS={30} />);
  });
  act(() => tree.root.findByType(HeroPanel).props.onOpenProfile());
  expect(mockPush).toHaveBeenCalledWith('/mi-perfil');
  act(() => tree.unmount());
});
