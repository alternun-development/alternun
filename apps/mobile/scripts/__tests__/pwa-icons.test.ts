/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from '@jest/globals';

const MOBILE_ROOT = path.resolve(__dirname, '..', '..');

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(MOBILE_ROOT, relativePath), 'utf8');
}

describe('PWA icon config', () => {
  it('uses the branded Alternun logo as the icon source and writes favicon assets', () => {
    const jsScript = readText('scripts/generate-pwa-icons.mjs');
    const pyScript = readText('scripts/generate-pwa-icons.py');

    expect(jsScript).toContain('alternun-logo.png');
    expect(pyScript).toContain('alternun-logo.png');
    expect(jsScript).toContain('favicon.ico');
    expect(pyScript).toContain('favicon.ico');
    expect(jsScript).toContain('favicon-48x48.png');
    expect(pyScript).toContain('favicon-48x48.png');
  });

  it('keeps the Expo config pointed at the branded assets', () => {
    type SplashPluginConfig = {
      image?: string;
      backgroundColor?: string;
    };

    const appConfig = JSON.parse(readText('app.json')) as {
      expo: {
        icon: string;
        android: {
          adaptiveIcon: {
            foregroundImage: string;
            backgroundColor: string;
          };
        };
        web: {
          favicon: string;
        };
        plugins: Array<string | [string, Record<string, unknown>]>;
      };
    };

    const splashPlugin = appConfig.expo.plugins.find(
      (entry): entry is ['expo-splash-screen', Record<string, unknown>] =>
        Array.isArray(entry) && entry[0] === 'expo-splash-screen'
    );
    const splashConfig = splashPlugin?.[1] as SplashPluginConfig | undefined;

    expect(appConfig.expo.icon).toBe('./assets/images/icon.png');
    expect(appConfig.expo.android.adaptiveIcon.foregroundImage).toBe(
      './assets/images/adaptive-icon.png'
    );
    expect(appConfig.expo.android.adaptiveIcon.backgroundColor).toBe('#050510');
    expect(appConfig.expo.web.favicon).toBe('./assets/images/favicon.png');
    expect(splashConfig?.image).toBe('./assets/images/splash-icon.png');
    expect(splashConfig?.backgroundColor).toBe('#050510');
  });
});
