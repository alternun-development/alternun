import { resolveLocalAssetUri as resolveNativeAssetUri } from '../airsIntroVideoSource';
import { resolveLocalAssetUri as resolveWebAssetUri } from '../airsIntroVideoSource.web';

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
type TestFn = (name: string, fn: () => void) => void;
type ExpectFn = (actual: unknown) => {
  toBe: (expected: unknown) => void;
  toContain: (expected: string) => void;
  toMatch: (expected: RegExp) => void;
};

const { describe, expect, it } = globalThis as unknown as {
  describe: TestFn;
  expect: ExpectFn;
  it: TestFn;
};

describe('airsIntroVideoSource', () => {
  it.each([resolveNativeAssetUri, resolveWebAssetUri])(
    'resolves local asset uri-like modules',
    (resolveLocalUri) => {
      expect(resolveLocalUri('https://example.com/poster.webp')).toBe(
        'https://example.com/poster.webp'
      );
      expect(resolveLocalUri({ uri: 'file:///tmp/poster.webp' })).toBe('file:///tmp/poster.webp');
      expect(resolveLocalUri({ src: 'file:///tmp/poster2.webp' })).toBe('file:///tmp/poster2.webp');
      expect(resolveLocalUri({ default: { uri: 'file:///tmp/poster3.webp' } })).toBe(
        'file:///tmp/poster3.webp'
      );
    }
  );

  it('does not rely on the old Pexels poster URL shape', () => {
    expect(resolveNativeAssetUri({ uri: 'file:///tmp/poster.webp' })).not.toContain(
      'images.pexels.com'
    );
    expect(resolveWebAssetUri({ uri: 'file:///tmp/poster.webp' })).not.toContain(
      'images.pexels.com'
    );
  });
});
