/** @jest-environment jsdom */
jest.mock('../../../utils/runtimeConfig', () => ({
  resolveMobileApiBaseUrl: () => 'https://api.example',
}));
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';
import {
  canShareMilestoneFile,
  canShareMilestoneLink,
  isMobileShareBrowser,
  openMilestoneComposer,
  downloadMilestoneImage,
  prepareMilestoneImage,
  publishMilestoneImage,
  shareMilestoneImage,
  socialComposerUrl,
} from '../milestoneSharing';

jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('expo-asset', () => ({ Asset: { fromModule: jest.fn(), fromURI: jest.fn() } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
let fetchBefore;
beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'web';
  fetchBefore = global.fetch;
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, blob: async () => new Blob(['png'], { type: 'image/png' }) });
  Asset.fromModule.mockReturnValue({ uri: '/badge.png' });
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

it('shares a PNG attachment and caption rather than a generic landing-page link', async () => {
  const image = await prepareMilestoneImage('first_10_airs');
  expect(image.file.type).toBe('image/png');
  expect(image.file.name).toBe('airs-first_10_airs.png');
  await shareMilestoneImage(image, 'I reached 10 AIRS!');
  expect(navigator.share).toHaveBeenCalledWith({
    files: [image.file],
    text: 'I reached 10 AIRS!',
    title: 'AIRS milestone',
  });
});

it('does not claim file sharing support when the browser cannot attach images', async () => {
  navigator.canShare.mockReturnValue(false);
  const image = await prepareMilestoneImage('first_10_airs');
  expect(canShareMilestoneFile(image)).toBe(false);
  await expect(shareMilestoneImage(image, 'caption')).rejects.toThrow();
  expect(navigator.share).not.toHaveBeenCalled();
});

it('offers a real PNG download and releases its temporary URL', async () => {
  jest.useFakeTimers();
  URL.createObjectURL = jest.fn(() => 'blob:milestone');
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    expect(this.download).toBe('airs-first_10_airs.png');
    expect(this.href).toBe('blob:milestone');
  });
  downloadMilestoneImage(await prepareMilestoneImage('first_10_airs'));
  expect(click).toHaveBeenCalled();
  jest.runAllTimers();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:milestone');
});

it('uses a downloaded local PNG for native sharing', async () => {
  Platform.OS = 'ios';
  const asset = {
    uri: '/badge.png',
    localUri: 'file:///badge.png',
    downloadAsync: jest.fn().mockResolvedValue(),
  };
  Asset.fromModule.mockReturnValue(asset);
  Sharing.isAvailableAsync.mockResolvedValue(true);
  const image = await prepareMilestoneImage('first_10_airs');
  await shareMilestoneImage(image, 'caption');
  expect(asset.downloadAsync).toHaveBeenCalled();
  expect(Sharing.shareAsync).toHaveBeenCalledWith(
    'file:///badge.png',
    expect.objectContaining({ mimeType: 'image/png' })
  );
});

it('encodes the caption in the X composer URL', () => {
  const caption = '10 AIRS & more #AIRS';
  expect(new URL(socialComposerUrl('X', caption)).searchParams.get('text')).toBe(caption);
});

it('publishes only the milestone key and uses the personalized CDN image returned by the API', async () => {
  Asset.fromURI.mockReturnValue({ uri: 'https://cdn.example/edward.png' });
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      imageUrl: 'https://cdn.example/edward.png',
      shareUrl: 'https://api.example/share/id',
      displayName: 'Edward',
    }),
  });
  const image = await publishMilestoneImage('first_10_airs', 'session-token');
  expect(global.fetch).toHaveBeenNthCalledWith(
    1,
    'https://api.example/v1/airs/milestones/share',
    expect.objectContaining({
      body: JSON.stringify({ milestone: 'first_10_airs' }),
      headers: expect.objectContaining({ Authorization: 'Bearer session-token' }),
    })
  );
  expect(Asset.fromURI).toHaveBeenCalledWith('https://cdn.example/edward.png');
  expect(image.shareUrl).toBe('https://api.example/share/id');
  expect(image.displayName).toBe('Edward');
  expect(image.file.type).toBe('image/png');
});

it('does not substitute a generic image when publishing fails', async () => {
  global.fetch.mockResolvedValueOnce({ ok: false });
  await expect(publishMilestoneImage('first_10_airs', 'token')).rejects.toThrow(
    'Unable to publish'
  );
  expect(Asset.fromModule).not.toHaveBeenCalled();
});

