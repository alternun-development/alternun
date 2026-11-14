import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import HonorAwardClaimCinematic from '../HonorAwardClaimCinematic';
import HonorAwardInspectModal from '../HonorAwardInspectModal';
import HonorAwardCard from '../HonorAwardCard';

const mockPush = jest.fn();
let mockMotion = 'off';
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('../../settings/AppPreferencesProvider', () => ({
  useAppPreferences: () => ({ motionLevel: mockMotion }),
}));
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ locale: 'es', t: (_key, _params, fallback) => fallback }),
}));

const award = {
  id: 'g1',
  status: 'claimed',
  awardedAt: '2026-10-30T00:00:00Z',
  claimedAt: '2026-10-30T00:00:00Z',
  recipe: {
    id: 'r',
    kind: 'medal',
    tier: 'silver',
    audience: 'user',
    title: 'Manglar Verde',
    classification: 'Misión de compensación',
    purpose: 'Como participante del torneo, sumaste a la conservación del manglar.',
    eventName: 'Tour Colombia FCG Callaway',
    eventYear: 2026,
    venueName: 'Club El Rincón de Cajicá',
    venueLocation: 'Cajicá, Cundinamarca – CO.',
    airsAmount: 10,
    badgeImageUrl: null,
    frontImageUrl: null,
    backImageUrl: null,
  },
  project: { id: 'p', slug: 'fundacion-batis', title: 'Fundación Batis' },
  partner: {
    id: 'e',
    slug: 'torneo-swing-golf',
    displayName: 'Swing Golf',
    description: 'Torneos de golf en Colombia.',
    logoUrl: null,
    websiteUrl: null,
  },
};

const texts = (tree) =>
  tree.root.findAllByType(Text).map((node) => [].concat(node.props.children).join(''));
const button = (tree, label) =>
  tree.root.find(
    (node) =>
      typeof node.props.onPress === 'function' &&
      (node.props.accessibilityLabel === label ||
        node.findAll(
          (child) => child.type === Text && [].concat(child.props.children).join('') === label
        ).length > 0)
  );

beforeEach(() => {
  mockPush.mockClear();
  mockMotion = 'off';
});

describe('claim animation', () => {
  it('reveals the award with its tier, ally and Airs, and offers inspect or continue', () => {
    const onInspect = jest.fn();
    const onClose = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(
        <HonorAwardClaimCinematic award={award} onInspect={onInspect} onClose={onClose} />
      );
    });
    expect(texts(tree)).toEqual(
      expect.arrayContaining([
        '¡Galardón desbloqueado!',
        'Manglar Verde',
        'Medalla de plata · Swing Golf',
        '+10 Airs',
      ])
    );
    act(() => button(tree, 'Inspeccionar').props.onPress());
    expect(onInspect).toHaveBeenCalledWith(award);
    act(() => button(tree, 'Continuar').props.onPress());
    expect(onClose).toHaveBeenCalled();
    act(() => tree.unmount());
  });

  it('runs the full sequence when motion is on and renders nothing without an award', () => {
    jest.useFakeTimers();
    mockMotion = 'full';
    let tree;
    act(() => {
      tree = renderer.create(
        <HonorAwardClaimCinematic award={award} onInspect={jest.fn()} onClose={jest.fn()} />
      );
    });
    act(() => jest.advanceTimersByTime(3000));
    expect(texts(tree)).toContain('Manglar Verde');
    act(() =>
      tree.update(
        <HonorAwardClaimCinematic award={null} onInspect={jest.fn()} onClose={jest.fn()} />
      )
    );
    expect(tree.toJSON()).toBeNull();
    act(() => tree.unmount());
    jest.useRealTimers();
  });
});

describe('inspect view', () => {
  it('shows both faces of the card and opens the mission detail with links', () => {
    const onClose = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(<HonorAwardInspectModal award={award} onClose={onClose} />);
    });
    expect(tree.root.findAllByType(HonorAwardCard).map((node) => node.props.side)).toEqual([
      'front',
      'back',
    ]);
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['MISIÓN:', 'MEDALLA DE PLATA', 'Club El Rincón de Cajicá'])
    );

    act(() => button(tree, 'Toca para ver el reverso').props.onPress());
    act(() => button(tree, 'Ver misión').props.onPress());
    expect(texts(tree)).toEqual(
      expect.arrayContaining([
        'Misión de compensación',
        'Propósito:',
        'Swing Golf',
        'Fundación Batis',
      ])
    );

    act(() => button(tree, 'Ver proyecto').props.onPress());
    expect(onClose).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/explore/fundacion-batis');
    act(() => button(tree, 'Visitar página').props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/explore/enterprise/torneo-swing-golf');

    act(() => button(tree, 'Volver').props.onPress());
    expect(tree.root.findAllByType(HonorAwardCard)).toHaveLength(2);
    act(() => tree.unmount());
  });
});
