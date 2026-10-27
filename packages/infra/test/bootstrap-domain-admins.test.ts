import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const templatePath = path.resolve('scripts/templates/bootstrap-authentik-integrations.py');

function runPython(code: string): { ok: boolean; output: string } | null {
  for (const command of ['python3', 'python']) {
    const result = spawnSync(command, ['-c', code], { encoding: 'utf8' });
    if (!result.error && result.status !== null && !result.stderr.includes('was not found')) {
      return { ok: result.status === 0, output: `${result.stdout}${result.stderr}` };
    }
  }
  return null;
}

void test('internal domains cover alternun.io and alternun.co, promoted only when a source vouches for the address', () => {
  const template = fs.readFileSync(templatePath, 'utf8');
  const modules = fs.readFileSync(path.resolve('modules/identity-resources.ts'), 'utf8');

  assert.match(modules, /internalEmailDomains: \['alternun\.io', 'alternun\.co'\]/);
  assert.match(template, /from authentik\.core\.models import .*UserSourceConnection/);
  assert.match(
    template,
    /connected_user_ids = set\(UserSourceConnection\.objects\.values_list\("user_id", flat=True\)\)/
  );
  assert.match(
    template,
    /if not verified_domain_member\(user\.email, domain, user\.pk, connected_user_ids\):/
  );
  // The unverified branch has to skip before anyone is promoted.
  assert.match(
    template,
    /skipped_unverified"\]\.append\(user\.email\)\s+continue\s+promote_platform_user\(user, \["Alternun Internal Admin"\]\)/
  );
});

void test('a domain address counts only with an exact host, one @ and a source connection', (t) => {
  const template = fs.readFileSync(templatePath, 'utf8');
  const match = /def verified_domain_member[\s\S]*?\n\n\n/.exec(template);
  assert.ok(match, 'verified_domain_member must exist in the bootstrap template');

  const cases = [
    ['ada@alternun.co', 'alternun.co', 1, true],
    [' Ada@Alternun.CO ', 'alternun.co', 2, true],
    ['ada@alternun.co', 'alternun.co', 3, false],
    ['ada@alternun.io', 'alternun.co', 1, false],
    ['ada@evil.alternun.co', 'alternun.co', 1, false],
    ['ada@alternun.co.evil.test', 'alternun.co', 1, false],
    ['ada@evil.test@alternun.co', 'alternun.co', 1, false],
    ['@alternun.co', 'alternun.co', 1, false],
    ['', 'alternun.co', 1, false],
    [null, 'alternun.co', 1, false],
  ];
  const script = [
    match[0],
    'import json',
    `cases = json.loads(${JSON.stringify(JSON.stringify(cases))})`,
    'connected = {1, 2}',
    'bad = [c for c in cases if verified_domain_member(c[0], c[1], c[2], connected) is not c[3]]',
    'print("BAD", bad)',
    'raise SystemExit(1 if bad else 0)',
  ].join('\n');

  const result = runPython(script);
  if (!result) {
    t.skip('python is not available');
    return;
  }
  assert.equal(result.ok, true, result.output);
});
