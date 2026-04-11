/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import mobilePackageJson from '../../../package.json';
import { resolveVersionMetadata } from '../Footer.shared';

describe('Footer.shared version metadata', () => {
  it('resolves the mobile package version for footer version pills', () => {
    const versionMetadata = resolveVersionMetadata();

    expect(versionMetadata.version).toBe(mobilePackageJson.version);
    expect(versionMetadata.source).toBe('apps/mobile/package.json');
  });
});
