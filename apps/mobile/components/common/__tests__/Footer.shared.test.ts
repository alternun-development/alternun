/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
jest.mock('expo-image', (): { __esModule: boolean; Image: () => null } => ({
  __esModule: true,
  Image: () => null,
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const developmentManifest = require('../../../../../version.development.json') as {
  version: string;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const productionManifest = require('../../../../../version.production.json') as {
  version: string;
};

import { resolveVersionMetadata } from '../Footer.shared';

describe('Footer.shared version metadata', () => {
  const originalOrigin = process.env.EXPO_PUBLIC_ORIGIN;

  afterEach(() => {
    process.env.EXPO_PUBLIC_ORIGIN = originalOrigin;
  });

  it('resolves the development manifest for testnet and local runtimes', () => {
    process.env.EXPO_PUBLIC_ORIGIN = 'https://testnet.airs.alternun.co';

    const versionMetadata = resolveVersionMetadata();

    expect(versionMetadata.version).toBe(developmentManifest.version);
    expect(versionMetadata.source).toBe('version.development.json');
  });

  it('resolves the production manifest for production runtimes', () => {
    process.env.EXPO_PUBLIC_ORIGIN = 'https://airs.alternun.co';

    const versionMetadata = resolveVersionMetadata();

    expect(versionMetadata.version).toBe(productionManifest.version);
    expect(versionMetadata.source).toBe('version.production.json');
  });
});
