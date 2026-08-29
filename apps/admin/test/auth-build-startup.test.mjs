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

void test('admin development commands build the workspace auth package first', () => {
  assert.match(packageJson.scripts.dev, /^pnpm --filter @alternun\/auth run build && vite$/);
  assert.match(
    packageJson.scripts['dev:local'],
    /^pnpm --filter @alternun\/auth run build && vite --host 127\.0\.0\.1 --port 5173 --strictPort$/
  );
});

void test('admin imports Authentik browser helpers from the browser-safe auth entrypoint', () => {
  assert.deepEqual(authPackageJson.exports['./authentik'], {
    types: './dist/authentik.d.ts',
    default: './dist/authentik.js',
  });
  assert.match(authentikRelaySource, /from '@alternun\/auth\/authentik';/);
  assert.doesNotMatch(authentikRelaySource, /from '@alternun\/auth';/);
});

void test('admin dashboard access requires an Authentik role rather than an email domain', () => {
  assert.match(oidcClientSource, /return hasAdminRole\(roles,\);/);
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
