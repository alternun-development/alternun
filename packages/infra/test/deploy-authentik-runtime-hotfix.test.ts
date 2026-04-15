import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const templatePath = path.resolve('scripts/templates/deploy-authentik.sh');

void test('deploy-authentik reapplies the Authentik source-stage runtime hotfix', () => {
  const template = fs.readFileSync(templatePath, 'utf8');

  assert.match(template, /apply_authentik_source_stage_hotfix\(\) \{/);
  assert.match(template, /\/authentik\/enterprise\/stages\/source\/stage\.py/);
  assert.match(template, /self\.request\.session\.pop\(SESSION_KEY_OVERRIDE_FLOW_TOKEN, None\)/);
  assert.match(template, /self\.request\.session\.pop\(SESSION_KEY_SOURCE_FLOW_STAGES, None\)/);
  assert.match(template, /self\.request\.session\.pop\(SESSION_KEY_SOURCE_FLOW_CONTEXT, None\)/);
  assert.match(template, /except ValueError:/);
  assert.ok(
    template.includes(
      'docker compose -f /opt/alternun/identity/docker-compose.yml restart server >/dev/null'
    ),
    'expected server restart after applying the runtime hotfix'
  );
  assert.match(template, /if ! apply_authentik_source_stage_hotfix; then/);

  const migrationsIndex = template.indexOf('if ! run_authentik_migrations; then');
  const hotfixIndex = template.indexOf('if ! apply_authentik_source_stage_hotfix; then');
  const bootstrapIndex = template.indexOf('BOOTSTRAP_STDERR_FILE="$(mktemp)"');

  assert.ok(migrationsIndex >= 0, 'expected migration guard to exist');
  assert.ok(hotfixIndex > migrationsIndex, 'hotfix should run after migrations');
  assert.ok(bootstrapIndex > hotfixIndex, 'bootstrap should run after the runtime hotfix');
});
