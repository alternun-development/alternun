import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const templatePath = path.resolve('scripts/templates/deploy-authentik.sh');

void test('deploy-authentik reapplies the Authentik source-stage runtime hotfix', () => {
  const template = fs.readFileSync(templatePath, 'utf8');

  assert.match(template, /wait_for_identity_runtime_prereqs\(\) \{/);
  assert.match(template, /waiting for \/etc\/alternun-identity\.env/);
  assert.match(template, /waiting for Docker Compose/);
  assert.match(template, /docker info >/);
  assert.match(template, /if command -v docker-compose >/);
  assert.match(template, /elif docker compose version >/);
  assert.match(template, /apply_authentik_source_stage_hotfix\(\) \{/);
  assert.match(template, /\/authentik\/enterprise\/stages\/source\/stage\.py/);
  assert.match(template, /self\.request\.session\.pop\(SESSION_KEY_OVERRIDE_FLOW_TOKEN, None\)/);
  assert.match(template, /self\.request\.session\.pop\(SESSION_KEY_SOURCE_FLOW_STAGES, None\)/);
  assert.match(template, /self\.request\.session\.pop\(SESSION_KEY_SOURCE_FLOW_CONTEXT, None\)/);
  assert.match(template, /except ValueError:/);
  assert.match(
    template,
    /"\$\{compose_cmd\[@\]\}" -f \/opt\/alternun\/identity\/docker-compose\.yml restart server >\/dev\/null/
  );
  assert.match(template, /if ! apply_authentik_source_stage_hotfix; then/);

  const migrationsIndex = template.indexOf('if ! run_authentik_migrations; then');
  const waitIndex = template.indexOf('wait_for_identity_runtime_prereqs');
  const sourceIndex = template.indexOf('source /etc/alternun-identity.env');
  const hotfixIndex = template.indexOf('if ! apply_authentik_source_stage_hotfix; then');
  const bootstrapIndex = template.indexOf('BOOTSTRAP_STDERR_FILE="$(mktemp)"');

  assert.ok(waitIndex >= 0, 'expected runtime readiness guard to exist');
  assert.ok(sourceIndex > waitIndex, 'env file should be sourced after runtime readiness checks');
  assert.ok(migrationsIndex >= 0, 'expected migration guard to exist');
  assert.ok(hotfixIndex > migrationsIndex, 'hotfix should run after migrations');
  assert.ok(bootstrapIndex > hotfixIndex, 'bootstrap should run after the runtime hotfix');
});
