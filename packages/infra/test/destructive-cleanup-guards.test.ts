import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const pipelineSafetyPath = path.resolve('scripts/_pipeline-safety.sh');
const predeployChecksPath = path.resolve('scripts/predeploy-checks.sh');
const sstDeployPath = path.resolve('scripts/sst-deploy.sh');
const buildspecPath = path.resolve('buildspec.yml');
const envExamplePath = path.resolve('.env.example');
const readmePath = path.resolve('README.md');

void test('destructive infra cleanup stays opt-in across deploy scripts, env defaults, and docs', () => {
  const pipelineSafetySource = fs.readFileSync(pipelineSafetyPath, 'utf8');
  const predeploySource = fs.readFileSync(predeployChecksPath, 'utf8');
  const sstDeploySource = fs.readFileSync(sstDeployPath, 'utf8');
  const buildspecSource = fs.readFileSync(buildspecPath, 'utf8');
  const envExampleSource = fs.readFileSync(envExamplePath, 'utf8');
  const readmeSource = fs.readFileSync(readmePath, 'utf8');

  assert.match(pipelineSafetySource, /require_destructive_cleanup_allowed\(\)/);
  assert.match(pipelineSafetySource, /INFRA_ALLOW_DESTRUCTIVE_DEPLOYMENTS/);

  assert.match(
    sstDeploySource,
    /if ! require_destructive_cleanup_allowed "CloudFront alias cleanup"; then\n\s+return 0\n\s+fi/
  );
  assert.match(sstDeploySource, /npx sst state remove --stage "\$STACK" "\$target"/);
  assert.match(sstDeploySource, /CdnSslCertificate/);
  assert.match(sstDeploySource, /CdnSslValidation/);
  assert.doesNotMatch(
    sstDeploySource,
    /if ! require_destructive_cleanup_allowed "SST state removal for \$\{target\}"; then\n\s+return 0\n\s+fi/
  );
  assert.match(
    sstDeploySource,
    /if \[ "\$\{CLOUDFRONT_ALIAS_CLEANUP_ATTEMPTED:-false\}" = "true" \]; then\n\s+# CloudFront was mutated outside SST, so refresh state before synthesis\/deploy\.\n\s+refresh_sst_state_after_alias_cleanup\n\s+else\n\s+echo "Skipping SST state refresh because CloudFront alias cleanup was not performed\."\n\s+fi/
  );
  assert.match(
    sstDeploySource,
    /build_backend_api_artifacts\(\)[\s\S]*?if \[ "\$is_backend_api_stage" != "true" \]; then[\s\S]*?return 0[\s\S]*?if ! is_truthy "\$\{INFRA_ENABLE_BACKEND_API:-false\}"; then[\s\S]*?echo "Skipping backend API build \(INFRA_ENABLE_BACKEND_API=\$\{INFRA_ENABLE_BACKEND_API:-false\}\)"/
  );
  assert.match(sstDeploySource, /Building backend API with: \$\{build_command\}/);
  assert.match(sstDeploySource, /\(\s*cd "\$REPO_ROOT"\s*\n\s*bash -lc "\$build_command"\s*\)/);

  assert.match(
    predeploySource,
    /if ! require_destructive_cleanup_allowed "Route53 DNS record deletion for \$\{record_name\}"; then\n\s+return 0\n\s+fi/
  );
  assert.match(
    predeploySource,
    /if ! require_destructive_cleanup_allowed "ACM validation CNAME deletion for \$\{domain_name\}"; then\n\s+return 0\n\s+fi/
  );
  assert.match(predeploySource, /INFRA_ALLOW_DESTRUCTIVE_DEPLOYMENTS=true/);

  assert.match(buildspecSource, /INFRA_ALLOW_DESTRUCTIVE_DEPLOYMENTS: 'false'/);
  assert.match(envExampleSource, /INFRA_ALLOW_DESTRUCTIVE_DEPLOYMENTS=false/);
  assert.match(envExampleSource, /INFRA_REMOVE_ACM_VALIDATION_CNAME=false/);

  assert.match(
    readmeSource,
    /legacy SST state for managed certificate migrations is pruned automatically when explicit cert ARNs are present/
  );
  assert.match(
    readmeSource,
    /live cleanup of CloudFront aliases, Route53 records, and ACM validation CNAMEs is blocked unless `INFRA_ALLOW_DESTRUCTIVE_DEPLOYMENTS=true`/
  );
  assert.match(readmeSource, /INFRA_ALLOW_DESTRUCTIVE_DEPLOYMENTS/);
  assert.match(readmeSource, /INFRA_ENABLE_ALIAS_CLEANUP/);
});
