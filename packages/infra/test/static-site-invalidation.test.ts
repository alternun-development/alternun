import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const infraConfigPath = path.resolve('infra.config.ts');
const adminSitePath = path.resolve('modules/admin-site.ts');
const buildspecPath = path.resolve('buildspec.yml');
const cloudfrontInvalidatePath = path.resolve('scripts/postdeploy-cloudfront-invalidate.sh');
const syncExpoSiteAssetsPath = path.resolve('scripts/sync-expo-site-assets.sh');

void test('static site invalidation waits are configurable and default to non-blocking', () => {
  const infraConfigSource = fs.readFileSync(infraConfigPath, 'utf8');
  const adminSiteSource = fs.readFileSync(adminSitePath, 'utf8');
  const buildspecSource = fs.readFileSync(buildspecPath, 'utf8');
  const cloudfrontInvalidateSource = fs.readFileSync(cloudfrontInvalidatePath, 'utf8');
  const syncExpoSiteAssetsSource = fs.readFileSync(syncExpoSiteAssetsPath, 'utf8');

  assert.match(
    infraConfigSource,
    /parseBoolean\(\s*process\.env\.INFRA_STATIC_SITE_INVALIDATION_WAIT,\s*false\s*\)/
  );
  assert.match(infraConfigSource, /wait: staticSiteInvalidationWait/);
  assert.doesNotMatch(infraConfigSource, /wait:\s*stage\s*===\s*'production'/);

  assert.match(adminSiteSource, /invalidationWait:\s*boolean/);
  assert.match(adminSiteSource, /wait: args\.invalidationWait/);
  assert.doesNotMatch(adminSiteSource, /wait:\s*deploymentStage\s*===\s*'production'/);

  assert.match(buildspecSource, /touch \.sst-deploy-succeeded/);
  assert.match(buildspecSource, /sync-expo-site-assets\.sh/);
  assert.match(
    buildspecSource,
    /if \[ ! -f \.sst-deploy-succeeded \]; then\n\s+echo "Skipping CloudFront invalidation because deploy did not complete\."/
  );
  assert.doesNotMatch(
    buildspecSource,
    /Skipping CloudFront invalidation because BUILD phase failed\./
  );
  assert.match(buildspecSource, /INFRA_STATIC_SITE_INVALIDATION_WAIT: 'false'/);
  assert.match(syncExpoSiteAssetsSource, /aws s3 sync/);
  assert.match(syncExpoSiteAssetsSource, /--delete/);

  assert.doesNotMatch(cloudfrontInvalidateSource, /declare -A CLOUDFRONT_DISTROS=/);
  assert.match(cloudfrontInvalidateSource, /resolve_discovery_alias\(\)/);
  assert.match(cloudfrontInvalidateSource, /discover_distribution_for_alias\(\)/);
  assert.match(cloudfrontInvalidateSource, /INFRA_EXPO_DOMAIN_DEV/);
  assert.match(cloudfrontInvalidateSource, /INFRA_ADMIN_DOMAIN_DEV/);
});
