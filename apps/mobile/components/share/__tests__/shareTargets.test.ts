/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
import { Linking, Platform, Share } from 'react-native';

const mockSetString = jest.fn(async () => true);
const mockShareAsync = jest.fn(async () => undefined);
const mockIsAvailable = jest.fn(async () => true);
const mockDownloadAsync = jest.fn(async () => undefined);
const mockWrite = jest.fn();

jest.mock('expo-clipboard', () => ({ setStringAsync: mockSetString }));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: mockIsAvailable,
  shareAsync: mockShareAsync,
}));
jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: () => ({ downloadAsync: mockDownloadAsync, localUri: 'file:///bundled.webp' }),
    fromURI: (uri: string) => ({ downloadAsync: mockDownloadAsync, localUri: `file:///${uri}` }),
  },
}));
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'cache' },
  File: class {
    uri = 'file:///cache/qr.png';
    exists = false;
    create = jest.fn();
    delete = jest.fn();
    write = mockWrite;
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const targets = require('../shareTargets') as typeof import('../shareTargets');

const originalOS = Platform.OS;
afterEach(() => {
  Platform.OS = originalOS;
  jest.clearAllMocks();
});

describe('share targets', () => {
  it('builds the composer links of each network', () => {
    expect(targets.socialComposerUrl('X', 'Hola mundo')).toBe(
      'https://x.com/intent/post?text=Hola%20mundo'
    );
    expect(targets.socialComposerUrl('LinkedIn', 'x', 'https://a.test/p')).toBe(
      'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fa.test%2Fp'
    );
    expect(targets.socialComposerUrl('LinkedIn', 'x')).toBe('https://www.linkedin.com/feed/');
    expect(targets.socialComposerUrl('Facebook', 'x', 'https://a.test')).toContain('sharer.php');
    expect(targets.socialComposerUrl('Facebook', 'x')).toBe('https://www.facebook.com/');
    expect(targets.socialComposerUrl('Instagram', 'x')).toBe('https://www.instagram.com/');
  });

  it('adds the link to the message once and names image types', () => {
    expect(targets.shareText({ message: 'Hola', url: 'https://a.test' })).toBe(
      'Hola https://a.test'
    );
    expect(targets.shareText({ message: 'Hola https://a.test', url: 'https://a.test' })).toBe(
      'Hola https://a.test'
    );
    expect(targets.shareText({ message: 'Hola' })).toBe('Hola');
    expect(targets.imageMimeType('a.webp')).toBe('image/webp');
    expect(targets.imageMimeType('a.JPG')).toBe('image/jpeg');
    expect(targets.imageMimeType('a.png')).toBe('image/png');
  });

  it('uses the configured public origin without a trailing slash', () => {
    const previous = process.env.EXPO_PUBLIC_ORIGIN;
    process.env.EXPO_PUBLIC_ORIGIN = 'https://airs.example/';
    expect(targets.resolvePublicAppUrl()).toBe('https://airs.example');
    process.env.EXPO_PUBLIC_ORIGIN = previous;
  });

  it('opens composers with the system on devices', () => {
    Platform.OS = 'ios';
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    targets.openComposer('X', 'Hola');
    expect(open).toHaveBeenCalledWith('https://x.com/intent/post?text=Hola');
    open.mockRestore();
  });

  it('copies with the clipboard', async () => {
    await targets.copyText('https://a.test');
    expect(mockSetString).toHaveBeenCalledWith('https://a.test');
  });

  it('shares the image file on devices, or the text when there is none', async () => {
    Platform.OS = 'android';
    await targets.shareNative({ title: 't', message: 'm' }, { uri: 'file:///a.webp' });
    expect(mockShareAsync).toHaveBeenCalledWith('file:///a.webp', {
      mimeType: 'image/webp',
      dialogTitle: 'm',
    });
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await targets.shareNative({ title: 't', message: 'm', url: 'https://a.test' }, null);
    expect(share).toHaveBeenCalledWith({ title: 't', message: 'm https://a.test' });
    share.mockRestore();
  });

  it('saves images through the system sheet on devices', async () => {
    Platform.OS = 'ios';
    await targets.downloadImage({ uri: 'file:///a.png' }, 'a.png');
    expect(mockShareAsync).toHaveBeenCalledWith('file:///a.png', { mimeType: 'image/png' });
    mockIsAvailable.mockResolvedValueOnce(false);
    await expect(targets.downloadImage({ uri: 'file:///a.png' }, 'a.png')).rejects.toThrow();
  });

  it('prepares bundled art, URLs and generated images on devices', async () => {
    Platform.OS = 'ios';
    expect(await targets.prepareShareImage({ fileName: 'a.webp', source: 12 })).toEqual({
      uri: 'file:///bundled.webp',
    });
    expect(
      await targets.prepareShareImage({ fileName: 'a.png', source: { uri: 'https://cdn/a.png' } })
    ).toEqual({ uri: 'file:///https://cdn/a.png' });
    const generated = await targets.prepareShareImage({
      fileName: 'qr.png',
      load: async () => 'data:image/png;base64,AAEC',
    });
    expect(generated).toEqual({ uri: 'file:///cache/qr.png' });
    expect(Array.from(mockWrite.mock.calls[0][0] as Uint8Array)).toEqual([0, 1, 2]);
    await expect(targets.prepareShareImage({ fileName: 'none.png' })).rejects.toThrow();
  });
});