it('passes the public preview URL to Facebook and LinkedIn', () => {
  const url = 'https://api.example/share/123';
  expect(socialComposerUrl('Facebook', 'caption', url)).toContain(encodeURIComponent(url));
  expect(socialComposerUrl('LinkedIn', 'caption', url)).toContain(encodeURIComponent(url));
});

it('rejects missing artwork and failed image downloads', async () => {
  await expect(prepareMilestoneImage('unknown')).rejects.toThrow('No milestone share image');
  global.fetch.mockResolvedValueOnce({ ok: false });
  await expect(prepareMilestoneImage('first_10_airs')).rejects.toThrow(
    'Unable to prepare milestone image'
  );
});

it('rejects native downloads without a local file and unavailable native sharing', async () => {
  Platform.OS = 'android';
  Asset.fromModule.mockReturnValue({ downloadAsync: jest.fn().mockResolvedValue() });
  await expect(prepareMilestoneImage('first_10_airs')).rejects.toThrow(
    'Milestone image is unavailable'
  );
  Sharing.isAvailableAsync.mockResolvedValueOnce(false);
  await expect(shareMilestoneImage({ uri: 'file://badge.png' }, 'caption')).rejects.toThrow(
    'Sharing unavailable'
  );
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
  expect(() => downloadMilestoneImage({ uri: 'file://badge.png' })).toThrow('Download unavailable');
});

it.each(['imageUrl', 'shareUrl', 'displayName'])(
  'rejects personalized responses missing %s',
  async (missing) => {
    const result = {
      imageUrl: 'https://cdn.example/card.png',
      shareUrl: 'https://api.example/share/id',
      displayName: 'Edward',
    };
    delete result[missing];
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => result });
    await expect(publishMilestoneImage('first_10_airs', 'token')).rejects.toThrow(
      'Incomplete milestone response'
    );
    expect(Asset.fromURI).not.toHaveBeenCalled();
  }
);

it.each([
  ['Facebook', 'https://www.facebook.com/'],
  ['LinkedIn', 'https://www.linkedin.com/feed/'],
  ['Instagram', 'https://www.instagram.com/'],
])('uses the %s fallback when no public preview exists', (platform, url) => {
  expect(socialComposerUrl(platform, 'caption')).toBe(url);
});

it('shares the public preview through installed apps when the browser accepts links but not files', async () => {
  navigator.canShare.mockImplementation((data) => Boolean(data.url));
  const image = {
    file: new File(['png'], 'badge.png'),
    uri: 'https://cdn.example/card.png',
    shareUrl: 'https://api.example/share/earned',
  };
  expect(canShareMilestoneFile(image)).toBe(false);
  expect(canShareMilestoneLink(image)).toBe(true);
  await shareMilestoneImage(image, 'Earned 10 AIRS');
  expect(navigator.share).toHaveBeenCalledWith({
    url: image.shareUrl,
    text: 'Earned 10 AIRS',
    title: 'AIRS milestone',
  });
});

it('supports link sharing without canShare but never claims support without share', async () => {
  const image = {
    uri: 'https://cdn.example/card.png',
    shareUrl: 'https://api.example/share/earned',
  };
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  expect(canShareMilestoneLink(image)).toBe(true);
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  expect(canShareMilestoneLink(image)).toBe(false);
  await expect(shareMilestoneImage(image, 'caption')).rejects.toThrow('File sharing unavailable');
});

it.each(['Mozilla Android Mobile', 'Mozilla iPhone', 'Mozilla iPad'])(
  'recognizes mobile browser %s',
  (agent) => {
    jest.spyOn(navigator, 'userAgent', 'get').mockReturnValue(agent);
    expect(isMobileShareBrowser()).toBe(true);
  }
);

it('recognizes iPad desktop-mode browsing without classifying a Mac as mobile', () => {
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

it('uses direct mobile navigation and an isolated desktop composer window', () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'location');
  const assign = jest.fn();
  const open = jest.spyOn(window, 'open').mockImplementation(() => null);
  const ua = jest.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla Android');
  Object.defineProperty(window, 'location', { configurable: true, value: { assign } });
  try {
    openMilestoneComposer('X', 'I reached 10 AIRS');
    expect(assign).toHaveBeenCalledWith(socialComposerUrl('X', 'I reached 10 AIRS'));
    expect(open).not.toHaveBeenCalled();
    ua.mockReturnValue('Mozilla Windows');
    openMilestoneComposer('LinkedIn', 'caption', 'https://api.example/share/id');
    expect(open).toHaveBeenCalledWith(
      socialComposerUrl('LinkedIn', 'caption', 'https://api.example/share/id'),
      '_blank',
      'noopener,noreferrer'
    );
  } finally {
    Object.defineProperty(window, 'location', descriptor);
  }
});
