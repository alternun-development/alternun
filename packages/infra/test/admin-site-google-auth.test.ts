import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const adminSitePath = path.resolve('modules/admin-site.ts');

void test('production admin deployments default to the supported Google relay flow', () => {
  const source = fs.readFileSync(adminSitePath, 'utf8');

  assert.match(
    source,
    /const defaultGoogleFlowSlug =\s+deploymentStage === 'production' \? 'alternun-google-login' : '';/
  );
  assert.match(source, /const googleEnabled =[\s\S]*?\(googleFlowSlug \? 'true' : 'false'\);/);
  assert.match(source, /VITE_AUTH_GOOGLE_ENABLED: googleEnabled,/);
  assert.match(source, /VITE_AUTH_GOOGLE_FLOW_SLUG: googleFlowSlug,/);
});
