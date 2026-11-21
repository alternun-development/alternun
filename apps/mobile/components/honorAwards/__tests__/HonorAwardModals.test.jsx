import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import HonorAwardClaimCinematic from '../HonorAwardClaimCinematic';
import HonorAwardInspectModal from '../HonorAwardInspectModal';
import HonorAwardCard from '../HonorAwardCard';

const mockPush = jest.fn();
let mockMotion = 'off';
// The share card is drawn on a web canvas; here it is off unless a test turns it on.
let mockCanDraw = false;
const mockRenderCard = jest.fn(() => Promise.resolve('data:image/png;base64,CARD'));
jest.mock('../honorAwardShareCard', () => ({
  canDrawHonorShareCard: () => mockCanDraw,
  renderHonorShareCard: (...args) => mockRenderCard(...args),
}));
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
    classification: 'Misión de impacto positivo',
    purpose: 'Como participante del torneo, sumaste a la conservación del manglar.',
    eventName: 'Tour Callaway Colombia',
    eventYear: 2026,
    eventDates: 'Noviembre 21 y 22 - 2026',
    venueName: 'Pueblo Viejo Country Club',
    venueLocation: 'Cota, Cundinamarca – CO.',
    airsAmount: 10,
    badgeImageUrl: null,
    frontImageUrl: null,
    backImageUrl: null,
  },
  project: {
    id: 'p',
    slug: 'fundacion-batis',
    title: 'Fundación Batis',
    location: 'Puerto Colombia, Atlántico.',
    description: 'Bosque de mangle rojo.',
  },
  partner: {
    id: 'e',
    slug: 'torneo-swing-golf',
    displayName: 'Swing Golf',
    description: 'Torneos de golf en Colombia.',
    logoUrl: null,
    websiteUrl: null,
    countryCode: 'CO',
  },
};

const flatten = (children) =>
  []
    .concat(children)
    .map((child) =>
      child && typeof child === 'object' ? flatten(child.props?.children) : child ?? ''
    )
    .join('');
const texts = (tree) => tree.root.findAllByType(Text).map((node) => flatten(node.props.children));
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
  mockCanDraw = false;
  mockRenderCard.mockClear();
});

describe('claim animation', () => {
  it('reveals the medal on its pocket with the ally, sharing and the mission', () => {
    const onInspect = jest.fn();
    const onClose = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(
        <HonorAwardClaimCinematic award={award} onInspect={onInspect} onClose={onClose} />
      );
    });
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['Manglar Verde', 'Swing Golf Colombia', 'Compartir', 'Ver misión'])
    );
    expect(texts(tree).join(' ')).not.toMatch(/plata|oro|bronce/i);
    act(() => button(tree, 'Ver misión').props.onPress());
    expect(onInspect).toHaveBeenCalledWith(award);
    act(() => button(tree, 'Cerrar').props.onPress());
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
    // Only the coin spin: no turning light rays behind legacy medals.
    const CinematicReveal = require('../../common/CinematicReveal').default;
    expect(tree.root.findByType(CinematicReveal).props.showRays).toBe(false);
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
  it('shows the medal, then the mission with the flippable card and links', () => {
    const onClose = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(<HonorAwardInspectModal award={award} onClose={onClose} />);
    });
    expect(tree.root.findAllByType(HonorAwardCard)).toHaveLength(0);
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['Manglar Verde', 'Swing Golf Colombia', 'Compartir', 'Ver misión'])
    );

    act(() => button(tree, 'Ver misión').props.onPress());
    expect(tree.root.findAllByType(HonorAwardCard).map((node) => node.props.side)).toEqual([
      'front',
      'back',
    ]);
    expect(texts(tree)).toEqual(
      expect.arrayContaining([
        'MISIÓN:',
        'Pueblo Viejo Country Club',
        'Misión de impacto positivo',
        '+10 Airs',
        'Propósito:',
        'Con el apoyo de:',
        'Torneos de golf en Colombia.',
        'Datos del proyecto:',
        'Fundación Batis',
        'Puerto Colombia, Atlántico.',
        'Bosque de mangle rojo.',
      ])
    );
    expect(texts(tree).join(' ')).not.toMatch(/MEDALLA DE PLATA/);
    act(() => button(tree, 'Clic para ver reverso').props.onPress());

    act(() => button(tree, 'Visitar sitio / página').props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/explore/enterprise/torneo-swing-golf');
    act(() => button(tree, 'Ver proyecto').props.onPress());
    expect(onClose).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/explore/fundacion-batis');

    act(() => button(tree, 'Volver').props.onPress());
    expect(tree.root.findAllByType(HonorAwardCard)).toHaveLength(0);
    act(() => tree.unmount());
  });

  it('opens the ally website when it has one, and can start on the mission', () => {
    const { Linking } = require('react-native');
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const withSite = {
      ...award,
      partner: { ...award.partner, websiteUrl: 'https://swinggolf.co' },
    };
    let tree;
    act(() => {
      tree = renderer.create(
        <HonorAwardInspectModal award={withSite} initialStage='mission' onClose={jest.fn()} />
      );
    });
    act(() => button(tree, 'Visitar sitio / página').props.onPress());
    expect(openURL).toHaveBeenCalledWith('https://swinggolf.co');
    expect(mockPush).not.toHaveBeenCalled();
    openURL.mockRestore();
    act(() => tree.unmount());
  });
});

