/** @jest-environment jsdom */
jest.mock('../../../utils/runtimeConfig', () => ({
  resolveMobileApiBaseUrl: () => 'https://api.example',
}));
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { prepareMilestoneImage, publishMilestoneImage } from '../milestoneSharing';

jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('expo-asset', () => ({ Asset: { fromModule: jest.fn(), fromURI: jest.fn() } }));
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

it('prepares the bundled milestone PNG as a file on web', async () => {
  const image = await prepareMilestoneImage('first_10_airs');
  expect(image.file.type).toBe('image/png');
  expect(image.file.name).toBe('airs-first_10_airs.png');
});

it('downloads the PNG locally on devices and needs a local file', async () => {
  Platform.OS = 'ios';
  const asset = { localUri: 'file:///badge.png', downloadAsync: jest.fn().mockResolvedValue() };
  Asset.fromModule.mockReturnValue(asset);
  expect(await prepareMilestoneImage('first_10_airs')).toEqual(
    expect.objectContaining({ uri: 'file:///badge.png' })
  );
  Asset.fromModule.mockReturnValue({ downloadAsync: jest.fn().mockResolvedValue() });
  await expect(prepareMilestoneImage('first_10_airs')).rejects.toThrow(
    'Milestone image is unavailable'
  );
});

it('rejects missing artwork and failed image downloads', async () => {
  await expect(prepareMilestoneImage('unknown')).rejects.toThrow('No milestone share image');
  global.fetch.mockResolvedValueOnce({ ok: false });
  await expect(prepareMilestoneImage('first_10_airs')).rejects.toThrow(
    'Unable to prepare milestone image'
  );
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
