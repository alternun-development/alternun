import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const buildspecPath = path.resolve('buildspec.yml');
const postdeployDnsPath = path.resolve('scripts/postdeploy-update-dns.sh');
const postdeployReachabilityPath = path.resolve('scripts/postdeploy-reachability-check.sh');

void test('dev stage runs post-deploy DNS sync and keeps redirect probes advisory by default', () => {
  const buildspecSource = fs.readFileSync(buildspecPath, 'utf8');
  const postdeployDnsSource = fs.readFileSync(postdeployDnsPath, 'utf8');
  const postdeployReachabilitySource = fs.readFileSync(postdeployReachabilityPath, 'utf8');

  assert.match(
    buildspecSource,
    /if \[ "\$\{SST_STAGE\}" = "dev" \]; then[\s\S]*export INFRA_ENABLE_POSTDEPLOY_DNS_SYNC=true/
  );

  assert.match(postdeployDnsSource, /sync_redirect_groups\(\)/);
  assert.match(postdeployDnsSource, /INFRA_REDIRECT_AIRS_TO_DEV_SOURCE/);
  assert.match(postdeployDnsSource, /INFRA_REDIRECT_DEV_TO_TESTNET_SOURCES/);
  assert.match(postdeployDnsSource, /INFRA_REDIRECT_ROOT_TARGET/);
  assert.match(postdeployDnsSource, /Type": "AAAA"/);

  assert.match(postdeployReachabilitySource, /INFRA_ENFORCE_REDIRECT_CHECKS/);
  assert.match(postdeployReachabilitySource, /WARN: Redirect check failed for/);
});