describe('sharing a medal', () => {
  const ShareSheet = require('../../share/ShareSheet').default;
  const HonorAwardMedalPocket = require('../HonorAwardMedalPocket').default;
  const HonorAwardSharePreview = require('../HonorAwardSharePreview').default;
  const { ActivityIndicator, Image } = require('react-native');
  const cardImage = (tree) =>
    tree.root.findAll(
      (node) => node.type === Image && node.props.source?.uri === 'data:image/png;base64,CARD'
    );

  it('opens the shared share sheet with the medal, its message and the project link', () => {
    let tree;
    act(() => {
      tree = renderer.create(<HonorAwardInspectModal award={award} onClose={jest.fn()} />);
    });
    expect(tree.root.findByType(ShareSheet).props.visible).toBe(false);
    act(() => button(tree, 'Compartir').props.onPress());
    const sheet = tree.root.findByType(ShareSheet).props;
    expect(sheet.visible).toBe(true);
    expect(sheet.content).toMatchObject({
      title: 'Comparte tu medalla de legado',
      message:
        '¡Obtuve la medalla de legado "Manglar Verde" con Swing Golf en Airs by Alternun! 🌱 #Airs #Alternun',
    });
    expect(sheet.content.url).toMatch(/\/explore\/fundacion-batis$/);
    // Without a canvas the medal card itself is the preview (and the medal art is shared).
    expect(tree.root.findAllByType(HonorAwardMedalPocket)).toHaveLength(2);
    expect(mockRenderCard).not.toHaveBeenCalled();
    act(() => sheet.onClose());
    expect(tree.root.findByType(ShareSheet).props.visible).toBe(false);
    act(() => tree.unmount());
  });

  it('previews and shares the card drawn with the person name, from the medal view', async () => {
    mockCanDraw = true;
    let tree;
    act(() => {
      tree = renderer.create(
        <HonorAwardInspectModal award={award} holderName='Ana Pérez' onClose={jest.fn()} />
      );
    });
    act(() => button(tree, 'Compartir').props.onPress());
    // While it is drawn the sheet shows a spinner where the image goes.
    expect(
      tree.root.findByType(HonorAwardSharePreview).findAllByType(ActivityIndicator)
    ).toHaveLength(1);
    await act(async () => {});
    expect(mockRenderCard).toHaveBeenCalledTimes(1);
    expect(mockRenderCard.mock.calls[0][0]).toEqual({
      brand: 'Airs by Alternun',
      title: 'Manglar Verde',
      detail: 'Medalla de legado · Swing Golf Colombia',
      holder: 'Ana Pérez',
      site: 'airs.alternun.co',
    });
    expect(tree.root.findByType(ShareSheet).props.content.image.fileName).toBe(
      'airs-manglar-verde.png'
    );
    expect(cardImage(tree)).toHaveLength(1);
    expect(cardImage(tree)[0].props.accessibilityLabel).toBe('Manglar Verde');
    act(() => tree.unmount());
  });

  it('shares with the name from the claim animation too, and falls back if drawing fails', async () => {
    mockCanDraw = true;
    mockRenderCard.mockImplementationOnce(() => Promise.reject(new Error('no canvas')));
    let tree;
    act(() => {
      tree = renderer.create(
        <HonorAwardClaimCinematic
          award={award}
          holderName='Ana Pérez'
          onInspect={jest.fn()}
          onClose={jest.fn()}
        />
      );
    });
    act(() => button(tree, 'Compartir').props.onPress());
    await act(async () => {});
    expect(mockRenderCard.mock.calls[0][0].holder).toBe('Ana Pérez');
    expect(cardImage(tree)).toHaveLength(0);
    expect(
      tree.root.findByType(HonorAwardSharePreview).findAllByType(HonorAwardMedalPocket)
    ).toHaveLength(1);
    act(() => tree.unmount());
  });
});

