import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const infraDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

void test('build defaults preserve rotating AIRS certificates supplied by CodeBuild', () => {
  const buildspec = fs.readFileSync(path.join(infraDir, 'buildspec.yml'), 'utf8');
  const defaults: Record<string, string> = {};
  const defaultPattern = /^ {4}([A-Z][A-Z0-9_]*): '([^']*)'$/gm;
  let match: RegExpExecArray | null;
  while ((match = defaultPattern.exec(buildspec)) !== null) {
    const key = match[1];
    const value = match[2];
    if (key !== undefined && value !== undefined) {
      defaults[key] = value;
    }
  }
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airs-cert-env-'));
  const envFile = path.join(tempDir, '.env');
  fs.writeFileSync(
    envFile,
    'INFRA_EXPO_CERT_ARN_PRODUCTION=previous-production\nINFRA_EXPO_CERT_ARN_DEV=previous-dev\n'
  );
  try {
    for (const generation of ['replacement', 'next-renewal']) {
      const expected = [`${generation}-production`, `${generation}-dev`];
      const result = spawnSync(
        'bash',
        [
          '-c',
          'source "$1"; load_infra_env; printf "%s\\n" "$INFRA_EXPO_CERT_ARN_PRODUCTION" "$INFRA_EXPO_CERT_ARN_DEV"',
          'certificate-env-test',
          path.join(infraDir, 'scripts/_load-infra-env.sh'),
        ],
        {
          encoding: 'utf8',
          env: {
            PATH: process.env.PATH,
            ...defaults,
            INFRA_ENV_FILE: envFile,
            INFRA_EXPO_CERT_ARN_PRODUCTION: expected[0],
            INFRA_EXPO_CERT_ARN_DEV: expected[1],
          },
        }
      );
      assert.equal(result.status, 0, 'infra environment loading must succeed');
      assert.ok(
        result.stdout.trim() === expected.join('\n'),
        'buildspec defaults must not replace the supplied production or dev certificates'
      );
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
