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
  assert.match(template, /def ensure_admin_group_claim_mapping\(group_roles\):/);
  assert.match(template, /Alternun Admin OAuth Mapping: profile groups/);
  assert.match(
    template,
    /"groups": \[group\.name for group in request\.user\.ak_groups\.all\(\)\]/
  );
  assert.match(template, /ensure_admin_group_claim_mapping\(admin_group_roles\)/);
  assert.match(template, /admin_group_roles = \{/);
  assert.match(template, /build_admin_access_expression\(admin_group_roles\.keys\(\)\)/);
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
    /def ensure_admin_group_claim_mapping\(group_roles\):[\s\S]*?return \{\{[\s\S]*?"alternun_roles"/
  );
});

void test('admin group claims map explicit admin groups to only canonical least-privilege roles', () => {
  const template = fs.readFileSync(templatePath, 'utf8');
  const canonicalGroupRoles = {
    'Alternun Platform Owner': 'platform_owner',
    'Alternun Internal Admin': 'internal_admin',
    'Alternun Partner Operator': 'partner_operator',
    'Alternun Partner Read Only': 'partner_readonly',
  };

  for (const [groupName, role] of Object.entries(canonicalGroupRoles)) {
    assert.match(template, new RegExp(`"${groupName}":\\s*"${role}"`));
  }

  assert.match(template, /"authentik Admins": "platform_owner"/);
  assert.match(template, /"Alternun Dashboard Admins": "internal_admin"/);

  assert.doesNotMatch(template, /"platform_admin"/);
  assert.doesNotMatch(template, /"support_admin"/);
  assert.doesNotMatch(template, /"read_only_admin"/);
});

const adminAuthGuardPath = path.resolve('../../apps/api/src/common/admin-auth/admin-auth.guard.ts');

function readAdminGroupRoles(template: string): Record<string, string> {
  const block = template.match(/admin_group_roles = \{\n([\s\S]*?)\n {4}\}/)?.[1];
  assert.ok(block, 'admin_group_roles block not found');
  const entries: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const match = line.match(/^\s*(admin_group|"[^"]+"):\s*"([a-z_]+)",$/);
    assert.ok(match, `unexpected admin_group_roles line: ${line}`);
    entries[match[1].replace(/"/g, '')] = match[2];
  }
  return entries;
}

function readApiAdminRoles(): string[] {
  const source = fs.readFileSync(adminAuthGuardPath, 'utf8');
  const block = source.match(/export const ADMIN_ROLES = \[([\s\S]*?)\] as const;/)?.[1];
  assert.ok(block, 'ADMIN_ROLES not found in the API guard');
  return block
    .split(',')
    .map((entry: string) => entry.trim().replace(/'/g, ''))
    .filter((entry: string) => entry.length > 0);
}

// Mirrors the claim expression: a role is emitted only for a mapped group the user belongs to.
function rolesForGroups(groupRoles: Record<string, string>, userGroups: string[]): string[] {
  return Object.entries(groupRoles)
    .filter(([groupName]) => userGroups.includes(groupName))
    .map(([, role]) => role);
}

void test('every Alternun admin role has its own Authentik group', () => {
  const groupRoles = readAdminGroupRoles(fs.readFileSync(templatePath, 'utf8'));
  const roleGroups = {
    'Alternun Platform Owner': 'platform_owner',
    'Alternun Internal Admin': 'internal_admin',
    'Alternun Moderator': 'moderator',
    'Alternun Partner Operator': 'partner_operator',
    'Alternun Sub Admin': 'sub_admin',
    'Alternun Partner Read Only': 'partner_readonly',
  };

  for (const [groupName, role] of Object.entries(roleGroups)) {
    assert.equal(groupRoles[groupName], role, groupName);
    assert.deepEqual(rolesForGroups(groupRoles, [groupName]), [role], groupName);
  }
  const apiRoles = readApiAdminRoles();
  assert.deepEqual([...new Set(Object.values(roleGroups))].sort(), [...apiRoles].sort());
  for (const role of Object.values(groupRoles)) assert.ok(apiRoles.includes(role), role);
});

void test('an unknown or look-alike group grants no admin role', () => {
  const template = fs.readFileSync(templatePath, 'utf8');
  const groupRoles = readAdminGroupRoles(template);

  assert.match(
    template,
    /role for group_name, role in group_roles\.items\(\) if group_name in user_groups/
  );
  assert.match(template, /if user\.groups\.filter\(name__in=list\(allowed_groups\)\)\.exists\(\):/);
  for (const groups of [
    ['Alternun Moderators'],
    ['alternun moderator'],
    ['Alternun Super Admin'],
    ['moderator'],
    ['platform_owner'],
    [],
  ]) {
    assert.deepEqual(rolesForGroups(groupRoles, groups), [], JSON.stringify(groups));
  }
  assert.deepEqual(rolesForGroups(groupRoles, ['Alternun Sub Admin', 'Hotel Staff']), [
    'sub_admin',
  ]);
});

void test('bootstrap creates every mapped admin role group before using it', () => {
  const template = fs.readFileSync(templatePath, 'utf8');

  assert.match(
    template,
    /admin_group_roles = \{[\s\S]*?\n {4}\}\n[\s\S]*?for group_name in sorted\(group for group in admin_group_roles if group\):\n\s*_, group_created = Group\.objects\.get_or_create\(name=group_name\)[\s\S]*?ensure_admin_group_claim_mapping\(admin_group_roles\)/
  );
  assert.match(template, /results\["admin_role_groups"\] = \{/);
});

void test('admin OIDC logout redirects back to the admin app instead of the Authentik logout page', () => {
  const template = fs.readFileSync(templatePath, 'utf8');

  assert.match(
    template,
    /admin_invalidation_flow, admin_invalidation_flow_created, admin_invalidation_flow_changed = \(\s*upsert_invalidation_flow\(\s*"alternun-admin-provider-invalidation-flow",/
  );
  assert.match(
    template,
    /admin_logout_stage = UserLogoutStage\.objects\.filter\(name="default-invalidation-logout"\)\.first\(\)/
  );
  assert.match(
    template,
    /upsert_redirect_stage\(\s*"alternun-admin-provider-invalidation-redirect",\s*admin_oidc_post_logout_redirect_url,\s*keep_context=True,\s*\)/
  );
  assert.match(template, /invalidation_flow = admin_invalidation_flow/);
});