describe('medal card', () => {
  const HonorAwardMedalPocket = require('../HonorAwardMedalPocket').default;

  it('keeps the text inside a rectangle that grows with it, and names the country once', () => {
    const named = {
      ...award,
      recipe: { ...award.recipe, title: 'Taybo Rodadero Santa Marta Caribe' },
      partner: { ...award.partner, displayName: 'Swing Golf Colombia' },
    };
    let tree;
    act(() => {
      tree = renderer.create(<HonorAwardMedalPocket award={named} width={240} />);
    });
    const { View } = require('react-native');
    const [root] = tree.root.findAll(
      (node) => node.type === View && node.props.accessibilityLabel === named.recipe.title
    );
    const style = StyleSheet.flatten(root.props.style);
    // A rectangle sized by its content: no fixed height, nothing positioned over its edges.
    expect(style).toMatchObject({ width: 240, overflow: 'hidden' });
    expect(style.height).toBeUndefined();
    const lines = tree.root.findAllByType(Text);
    expect(lines.map((node) => flatten(node.props.children))).toEqual([
      'Taybo Rodadero Santa Marta Caribe',
      'Swing Golf Colombia',
    ]);
    for (const line of lines) {
      expect(line.props.numberOfLines).toBe(2);
      expect(StyleSheet.flatten(line.props.style).alignSelf).toBe('stretch');
    }
    act(() => tree.unmount());
  });
});

describe('card text stays inside the card', () => {
  const HonorAwardPartnerMark = require('../HonorAwardPartnerMark').default;
  const { View } = require('react-native');
  const line = (tree, value) =>
    tree.root.findAllByType(Text).find((node) => flatten(node.props.children) === value);

  it('wraps a long title on the back clear of the stamp, and bounds the other lines', () => {
    const title = 'Taybo Rodadero Santa Marta Caribe';
    let tree;
    act(() => {
      tree = renderer.create(
        <HonorAwardCard
          award={{ ...award, recipe: { ...award.recipe, title } }}
          side='back'
          width={316}
        />
      );
    });
    expect(line(tree, title).props.numberOfLines).toBe(2);
    expect(StyleSheet.flatten(line(tree, title).parent.props.style)).toMatchObject({
      left: 18,
      right: 100,
    });
    expect(line(tree, 'Misión de impacto positivo:').props.numberOfLines).toBe(2);
    expect(line(tree, 'Pueblo Viejo Country Club').props.numberOfLines).toBe(2);
    expect(line(tree, 'Cota, Cundinamarca – CO.').props.numberOfLines).toBe(1);
    act(() => tree.unmount());
  });

  it('cuts a long ally wordmark inside its box and writes the country once', () => {
    const mark = (displayName) => {
      let tree;
      act(() => {
        tree = renderer.create(
          <HonorAwardPartnerMark partner={{ ...award.partner, displayName }} width={316} />
        );
      });
      return tree;
    };
    let tree = mark('Swing Golf Colombia');
    const [box] = tree.root.findAll(
      (node) => node.type === View && node.props.accessibilityLabel === 'Swing Golf Colombia'
    );
    expect(StyleSheet.flatten(box.props.style).alignSelf).toBe('stretch');
    expect(line(tree, 'Swing Golf Colombia').props.numberOfLines).toBe(1);
    expect(texts(tree)).not.toContain('Colombia');
    act(() => tree.unmount());
    tree = mark('Swing Golf');
    expect(line(tree, 'Colombia').props.numberOfLines).toBe(1);
    act(() => tree.unmount());
  });
});

