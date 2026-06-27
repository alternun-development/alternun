import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const templatePath = path.join(
  repoRoot,
  'packages/infra/scripts/templates/verify-authentik-runtime.sh'
);

void test('identity runtime verification script uses compose from a dedicated file', () => {
  const template = fs.readFileSync(templatePath, 'utf8');

  assert.match(template, /wait_for_identity_runtime_prereqs\(\) \{/);
  assert.match(template, /waiting for \/etc\/alternun-identity\.env/);
  assert.match(template, /waiting for Docker Compose/);
  assert.match(template, /docker info >/);
  assert.match(template, /\. \/etc\/alternun-identity\.env/);
  assert.match(template, /if command -v docker-compose >/);
  assert.match(template, /elif docker compose version >/);
  assert.match(template, /verify_shell=\$\(cat <<'PYEOF'/);
  assert.match(template, /Application\.objects\.filter\(slug="alternun-admin"\)\.exists\(\)/);
  assert.match(
    template,
    /printf '%s\\n' "\$verify_shell" \| timeout[\s\S]+? "\$\{compose_cmd\[@\]\}" -f \/opt\/alternun\/identity\/docker-compose\.yml exec -T server \/ak-root\/\.venv\/bin\/python \/manage\.py shell/
  );
});
