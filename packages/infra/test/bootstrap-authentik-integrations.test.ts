import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const templatePath = path.resolve('scripts/templates/bootstrap-authentik-integrations.py');

void test('bootstrap keeps source authentication flows open by default', () => {
  const template = fs.readFileSync(templatePath, 'utf8');

  assert.match(template, /authentication: str = "none"/);
  assert.match(template, /"authentication": authentication/);
  assert.match(template, /def ensure_flow_authentication\(flow, authentication: str = "none"\):/);
  assert.match(
    template,
    /source_authentication_flow_opened = ensure_flow_authentication\(source_authentication_flow\)/
  );
  assert.match(
    template,
    /source_authentication_flow_pruned = prune_flow_stage_bindings\(\s*source_authentication_flow, UserLoginStage\s*\)/
  );
  assert.match(
    template,
    /source_enrollment_flow_pruned = prune_flow_stage_bindings\(\s*source_enrollment_flow, UserLoginStage\s*\)/
  );
  assert.doesNotMatch(template, /default-source-authentication-login/);
  assert.doesNotMatch(template, /default-source-enrollment-login/);
  assert.match(template, /derive_origin_redirect\(url: str\)/);
  assert.match(template, /derive_auth_callback_redirect\(url: str\)/);
  assert.match(template, /if not mobile_oidc_redirect_urls and mobile_oidc_launch_url:/);
  assert.match(template, /if mobile_oidc_client_id:/);
  assert.match(
    template,
    /if not mobile_oidc_post_logout_redirect_urls and mobile_oidc_launch_url:/
  );
});
