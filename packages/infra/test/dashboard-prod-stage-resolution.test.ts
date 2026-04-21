import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const adminSitePath = path.resolve('modules/admin-site.ts');
const backendApiPath = path.resolve('modules/backend-api.ts');

void test('dashboard-prod is explicitly mapped to production in admin and backend stage resolution', () => {
  const adminSiteSource = fs.readFileSync(adminSitePath, 'utf8');
  const backendApiSource = fs.readFileSync(backendApiPath, 'utf8');

  assert.match(adminSiteSource, /normalized === 'dashboard-prod'/);
  assert.match(adminSiteSource, /normalized === 'dashboard-production'/);
  assert.match(adminSiteSource, /return 'production';/);

  assert.match(backendApiSource, /normalized === 'dashboard-prod'/);
  assert.match(backendApiSource, /normalized === 'dashboard-production'/);
  assert.match(backendApiSource, /return 'production';/);
});
