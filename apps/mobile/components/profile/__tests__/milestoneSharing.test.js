/** @jest-environment jsdom */
jest.mock('../../../utils/runtimeConfig', () => ({
  resolveMobileApiBaseUrl: () => 'https://api.example',
}));
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';
import {
  canShareMilestoneFile,
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
  Asset.fromURI.mockReturnValue({uri:'https://cdn.example/edward.png'});
  global.fetch.mockResolvedValueOnce({ok:true,json:async()=>({imageUrl:'https://cdn.example/edward.png',shareUrl:'https://api.example/share/id',displayName:'Edward'})});
  const image = await publishMilestoneImage('first_10_airs', 'session-token');
  expect(global.fetch).toHaveBeenNthCalledWith(1, 'https://api.example/v1/airs/milestones/share', expect.objectContaining({body:JSON.stringify({milestone:'first_10_airs'}),headers:expect.objectContaining({Authorization:'Bearer session-token'})}));
  expect(Asset.fromURI).toHaveBeenCalledWith('https://cdn.example/edward.png');
  expect(image.shareUrl).toBe('https://api.example/share/id');
  expect(image.displayName).toBe('Edward');
  expect(image.file.type).toBe('image/png');
});

it('does not substitute a generic image when publishing fails', async () => {
  global.fetch.mockResolvedValueOnce({ok:false});
  await expect(publishMilestoneImage('first_10_airs','token')).rejects.toThrow('Unable to publish');
  expect(Asset.fromModule).not.toHaveBeenCalled();
});

it('passes the public preview URL to Facebook and LinkedIn', () => {
  const url='https://api.example/share/123';
  expect(socialComposerUrl('Facebook','caption',url)).toContain(encodeURIComponent(url));
  expect(socialComposerUrl('LinkedIn','caption',url)).toContain(encodeURIComponent(url));
});
