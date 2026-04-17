/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    nativeApplicationVersion: '1.0.70',
    nativeBuildVersion: '1',
    expoConfig: { version: '1.0.70', },
  },
}),);

jest.mock('expo-image', (): { __esModule: boolean; Image: () => null } => ({
  __esModule: true,
  Image: () => null,
}),);

import mobilePackageJson from '../../../package.json';
import { resolveVersionMetadata, } from '../Footer.shared';

describe('Footer.shared version metadata', () => {
  it('resolves the mobile package version for footer version pills', () => {
    const versionMetadata = resolveVersionMetadata();

    expect(versionMetadata.version,).toBe(mobilePackageJson.version,);
    expect(versionMetadata.source,).toBe('apps/mobile/package.json',);
  },);
},);
