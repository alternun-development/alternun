/** @jest-environment jsdom */
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import {
  downloadImage,
  isMobileShareBrowser,
  openComposer,
  prepareShareImage,
  shareNative,
  socialComposerUrl,
} from '../shareTargets';

jest.mock('react-native', () => ({ Platform: { OS: 'web' }, Linking: {}, Share: {} }));
jest.mock('expo-asset', () => ({ Asset: { fromModule: jest.fn(), fromURI: jest.fn() } }));
jest.mock('expo-sharing', () => ({}));
jest.mock('expo-clipboard', () => ({}));
jest.mock('expo-file-system', () => ({ File: class {}, Paths: {} }));

let fetchBefore;
beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'web';
  fetchBefore = global.fetch;
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, blob: async () => new Blob(['png'], { type: 'image/png' }) });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: jest.fn(() => true) });
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: jest.fn().mockResolvedValue(),
  });
});
afterEach(() => {
  global.fetch = fetchBefore;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const content = {
  title: 'Comparte',
  message: 'Llegué a 10 Airs https://airs.test/share/1 #Airs',
  url: 'https://airs.test/share/1',
};

describe('web sharing', () => {
  it('prepares bundled art and generated images as files', async () => {
    Asset.fromModule.mockReturnValue({ uri: '/badge.png' });
    const bundled = await prepareShareImage({ fileName: 'medal.webp', source: 7 });
    expect(bundled.file.name).toBe('medal.webp');
    expect(global.fetch).toHaveBeenCalledWith('/badge.png');
    const qr = await prepareShareImage({
      fileName: 'qr.png',
      load: async () => 'data:image/png;base64,AA==',
    });
    expect(qr.uri).toBe('data:image/png;base64,AA==');
    expect(qr.file.type).toBe('image/png');
    global.fetch.mockResolvedValueOnce({ ok: false });
    Asset.fromURI.mockReturnValue({ uri: 'https://cdn/x.png' });
    await expect(
      prepareShareImage({ fileName: 'x.png', source: 'https://cdn/x.png' })
    ).rejects.toThrow('Image unavailable');
  });

  it('attaches the image when the browser can share files', async () => {
    const file = new File(['png'], 'medal.png', { type: 'image/png' });
    await shareNative(content, { uri: 'blob:x', file });
    expect(navigator.share).toHaveBeenCalledWith({
      files: [file],
      text: content.message,
      title: 'Comparte',
    });
  });

  it('shares the link once when files are not accepted', async () => {
    navigator.canShare.mockReturnValue(false);
    await shareNative(content, { uri: 'blob:x', file: new File(['png'], 'm.png') });
    expect(navigator.share).toHaveBeenCalledWith({
      title: 'Comparte',
      text: 'Llegué a 10 Airs #Airs',
      url: 'https://airs.test/share/1',
    });
  });

  it('fails when the browser has no share menu', async () => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    await expect(shareNative(content, null)).rejects.toThrow('Sharing unavailable');
  });

  it('downloads the image and releases its temporary URL', async () => {
    jest.useFakeTimers();
    URL.createObjectURL = jest.fn(() => 'blob:medal');
    URL.revokeObjectURL = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      expect(this.download).toBe('medal.png');
      expect(this.href).toBe('blob:medal');
    });
    await downloadImage({ uri: 'blob:x', file: new File(['png'], 'medal.png') }, 'medal.png');
    expect(click).toHaveBeenCalled();
    jest.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:medal');
    await downloadImage({ uri: 'https://cdn/m.png' }, 'medal.png');
    expect(global.fetch).toHaveBeenCalledWith('https://cdn/m.png');
  });

  it('encodes the whole caption for X', () => {
    const caption = '10 Airs & more #Airs';
    expect(new URL(socialComposerUrl('X', caption)).searchParams.get('text')).toBe(caption);
  });

  it.each(['Mozilla Android Mobile', 'Mozilla iPhone', 'Mozilla iPad'])(
    'recognizes the mobile browser %s',
    (agent) => {
      jest.spyOn(navigator, 'userAgent', 'get').mockReturnValue(agent);
      expect(isMobileShareBrowser()).toBe(true);
    }
  );

  it('recognizes iPad desktop mode without taking a Mac for a phone', () => {
    jest.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla Macintosh');
    const original = Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints');
    try {
      Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 });
      expect(isMobileShareBrowser()).toBe(true);
      Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 0 });
      expect(isMobileShareBrowser()).toBe(false);
    } finally {
      if (original) Object.defineProperty(navigator, 'maxTouchPoints', original);
      else delete navigator.maxTouchPoints;
    }
  });

  it('navigates on phones and opens an isolated window on desktop', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'location');
    const assign = jest.fn();
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    const ua = jest.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla Android');
    Object.defineProperty(window, 'location', { configurable: true, value: { assign } });
    try {
      openComposer('X', 'Llegué a 10 Airs');
      expect(assign).toHaveBeenCalledWith(socialComposerUrl('X', 'Llegué a 10 Airs'));
      expect(open).not.toHaveBeenCalled();
      ua.mockReturnValue('Mozilla Windows');
      openComposer('LinkedIn', 'caption', 'https://airs.test/share/1');
      expect(open).toHaveBeenCalledWith(
        socialComposerUrl('LinkedIn', 'caption', 'https://airs.test/share/1'),
        '_blank',
        'noopener,noreferrer'
      );
    } finally {
      Object.defineProperty(window, 'location', descriptor);
    }
  });
});
