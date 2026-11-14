/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import fs from 'fs';
import path from 'path';
import { resolveLegacyRoute, toQueryString } from '../../utils/legacyRoutes';

/**
 * Guard: every Expo Router route segment (URL path) must be an English name.
 * User-facing copy is localized through i18n; URLs are not.
 * Adding a route? Use an English name and add it here. Old Spanish URLs are redirected in
 * apps/mobile/utils/legacyRoutes.ts.
 */
const ALLOWED_ROUTE_SEGMENTS = new Set([
  'auth',
  'auth-relay',
  'callback',
  'delete-account',
  'enterprise',
  'explore',
  'index',
  'manage',
  'notifications',
  'portfolio',
  'privacy',
  'profile',
  'referral',
  'reset-password',
  'settings',
  'terms',
]);

const APP_DIR = path.resolve(__dirname, '..');
const SKIPPED_DIRS = new Set(['__tests__', 'tempobook']);

function isIgnored(segment: string): boolean {
  return (
    segment.startsWith('_layout') ||
    segment.startsWith('+') ||
    /^\(.*\)$/.test(segment) ||
    /^\[.*\]$/.test(segment)
  );
}

function collectRouteSegments(dir: string, found: Map<string, string>): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relative = path.relative(APP_DIR, path.join(dir, entry.name));
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(entry.name)) continue;
      if (!isIgnored(entry.name)) found.set(relative, entry.name);
      collectRouteSegments(path.join(dir, entry.name), found);
      continue;
    }
    if (!/\.(tsx?|jsx?)$/.test(entry.name) || entry.name.endsWith('.types.ts')) continue;
    // Strip extension and platform suffix: profile.web.tsx -> profile
    const segment = entry.name
      .replace(/\.(tsx?|jsx?)$/, '')
      .replace(/\.(web|native|ios|android)$/, '');
    if (!isIgnored(segment)) found.set(relative, segment);
  }
}

describe('app route names', () => {
  it('only uses English route segments from the allowlist', () => {
    const found = new Map<string, string>();
    collectRouteSegments(APP_DIR, found);

    const offenders = [...found.entries()]
      .filter(([, segment]) => !ALLOWED_ROUTE_SEGMENTS.has(segment))
      .map(([file, segment]) => `  app/${file} -> "${segment}"`);

    if (offenders.length > 0) {
      throw new Error(
        `Route segments not in the allowlist:\n${offenders.join('\n')}\n\n` +
          'App routes (URL paths / Expo Router file names) must be in English. Translate user-facing ' +
          'copy with i18n instead, then add the English segment to ALLOWED_ROUTE_SEGMENTS in ' +
          'apps/mobile/app/__tests__/route-names.test.ts.'
      );
    }
    expect(found.size).toBeGreaterThan(0);
  });
});

describe('legacy Spanish route redirects', () => {
  it.each([
    ['/mi-perfil', '/profile'],
    ['/portafolio', '/portfolio'],
    ['/explorar', '/explore'],
    ['/explorar/some-project', '/explore/some-project'],
    ['/explorar/empresa/acme', '/explore/enterprise/acme'],
  ])('maps %s to %s', (legacy, current) => {
    expect(resolveLegacyRoute(legacy)).toBe(current);
  });

  it('leaves current and unrelated paths alone', () => {
    expect(resolveLegacyRoute('/profile')).toBeNull();
    expect(resolveLegacyRoute('/explore/enterprise/acme')).toBeNull();
    expect(resolveLegacyRoute('/mi-perfilx')).toBeNull();
    expect(resolveLegacyRoute('/')).toBeNull();
  });

  it('keeps query params and drops the not-found catch-all', () => {
    expect(toQueryString({ 'not-found': ['mi-perfil'], tab: 'wallet', ref: ['a', 'b'] })).toBe(
      '?tab=wallet&ref=a&ref=b'
    );
    expect(toQueryString({ 'not-found': ['mi-perfil'] })).toBe('');
  });
});
