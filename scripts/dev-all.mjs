#!/usr/bin/env node

import { spawn, spawnSync } from 'child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const includeVideoStudio = process.argv.includes('--video-studio');
let authentikStarted = false;
let child = null;

function runAuthentik(command) {
  const result = spawnSync(
    'pnpm',
    ['--filter', '@alternun/infra', 'run', `authentik:dev:${command}`],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
    }
  );

  if (result.status !== 0) {
    throw new Error(`Local Authentik command failed: authentik:dev:${command}`);
  }
}

function stopAuthentik() {
  if (!authentikStarted) {
    return;
  }

  runAuthentik('stop');
  authentikStarted = false;
}

function startAuthentik() {
  const authentikEnvPath = path.join(
    process.cwd(),
    'packages',
    'infra',
    'dev',
    'authentik',
    '.env'
  );

  if (!existsSync(authentikEnvPath)) {
    console.log('🔐 Initializing isolated local Authentik credentials...');
    runAuthentik('init');
  }

  console.log('🔐 Starting isolated local Authentik...');
  // Claim cleanup ownership before Compose can partially start or be interrupted.
  authentikStarted = true;
  runAuthentik('up');
}

// Check and optionally kill conflicting ports first
function checkPorts() {
  try {
    const result = spawnSync('node', ['scripts/check-ports.mjs'], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    return result.status === 0;
  } catch (e) {
    console.error('Error checking ports:', e.message);
    return false;
  }
}

// Base services
const services = [
  {
    name: 'api',
    color: 'blue',
    filter: '@alternun/api',
    script: 'dev',
  },
  {
    name: 'admin',
    color: 'green',
    filter: '@alternun/admin',
    script: 'dev:local',
  },
  {
    name: 'mobile',
    color: 'magenta',
    filter: './apps/mobile',
    script: 'web:local:app',
  },
  {
    name: 'docs',
    color: 'cyan',
    filter: 'alternun-docs',
    script: 'dev:local',
  },
];

// Add video-studio if requested
if (includeVideoStudio) {
  services.push({
    name: 'video',
    color: 'yellow',
    filter: '@alternun/video-studio',
    script: 'dev',
  });
}

// Build concurrently command
const names = services.map((s) => s.name).join(',');
const colors = services.map((s) => s.color).join(',');
const commands = services.map((s) => `pnpm --filter ${s.filter} run ${s.script}`);

console.log(`🚀 Checking port availability...`);
if (!checkPorts()) {
  console.error('\n❌ Port check failed. Aborting dev server startup.');
  process.exit(1);
}

console.log(
  `\n🚀 Starting dev servers${includeVideoStudio ? ' (including video-studio)' : ''}...\n`
);

function stopDevServers(signal) {
  child?.kill(signal);

  try {
    stopAuthentik();
  } catch (error) {
    console.error(`\n❌ ${error.message}`);
    process.exit(1);
  }

  process.exit(0);
}

process.on('SIGINT', () => {
  stopDevServers('SIGINT');
});

process.on('SIGTERM', () => {
  stopDevServers('SIGTERM');
});

try {
  startAuthentik();
} catch (error) {
  try {
    stopAuthentik();
  } catch (cleanupError) {
    console.error(`\n❌ ${cleanupError.message}`);
  }
  console.error(`\n❌ ${error.message}`);
  process.exit(1);
}

// Build command line
const concurrentlyArgs = ['-k', '--names', names, '--prefix-colors', colors, ...commands];

child = spawn('npx', ['concurrently', ...concurrentlyArgs], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

child.on('exit', (code) => {
  try {
    stopAuthentik();
  } catch (error) {
    console.error(`\n❌ ${error.message}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});
