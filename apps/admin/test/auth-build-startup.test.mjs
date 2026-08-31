import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const adminDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(adminDirectory, 'package.json'), 'utf8'));
const authPackageDirectory = path.resolve(adminDirectory, '../../packages/auth');
const authPackageJson = JSON.parse(
  fs.readFileSync(path.join(authPackageDirectory, 'package.json'), 'utf8')
);
const authentikRelaySource = fs.readFileSync(
  path.join(adminDirectory, 'src/auth/authentikRelay.ts'),
  'utf8'
);
const adminEnvSource = fs.readFileSync(path.join(adminDirectory, 'src/config/env.ts'), 'utf8');
const oidcClientSource = fs.readFileSync(path.join(adminDirectory, 'src/auth/oidc-client.ts'), 'utf8');
const accessControlSource = fs.readFileSync(
  path.join(adminDirectory, 'src/providers/accessControlProvider.ts'),
  'utf8'
);
const authProviderSource = fs.readFileSync(path.join(adminDirectory, 'src/auth/authProvider.ts'), 'utf8');
const callbackPageSource = fs.readFileSync(
  path.join(adminDirectory, 'src/pages/auth/callback-page.tsx'),
  'utf8'
);
const appShellSource = fs.readFileSync(path.join(adminDirectory, 'src/components/app-shell.tsx'), 'utf8');
const stylesSource = fs.readFileSync(path.join(adminDirectory, 'src/styles.css'), 'utf8');
const indexSource = fs.readFileSync(path.join(adminDirectory, 'index.html'), 'utf8');

void test('admin development commands build the workspace auth package first', () => {
  assert.match(packageJson.scripts.dev, /^pnpm --filter @alternun\/auth run build && vite$/);
  assert.match(
    packageJson.scripts['dev:local'],
    /^pnpm --filter @alternun\/auth run build && vite --host 127\.0\.0\.1 --port 5173 --strictPort$/
  );
});

void test('admin owns its browser-only Authentik relay helpers', () => {
  assert.deepEqual(authPackageJson.exports['./authentik'], {
    types: './dist/authentik.d.ts',
    default: './dist/authentik.js',
  });
  assert.match(authentikRelaySource, /function buildAdminAuthentikLoginEntryUrl/);
  assert.match(authentikRelaySource, /function resolveSafeAdminRedirect/);
  assert.doesNotMatch(authentikRelaySource, /from '@alternun\/auth\/authentik';/);
  assert.doesNotMatch(authentikRelaySource, /from '@alternun\/auth';/);
  assert.match(adminEnvSource, /authGoogleFlowSlug:\s*configuredGoogleFlowSlug \?\? undefined/);
  assert.doesNotMatch(adminEnvSource, /appEnv === 'production' \|\| configuredGoogleFlowSlug === ''/);
});

void test('the production Google relay starts the selected Google source with its pending Admin OIDC authorization request', () => {
  assert.match(authentikRelaySource, /if \(flowSlug\?\.trim\(\)\) \{[\s\S]*?return `\$\{authentikOrigin\}\/if\/flow\//);
  assert.match(authentikRelaySource, /\/if\/flow\/\$\{encodeURIComponent\(/);
});

void test('admin dashboard access requires an Authentik role rather than an email domain', () => {
  assert.match(oidcClientSource, /return hasAdminRole\(roles,?\);/);
  assert.doesNotMatch(oidcClientSource, /hasAllowedAdminEmailDomain/);
  assert.doesNotMatch(accessControlSource, /hasAllowedAdminEmailDomain/);
  assert.doesNotMatch(accessControlSource, /Workspace Google users/);
  assert.doesNotMatch(authProviderSource, /@alternun\.io accounts/);
  assert.match(callbackPageSource, /error=unauthorized-admin/);
});

void test('every authenticated admin view carries the deployed release footer', () => {
  assert.match(appShellSource, /className='admin-footer'/);
  assert.match(appShellSource, /v\{adminEnv\.appVersion\}/);
  assert.match(appShellSource, /\{adminEnv\.appEnv\}/);
});

void test('the authenticated shell provides an accessible mobile navigation drawer', () => {
  assert.match(appShellSource, /aria-controls='admin-navigation'/);
  assert.match(appShellSource, /aria-expanded=\{isNavigationOpen\}/);
  assert.match(appShellSource, /event\.key === 'Escape'/);
  assert.match(appShellSource, /className=\{`sidebar-backdrop\$\{isNavigationOpen/);
  assert.match(stylesSource, /\.admin-sidebar\.is-open/);
  assert.match(stylesSource, /\.mobile-nav-toggle/);
  assert.match(stylesSource, /@media \(max-width: 980px\)/);
});

void test('operator identity uses a compact profile menu instead of an overflowing header card', () => {
  assert.match(appShellSource, /className='profile-trigger'/);
  assert.match(appShellSource, /aria-haspopup='menu'/);
  assert.match(appShellSource, /className='profile-popover'/);
  assert.match(appShellSource, /className='profile-sign-out'/);
  assert.doesNotMatch(appShellSource, /identity-badge/);
  assert.match(stylesSource, /\.profile-trigger/);
  assert.match(stylesSource, /\.profile-popover/);
});

void test('admin ships Alternun favicon and PWA metadata', () => {
  assert.match(indexSource, /href="\/favicon\.ico"/);
  assert.match(indexSource, /href="\/favicon-32x32\.png"/);
  assert.match(indexSource, /href="\/apple-touch-icon\.png"/);
  assert.match(indexSource, /href="\/site\.webmanifest"/);
});
