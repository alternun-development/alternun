/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    nativeApplicationVersion: '1.0.70',
    nativeBuildVersion: '1',
    expoConfig: { version: '1.0.189-dev.0' },
  },
}));

jest.mock('expo-image', (): { __esModule: boolean; Image: () => null } => ({
  __esModule: true,
  Image: () => null,
}));

import { resolveVersionMetadata } from '../Footer.shared';

describe('Footer.shared version metadata', () => {
  it('resolves the full expo version for footer version pills', () => {
    const versionMetadata = resolveVersionMetadata();

    expect(versionMetadata.version).toBe('1.0.189-dev.0');
    expect(versionMetadata.source).toBe('expoConfig.version');
  });
});
