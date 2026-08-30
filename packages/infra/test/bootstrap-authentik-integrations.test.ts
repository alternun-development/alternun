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
  assert.doesNotMatch(template, /ensure_source_flow_user_login_stage/);
  assert.match(template, /derive_origin_redirect\(url: str\)/);
  assert.match(template, /derive_auth_callback_redirect\(url: str\)/);
  assert.match(template, /if not mobile_oidc_redirect_urls and mobile_oidc_launch_url:/);
  assert.match(template, /if mobile_oidc_client_id:/);
  assert.match(
    template,
    /if not mobile_oidc_post_logout_redirect_urls and mobile_oidc_launch_url:/
  );
});

void test('admin application access is restricted to assigned admin groups', () => {
  const template = fs.readFileSync(templatePath, 'utf8');

  assert.match(template, /def build_admin_access_expression\(allowed_groups\):/);
  assert.match(template, /def ensure_admin_group_claim_mapping\(\):/);
  assert.match(template, /Alternun Admin OAuth Mapping: profile groups/);
  assert.match(
    template,
    /"groups": \[group\.name for group in request\.user\.ak_groups\.all\(\)\]/
  );
  assert.match(template, /desired_scope_mappings\.append\(admin_group_claim_mapping\)/);
  assert.match(template, /Only users assigned to an approved Alternun admin group/);
  assert.doesNotMatch(template, /Only approved admin users or @/);
  assert.doesNotMatch(template, /ALTERNUN_BOOTSTRAP_ADMIN_ALLOWED_EMAIL_DOMAIN/);
  assert.doesNotMatch(template, /admin_allowed_email_domain/);
  assert.doesNotMatch(template, /internal_user_promotion/);
});