describe('locked medal', () => {
  it('explains how to earn it, hides sharing and keeps the mission links', () => {
    let tree;
    act(() => {
      tree = renderer.create(<HonorAwardInspectModal award={award} locked onClose={jest.fn()} />);
    });
    expect(texts(tree)).toContain(
      'Aún no tienes esta medalla: participa en la misión para obtenerla.'
    );
    expect(texts(tree)).not.toContain('Compartir');
    act(() => button(tree, 'Ver misión').props.onPress());
    act(() => button(tree, 'Ver proyecto').props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/explore/fundacion-batis');
    act(() => tree.unmount());
  });

  it('draws the card back without an obtained date', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <HonorAwardCard
          award={{
            ...award,
            awardedAt: '',
            claimedAt: null,
            recipe: { ...award.recipe, eventYear: null },
          }}
          side='back'
          width={300}
        />
      );
    });
    expect(texts(tree).join(' ')).not.toMatch(/NaN|Obtenida/);
    act(() => tree.unmount());
  });
});

describe('Swing Golf cards (V4 designs)', () => {
  const allText = (tree) => texts(tree).join(' ');
  const torneo = {
    ...award,
    recipe: { ...award.recipe, tier: 'generic', artPreset: 'golf_mangrove' },
  };
  const comunidad = {
    ...award,
    claimedAt: '2026-11-25T15:00:00Z',
    recipe: {
      ...award.recipe,
      tier: 'generic',
      artPreset: 'golf_mangrove_community',
      purpose:
        'Como parte de la comunidad Swing Golf Colombia, sumaste a la conservación del manglar.',
      eventName: 'Comunidad Swing Golf',
      eventDates: null,
      venueName: null,
      venueLocation: null,
      airsAmount: 14,
    },
  };
  const render = (value, side) => {
    let tree;
    act(() => {
      tree = renderer.create(<HonorAwardCard award={value} side={side} width={316} />);
    });
    return tree;
  };
  const markImage = (tree) =>
    tree.root.findAll(
      (node) => node.type === 'Image' && node.props.accessibilityLabel === 'Swing Golf'
    );

  it('tournament back: venue, event dates and +5 Airs in the design order', () => {
    const tree = render({ ...torneo, recipe: { ...torneo.recipe, airsAmount: 5 } }, 'back');
    expect(texts(tree)).toEqual(
      expect.arrayContaining([
        'Misión de impacto positivo:',
        'Pueblo Viejo Country Club',
        'Cota, Cundinamarca – CO.',
        '+5 Airs',
        'Fecha: Noviembre 21 y 22 - 2026',
      ])
    );
    expect(allText(tree)).not.toMatch(/Obtenida/);
    expect(markImage(tree)).toHaveLength(1);
    act(() => tree.unmount());
  });

  it('community front: grass, white text and the community event line', () => {
    const tree = render(comunidad, 'front');
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['MISIÓN:', 'Manglar Verde', 'COMUNIDAD SWING GOLF', '• 2026 •'])
    );
    const event = tree.root
      .findAllByType(Text)
      .find((node) => node.props.children === 'COMUNIDAD SWING GOLF');
    expect(StyleSheet.flatten(event.props.style).color).toBe('#ffffff');
    expect(markImage(tree)).toHaveLength(1);
    act(() => tree.unmount());
  });

  it('community back: no venue, the year it was obtained and +14 Airs', () => {
    const tree = render(comunidad, 'back');
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['Misión de impacto positivo:', '+14 Airs', 'Obtenida: 2026'])
    );
    expect(allText(tree)).not.toMatch(/Pueblo Viejo|Fecha/);
    act(() => tree.unmount());
  });

  it('keeps the card mark even when the ally uploaded a logo', () => {
    const withLogo = {
      ...comunidad,
      partner: { ...comunidad.partner, logoUrl: 'https://cdn.example/logo.png' },
    };
    const tree = render(withLogo, 'front');
    const images = tree.root.findAll((node) => node.type === 'Image');
    expect(images.some((node) => node.props.source?.uri === 'https://cdn.example/logo.png')).toBe(
      false
    );
    expect(markImage(tree)).toHaveLength(1);
    act(() => tree.unmount());
  });

  it('keeps the full obtained date for medals without a year', () => {
    const tree = render(
      { ...comunidad, recipe: { ...comunidad.recipe, eventYear: null, artPreset: null } },
      'back'
    );
    expect(texts(tree)).toContain('Obtenida: Noviembre 25 - 2026');
    act(() => tree.unmount());
  });
});

