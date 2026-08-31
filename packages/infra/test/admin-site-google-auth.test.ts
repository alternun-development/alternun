import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const adminSitePath = path.resolve('modules/admin-site.ts');

void test('production admin deployments use the Google SourceStage wrapper flow', () => {
  const source = fs.readFileSync(adminSitePath, 'utf8');

  assert.match(
    source,
    /const defaultGoogleFlowSlug = deploymentStage === 'production' \? 'alternun-google-login' : '';/
  );
  assert.match(
    source,
    /const defaultGoogleEnabled = deploymentStage === 'production' \? 'true' : 'false';/
  );
  assert.match(source, /\(googleFlowSlug \? 'true' : defaultGoogleEnabled\);/);
  assert.match(source, /VITE_AUTH_GOOGLE_ENABLED: googleEnabled,/);
  assert.match(source, /VITE_AUTH_GOOGLE_FLOW_SLUG: googleFlowSlug,/);
  assert.match(source, /const googleFlowSlug = configuredGoogleFlowSlug;/);
});
