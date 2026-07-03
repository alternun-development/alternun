/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
jest.mock('expo-image', (): { __esModule: boolean; Image: () => null } => ({
  __esModule: true,
  Image: () => null,
}));

jest.mock('../../../utils/changelogData', () => ({
  APP_VERSION: '9.9.9-test',
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const developmentManifest = require('../../../version.development.json') as {
  version: string;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const productionManifest = require('../../../version.production.json') as {
  version: string;
};
import { resolveAppPackageVersion, resolveVersionMetadata } from '../Footer.shared';

describe('Footer.shared version metadata', () => {
  const originalOrigin = process.env.EXPO_PUBLIC_ORIGIN;

  afterEach(() => {
    process.env.EXPO_PUBLIC_ORIGIN = originalOrigin;
    jest.resetModules();
  });

  it('resolves the development manifest for testnet and local runtimes', () => {
    process.env.EXPO_PUBLIC_ORIGIN = 'https://testnet.airs.alternun.co';

    const versionMetadata = resolveVersionMetadata();

    expect(versionMetadata.version).toBe(developmentManifest.version);
    expect(versionMetadata.source).toBe('version.development.json');
  });

  it('resolves APP_VERSION from changelogData for production runtimes', () => {
    process.env.EXPO_PUBLIC_ORIGIN = 'https://airs.alternun.co';

    const versionMetadata = resolveVersionMetadata();

    expect(versionMetadata.version).toBe('9.9.9-test');
    expect(versionMetadata.source).toBe('changelogData');
  });

  it('resolves APP_VERSION from changelogData when EXPO_PUBLIC_ORIGIN is unset (SSR/static build)', () => {
    delete process.env.EXPO_PUBLIC_ORIGIN;
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', { value: { origin: '' }, writable: true });

    const versionMetadata = resolveVersionMetadata();

    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
    expect(versionMetadata.version).toBe('9.9.9-test');
    expect(versionMetadata.source).toBe('changelogData');
  });

  it('falls back to version.production.json when APP_VERSION is empty', () => {
    jest.resetModules();
    jest.doMock('../../../utils/changelogData', () => ({ APP_VERSION: '' }));

    // Re-require after resetting module registry so the empty APP_VERSION is picked up
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { resolveVersionMetadata: freshResolve } =
      require('../Footer.shared') as typeof import('../Footer.shared');

    process.env.EXPO_PUBLIC_ORIGIN = 'https://airs.alternun.co';
    const versionMetadata = freshResolve();

    expect(versionMetadata.version).toBe(productionManifest.version);
    expect(versionMetadata.source).toBe('version.production.json');
  });

  it('resolves the branch release version for the footer badge', () => {
    process.env.EXPO_PUBLIC_ORIGIN = 'https://testnet.airs.alternun.co';

    const versionMetadata = resolveAppPackageVersion();

    expect(versionMetadata.version).toBe(developmentManifest.version);
    expect(versionMetadata.source).toBe('version.development.json');
  });
});