describe('demo mode', () => {
  it('labels the preview and hides sharing', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <HonorAwardClaimCinematic award={award} demo onInspect={jest.fn()} onClose={jest.fn()} />
      );
    });
    expect(texts(tree)).toContain('Demostración: así se verá tu medalla cuando la obtengas.');
    expect(texts(tree)).not.toContain('Compartir');
    act(() => tree.unmount());
  });

  it('hides sharing and links in the preview card and mission', () => {
    let tree;
    act(() => {
      tree = renderer.create(<HonorAwardInspectModal award={award} demo onClose={jest.fn()} />);
    });
    expect(texts(tree)).toContain('Demostración: así se verá tu medalla cuando la obtengas.');
    expect(texts(tree)).not.toContain('Compartir');
    act(() => button(tree, 'Ver misión').props.onPress());
    expect(texts(tree)).not.toContain('Ver proyecto');
    expect(texts(tree)).not.toContain('Visitar sitio / página');
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

  it('draws the empty legacy slot with the Airs mark in a ring', () => {
    const { Circle, Path } = require('react-native-svg');
    let tree;
    act(() => {
      tree = renderer.create(<HonorAwardEmblem tier='generic' size={56} placeholder />);
    });
    expect(tree.root.findAllByType(Path)).toHaveLength(2);
    expect(tree.root.findAllByType(Circle)).toHaveLength(2);
    expect(tree.root.findAllByType(SvgText)).toHaveLength(0);
    act(() => tree.unmount());
  });

  it('shows medals not claimed yet in greyscale', () => {
    const { Image, View } = require('react-native');
    const { presetBadge } = require('../honorAwardArt');
    let tree;
    act(() => {
      tree = renderer.create(
        <HonorAwardEmblem tier='generic' artPreset='golf_mangrove' size={56} grayscale />
      );
    });
    expect(tree.root.findByType(Image).props.source).toBe(
      presetBadge('golf_mangrove', 'generic', true)
    );
    expect(presetBadge('golf_mangrove', 'generic', true)).not.toBe(
      presetBadge('golf_mangrove', 'generic')
    );
    act(() =>
      tree.update(
        <HonorAwardEmblem tier='generic' imageUrl='https://cdn/m.png' size={56} grayscale />
      )
    );
    const style = [].concat(tree.root.findAllByType(View)[0].props.style);
    expect(style).toEqual(
      expect.arrayContaining([expect.objectContaining({ filter: 'grayscale(1)' })])
    );
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
        'Legado: medallas de misión',
        '¿Cómo obtengo una medalla?',
        'Participa en una misión o actividad de un aliado de Airs.',
        'Las medallas con candado son misiones disponibles en Airs: tócalas para ver cómo obtenerlas. Si aún no tienes medallas, toca la de ejemplo para ver cómo se ve.',
      ])
    );
    act(() => tree.update(<HonorAwardsInfoModal visible audience='ally' onClose={jest.fn()} />));
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['Galardones de honor', '¿Cómo funcionan?'])
    );
    expect(texts(tree).join(' ')).not.toMatch(/oro, plata y bronce/);
    expect(texts(tree).join(' ')).not.toMatch(/candado/);
    act(() =>
      tree.update(<HonorAwardsInfoModal visible={false} audience='ally' onClose={jest.fn()} />)
    );
    expect(tree.toJSON()).toBeNull();
    act(() => tree.unmount());
  });
});
