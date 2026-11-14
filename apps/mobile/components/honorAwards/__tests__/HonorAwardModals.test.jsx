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

describe('demo mode', () => {
  it('labels the preview and changes the headline', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <HonorAwardClaimCinematic award={award} demo onInspect={jest.fn()} onClose={jest.fn()} />
      );
    });
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['Demostración', 'Así se ve al obtener un galardón'])
    );
    expect(texts(tree)).not.toContain('¡Galardón desbloqueado!');
    act(() => tree.unmount());
  });

  it('hides sharing and links in the preview card and mission', () => {
    let tree;
    act(() => {
      tree = renderer.create(<HonorAwardInspectModal award={award} demo onClose={jest.fn()} />);
    });
    expect(texts(tree)).toContain('Demostración: así se verá tu galardón cuando lo obtengas.');
    expect(texts(tree)).not.toContain('Compartir');
    act(() => button(tree, 'Ver misión').props.onPress());
    expect(texts(tree)).not.toContain('Ver proyecto');
    expect(texts(tree)).not.toContain('Visitar página');
    act(() => tree.unmount());
  });
});

describe('medal art', () => {
  const { Text: SvgText } = require('react-native-svg');
  const HonorAwardEmblem = require('../HonorAwardEmblem').default;

  it('uses the medal from the design file for the golf preset', () => {
    const { Image } = require('react-native');
    let tree;
    act(() => {
      tree = renderer.create(
        <HonorAwardEmblem tier='gold' title='Manglar Verde' artPreset='golf_mangrove' size={120} />
      );
    });
    expect(tree.root.findAllByType(Image)).toHaveLength(1);
    expect(tree.root.findAllByType(SvgText)).toHaveLength(0);
    act(() => tree.unmount());
  });

  it('draws the vector crest with the name on the banner for presets without art', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <HonorAwardEmblem tier='bronze' title='Taybo Santa Marta' artPreset='coast' size={120} />
      );
    });
    const banner = tree.root.findAllByType(SvgText).map((node) => node.props.children);
    expect(banner).toEqual(['TAYBO', 'SANTA MARTA']);
    act(() => tree.unmount());
  });

  it('keeps the generic shield for unknown presets', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <HonorAwardEmblem tier='bronze' title='Taybo' artPreset='unknown' size={60} />
      );
    });
    expect(tree.root.findAllByType(SvgText).map((node) => node.props.children)).toEqual(['TAYBO']);
    act(() => tree.unmount());
  });
});

describe('info modal', () => {
  const HonorAwardsInfoModal = require('../HonorAwardsInfoModal').default;

  it('explains how a person gets an award, and how an ally gives one', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <HonorAwardsInfoModal visible audience='person' onClose={jest.fn()} />
      );
    });
    expect(texts(tree)).toEqual(
      expect.arrayContaining([
        '¿Cómo obtengo uno?',
        'Participa en una misión o actividad de un aliado de Airs.',
        'Toca un espacio disponible para ver una demostración.',
      ])
    );
    act(() => tree.update(<HonorAwardsInfoModal visible audience='ally' onClose={jest.fn()} />));
    expect(texts(tree)).toContain('¿Cómo funcionan?');
    expect(texts(tree)).not.toContain('Toca un espacio disponible para ver una demostración.');
    act(() =>
      tree.update(<HonorAwardsInfoModal visible={false} audience='ally' onClose={jest.fn()} />)
    );
    expect(tree.toJSON()).toBeNull();
    act(() => tree.unmount());
  });
});
