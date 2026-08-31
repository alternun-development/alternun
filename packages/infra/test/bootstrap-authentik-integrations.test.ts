import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const templatePath = path.resolve('scripts/templates/bootstrap-authentik-integrations.py');

void test('bootstrap resumes Google through an outer SourceStage flow before returning to the OIDC request', () => {
  const template = fs.readFileSync(templatePath, 'utf8');

  assert.match(template, /authentication: str = "none"/);
  assert.match(template, /"authentication": authentication/);
  assert.match(template, /def ensure_flow_authentication\(flow, authentication: str = "none"\):/);
  assert.match(
    template,
    /source_authentication_flow_opened = ensure_flow_authentication\(source_authentication_flow\)/
  );
  assert.match(template, /def upsert_source_stage_flow\(/);
  assert.match(template, /login_stage_name = f"\{stage_name\.removesuffix\('-stage'\)\}-login"/);
  assert.match(template, /ensure_flow_stage_binding\(\s*flow,\s*login_stage,\s*order=10,\s*\)/);
  assert.match(
    template,
    /source_authentication_flow_pruned = prune_flow_stage_bindings\(\s*source_authentication_flow, UserLoginStage\s*\)/
  );
  assert.match(template, /SourceStage resumes the original flow/);
  assert.match(
    template,
    /if discord_login_stage:[\s\S]*?if source_authentication_flow and discord_source\.authentication_flow_id != source_authentication_flow\.pk:/
  );
  assert.doesNotMatch(
    template,
    /if discord_login_stage:[\s\S]*?discord_source\.authentication_flow = discord_login_flow/
  );
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
  assert.match(template, /def ensure_admin_group_claim_mapping\(allowed_groups\):/);
  assert.match(template, /Alternun Admin OAuth Mapping: profile groups/);
  assert.match(
    template,
    /"groups": \[group\.name for group in request\.user\.ak_groups\.all\(\)\]/
  );
  assert.match(template, /"alternun_roles": \["platform_admin"\] if is_admin else \[\]/);
  assert.match(template, /ensure_admin_group_claim_mapping\(\s*\[admin_group,/);
  assert.match(template, /desired_scope_mappings\.append\(admin_group_claim_mapping\)/);
  assert.match(template, /Only users assigned to an approved Alternun admin group/);
  assert.doesNotMatch(template, /Only approved admin users or @/);
  assert.doesNotMatch(template, /ALTERNUN_BOOTSTRAP_ADMIN_ALLOWED_EMAIL_DOMAIN/);
  assert.doesNotMatch(template, /admin_allowed_email_domain/);
  assert.doesNotMatch(template, /internal_user_promotion/);
});

void test('bootstrap renders the admin group claim payload as a Python dictionary', () => {
  const template = fs.readFileSync(templatePath, 'utf8');

  assert.match(
    template,
    /def ensure_admin_group_claim_mapping\(allowed_groups\):[\s\S]*?return \{\{[\s\S]*?"alternun_roles"/
  );
});
