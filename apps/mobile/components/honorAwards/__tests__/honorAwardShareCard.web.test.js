/** @jest-environment jsdom */
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import {
  drawHonorShareCard,
  fitCardText,
  HONOR_SHARE_CARD_SIZE,
  HONOR_SHARE_CARD_TEXT_WIDTH,
  renderHonorShareCard,
} from '../honorAwardShareCard';
import { honorShareContent } from '../honorAwardShare';

jest.mock('react-native', () => ({ Platform: { OS: 'web' }, Linking: {}, Share: {} }));
jest.mock('expo-asset', () => ({
  Asset: { fromModule: jest.fn((id) => ({ uri: `/assets/medal-${id}.webp` })) },
}));
jest.mock('expo-sharing', () => ({}));
jest.mock('expo-clipboard', () => ({}));
jest.mock('expo-file-system', () => ({ File: class {}, Paths: {} }));

const t = (_key, _params, fallback) => fallback;

/** A 2D context that measures text as 0.6 × size per character and records what is drawn. */
function fakeContext() {
  const drawn = [];
  const context = {
    drawn,
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textAlign: '',
    textBaseline: '',
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    arcTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    drawImage: jest.fn(),
    measureText(text) {
      const size = Number(/([\d.]+)px/.exec(this.font)[1]);
      return { width: Array.from(text).length * size * 0.6 };
    },
    fillText: jest.fn(function fillText(text, x, y) {
      drawn.push({ text, x, y, font: this.font, width: this.measureText(text).width });
    }),
  };
  return context;
}

const card = {
  brand: 'Airs by Alternun',
  title: 'Manglar Verde',
  detail: 'Medalla de legado · Swing Golf Colombia',
  holder: 'Ana Pérez',
  site: 'airs.alternun.co',
};

/** Images that load (or fail, for URLs containing "broken") right after `src` is set. */
class FakeImage {
  constructor() {
    this.naturalWidth = 598;
    this.naturalHeight = 600;
  }

  set src(value) {
    this.url = value;
    setTimeout(() => (value.includes('broken') ? this.onerror?.() : this.onload?.()), 0);
  }

  get src() {
    return this.url;
  }
}

let getContext;
let toDataURL;
let context;
beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'web';
  context = fakeContext();
  getContext = jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => context);
  toDataURL = jest
    .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
    .mockReturnValue('data:image/png;base64,CARD');
  window.Image = FakeImage;
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { load: jest.fn(() => Promise.resolve([])) },
  });
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('fitting a line on the card', () => {
  const measure = (text, size) => Array.from(text).length * size * 0.5;

  it('keeps the size when the text fits, then shrinks it down to the minimum', () => {
    expect(fitCardText(measure, 'Manglar Verde', 920, 76, 40)).toEqual({
      text: 'Manglar Verde',
      size: 76,
    });
    const shrunk = fitCardText(measure, 'x'.repeat(60), 920, 52, 26);
    expect(shrunk.size).toBe(30);
    expect(measure(shrunk.text, shrunk.size)).toBeLessThanOrEqual(920);
  });

  it('cuts the text with "…" when even the smallest size does not fit', () => {
    const long = 'María Fernanda de los Ángeles Rodríguez Villamizar '.repeat(2).trim();
    const fitted = fitCardText(measure, long, 920, 52, 26);
    expect(fitted.size).toBe(26);
    expect(fitted.text.endsWith('…')).toBe(true);
    expect(measure(fitted.text, fitted.size)).toBeLessThanOrEqual(920);
    expect(fitCardText(() => 5000, 'ab', 920, 30, 30).text).toBe('…');
  });
});

describe('drawing the share card', () => {
  it('draws the brand, the medal, the mission, the person and the site inside the card', () => {
    const medal = { naturalWidth: 598, naturalHeight: 600, width: 0, height: 0 };
    drawHonorShareCard(context, card, medal);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1080, 1080);
    expect(context.stroke).toHaveBeenCalled();
    expect(context.drawn.map((line) => line.text)).toEqual([
      'Airs by Alternun',
      'Manglar Verde',
      'Medalla de legado · Swing Golf Colombia',
      'Ana Pérez',
      'airs.alternun.co',
    ]);
    for (const line of context.drawn) {
      expect(line.x).toBe(HONOR_SHARE_CARD_SIZE / 2);
      expect(line.width).toBeLessThanOrEqual(HONOR_SHARE_CARD_TEXT_WIDTH);
    }
    expect(context.drawn[3].font).toContain('Sculpin-Bold');
    // The medal keeps its proportions, centered in its box.
    const [, x, y, width, height] = context.drawImage.mock.calls[0];
    expect(width / height).toBeCloseTo(598 / 600);
    expect(x + width / 2).toBeCloseTo(540);
    expect(y).toBeGreaterThanOrEqual(150);
    expect(y + height).toBeLessThan(context.drawn[1].y - 40);
  });

  it('fits a very long name and leaves out the lines and medal it does not have', () => {
    drawHonorShareCard(
      context,
      {
        ...card,
        holder: 'María Fernanda de los Ángeles Rodríguez Villamizar Echeverri',
        detail: '',
      },
      null
    );
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(context.drawn).toHaveLength(4);
    const name = context.drawn.find((line) => line.text.startsWith('María'));
    expect(name.width).toBeLessThanOrEqual(HONOR_SHARE_CARD_TEXT_WIDTH);
    drawHonorShareCard(context, { ...card, holder: '  ' }, { naturalWidth: 0, width: 0 });
    expect(context.drawn.filter((line) => line.text === 'Ana Pérez')).toHaveLength(0);
    expect(context.drawImage).not.toHaveBeenCalled();
  });
});

