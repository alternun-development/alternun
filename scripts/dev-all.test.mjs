import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const devAllPath = path.join(repoRoot, 'scripts', 'dev-all.mjs');
const infraPackagePath = path.join(repoRoot, 'packages', 'infra', 'package.json');

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitFor(check, message, timeoutMilliseconds = 5_000) {
  const deadline = Date.now() + timeoutMilliseconds;

  while (Date.now() < deadline) {
    if (check()) return;
    await sleep(25);
  }

  throw new Error(message);
}

async function waitForExit(child, timeoutMilliseconds = 5_000) {
  return Promise.race([
    once(child, 'exit'),
    sleep(timeoutMilliseconds).then(() => {
      throw new Error('dev:all did not exit after SIGTERM');
    }),
  ]);
}

void test('dev:all starts and stops the isolated local Authentik Compose stack', async (t) => {
  const mockBinDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'alternun-dev-all-test-'));
  const callsPath = path.join(mockBinDirectory, 'pnpm-calls.log');
  const pnpmMockPath = path.join(mockBinDirectory, 'pnpm');

  fs.writeFileSync(
    pnpmMockPath,
    `#!/bin/sh
printf '%s\\n' "$*" >> "$ALTERNUN_PNPM_CALLS"
case "$*" in
  '--filter @alternun/infra run authentik:dev:init'|'--filter @alternun/infra run authentik:dev:up'|'--filter @alternun/infra run authentik:dev:stop')
    exit 0
    ;;
esac
trap 'exit 0' TERM INT
while :; do sleep 1; done
`,
    'utf8'
  );
  fs.chmodSync(pnpmMockPath, 0o755);

  const child = spawn(process.execPath, [devAllPath], {
    cwd: repoRoot,
    detached: true,
    env: {
      ...process.env,
      ALTERNUN_PNPM_CALLS: callsPath,
      PATH: `${mockBinDirectory}:${process.env.PATH}`,
    },
    stdio: 'ignore',
  });

  t.after(() => {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
    fs.rmSync(mockBinDirectory, { recursive: true, force: true });
  });

  const calls = () => (fs.existsSync(callsPath) ? fs.readFileSync(callsPath, 'utf8') : '');

  await waitFor(
    () => calls().includes('--filter @alternun/infra run authentik:dev:up'),
    'dev:all did not start Authentik through @alternun/infra'
  );

  child.kill('SIGTERM');
  await waitForExit(child);

  assert.match(calls(), /--filter @alternun\/infra run authentik:dev:up/);
  assert.match(calls(), /--filter @alternun\/infra run authentik:dev:stop/);

  const infraPackage = JSON.parse(fs.readFileSync(infraPackagePath, 'utf8'));
  assert.equal(
    infraPackage.scripts['authentik:dev:stop'],
    'docker compose --env-file dev/authentik/.env -f dev/authentik/compose.yml stop'
  );
});
