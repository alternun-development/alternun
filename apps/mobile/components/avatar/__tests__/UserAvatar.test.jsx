import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image, Text } from 'react-native';
import Svg from 'react-native-svg';
import UserAvatar from '../UserAvatar';
import AvatarPresetArt, { AVATAR_PRESETS, isAvatarPreset } from '../AvatarPresetArt';
import HonorAwardEmblem from '../../honorAwards/HonorAwardEmblem';
import { ACHIEVEMENT_ARTWORK, STATUS_BADGES } from '../../profile/badgeAssets';
import { resetUserAvatarState, setUserAvatarState } from '../../../utils/userAvatar';

jest.mock('../../honorAwards/HonorAwardEmblem', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

function render(element) {
  let tree;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
}

afterEach(() => {
  act(() => resetUserAvatarState());
  jest.clearAllMocks();
});

describe('UserAvatar', () => {
  it('shows a chosen illustration', () => {
    const tree = render(
      <UserAvatar size={40} initials='AB' choice={{ kind: 'preset', ref: 'turtle', art: null }} />
    );
    expect(tree.root.findAllByType(AvatarPresetArt)[0].props).toEqual({
      preset: 'turtle',
      size: 40,
    });
  });

  it('shows a chosen tier or milestone badge', () => {
    const tier = render(
      <UserAvatar size={40} initials='AB' choice={{ kind: 'tier', ref: 'gold', art: null }} />
    );
    expect(tier.root.findByType(Image).props.source).toBe(STATUS_BADGES.gold);

    const milestone = render(
      <UserAvatar
        size={40}
        initials='AB'
        choice={{ kind: 'achievement', ref: 'first_100_airs', art: null }}
      />
    );
    expect(milestone.root.findByType(Image).props.source).toBe(ACHIEVEMENT_ARTWORK.first_100_airs);
  });

  it('draws a claimed honor award from its art', () => {
    const art = {
      title: 'Manglar Verde',
      tier: 'gold',
      kind: 'medal',
      artPreset: 'manglar-verde',
      badgeImageUrl: null,
    };
    render(<UserAvatar size={50} initials='AB' choice={{ kind: 'honor_award', ref: 'g1', art }} />);
    expect(HonorAwardEmblem.mock.calls[0][0]).toMatchObject({
      tier: 'gold',
      kind: 'medal',
      title: 'Manglar Verde',
      artPreset: 'manglar-verde',
      size: 43,
    });
  });

  it('falls back to the social photo when the choice is unknown', () => {
    const tree = render(
      <UserAvatar
        size={40}
        initials='AB'
        choice={{ kind: 'preset', ref: 'dragon', art: null }}
        socialUrl='https://cdn.test/me.png'
      />
    );
    const image = tree.root.findByType(Image);
    expect(image.props.source).toEqual({ uri: 'https://cdn.test/me.png' });
    expect(image.props.style).toEqual([{ width: 40, height: 40 }, { borderRadius: 20 }]);
  });

  it('uses the signed-in person from the shared store', () => {
    act(() => setUserAvatarState({ socialUrl: 'https://cdn.test/store.png' }));
    const tree = render(<UserAvatar size={40} initials='AB' />);
    expect(tree.root.findByType(Image).props.source).toEqual({
      uri: 'https://cdn.test/store.png',
    });

    act(() => setUserAvatarState({ choice: { kind: 'preset', ref: 'sun', art: null } }));
    expect(tree.root.findAllByType(AvatarPresetArt)).toHaveLength(1);
  });

  it('never shows a photo when socialUrl is null, using the fallback image', () => {
    act(() => setUserAvatarState({ socialUrl: 'https://cdn.test/store.png' }));
    const tree = render(
      <UserAvatar size={40} initials='AB' socialUrl={null} fallback={STATUS_BADGES.bronze} />
    );
    expect(tree.root.findByType(Image).props.source).toBe(STATUS_BADGES.bronze);
  });

  it('shows the initials when there is nothing else', () => {
    const tree = render(
      <UserAvatar size={50} initials='JD' socialUrl={null} initialsBackground='#123456' />
    );
    expect(tree.root.findByType(Text).props.children).toBe('JD');
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
  });
});

describe('AvatarPresetArt', () => {
  it('draws every preset and a default scene for unknown names', () => {
    for (const preset of [...AVATAR_PRESETS, 'unknown']) {
      const tree = render(<AvatarPresetArt preset={preset} size={64} />);
      const svg = tree.root.findByType(Svg);
      expect(svg.props.width).toBe(64);
      expect(tree.toJSON()).toBeTruthy();
      act(() => tree.unmount());
    }
  });

  it('only accepts the known presets', () => {
    expect(isAvatarPreset('mangrove')).toBe(true);
    expect(isAvatarPreset('dragon')).toBe(false);
    expect(isAvatarPreset(null)).toBe(false);
  });
});