describe('rendering the share card on the web', () => {
  it('waits for the fonts, uses the first medal that loads and returns a PNG', async () => {
    const uri = await renderHonorShareCard(card, ['https://cdn.test/broken.png', 7]);
    expect(uri).toBe('data:image/png;base64,CARD');
    expect(document.fonts.load).toHaveBeenCalledWith(expect.stringContaining('Sculpin-Bold'));
    expect(document.fonts.load).toHaveBeenCalledWith(expect.stringContaining('Sculpin-Medium'));
    expect(Asset.fromModule).toHaveBeenCalledWith(7);
    expect(context.drawImage.mock.calls[0][0].src).toBe('/assets/medal-7.webp');
    expect(context.drawImage.mock.calls[0][0].crossOrigin).toBe('anonymous');
    expect(toDataURL).toHaveBeenCalledWith('image/png');
    expect(context.drawn.map((line) => line.text)).toContain('Ana Pérez');
  });

  it('draws without a medal when none loads, and without waiting for fonts it cannot load', async () => {
    Object.defineProperty(document, 'fonts', { configurable: true, value: undefined });
    await renderHonorShareCard(card, ['https://cdn.test/broken.png', { uri: '' }, [], null]);
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(context.drawn).toHaveLength(5);
  });

  it('fails without a canvas or off the web', async () => {
    getContext.mockImplementation(() => null);
    await expect(renderHonorShareCard(card, [])).rejects.toThrow('Canvas unavailable');
    Platform.OS = 'ios';
    await expect(renderHonorShareCard(card, [])).rejects.toThrow('Share card unavailable');
  });
});

describe('sharing a legacy medal on the web', () => {
  const award = {
    id: 'g1',
    status: 'claimed',
    awardedAt: '2026-11-21T12:00:00Z',
    claimedAt: '2026-11-21T12:00:00Z',
    recipe: {
      id: 'r',
      kind: 'medal',
      tier: 'generic',
      audience: 'user',
      title: 'Manglar Verde',
      classification: 'Misión de impacto positivo',
      purpose: null,
      eventName: 'Tour Callaway Colombia',
      eventYear: 2026,
      venueName: null,
      venueLocation: null,
      airsAmount: 14,
      badgeImageUrl: null,
      frontImageUrl: null,
      backImageUrl: null,
      artPreset: 'golf_mangrove',
    },
    project: { id: 'p', slug: 'fundacion-batis', title: 'Fundación Batis' },
    partner: {
      id: 'e',
      slug: 'swing-golf',
      displayName: 'Swing Golf Colombia',
      description: null,
      logoUrl: null,
      websiteUrl: null,
      countryCode: 'CO',
    },
  };

  it('shares the medal drawn once on a card with the person name, as milestones are shared', async () => {
    const content = honorShareContent(award, t, '  Ana Pérez ');
    expect(content.image.fileName).toBe('airs-manglar-verde.png');
    expect(content.image.source).toBeUndefined();
    // The preview and the shared file ask for it; it is drawn only once.
    const first = content.image.load();
    expect(content.image.load()).toBe(first);
    await expect(first).resolves.toBe('data:image/png;base64,CARD');
    expect(getContext).toHaveBeenCalledTimes(1);
    expect(context.drawn.map((line) => line.text)).toEqual([
      'Airs by Alternun',
      'Manglar Verde',
      'Medalla de legado · Swing Golf Colombia',
      'Ana Pérez',
      'airs.alternun.co',
    ]);
    expect(content.message).toBe(
      '¡Obtuve la medalla de legado "Manglar Verde" con Swing Golf Colombia en Airs by Alternun! 🌱 #Airs #Alternun'
    );
  });

  it('leaves the name out when it is not known', async () => {
    await honorShareContent({ ...award, partner: null }, t).image.load();
    expect(context.drawn.map((line) => line.text)).toEqual([
      'Airs by Alternun',
      'Manglar Verde',
      'Medalla de legado',
      'airs.alternun.co',
    ]);
  });
});
