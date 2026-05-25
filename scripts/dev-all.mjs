#!/usr/bin/env node

import { spawn, spawnSync } from 'child_process';
import { execSync } from 'child_process';

const includeVideoStudio = process.argv.includes('--video-studio');

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
const names = services.map(s => s.name).join(',');
const colors = services.map(s => s.color).join(',');
const commands = services.map(s => `pnpm --filter ${s.filter} run ${s.script}`);

console.log(`🚀 Checking port availability...`);
if (!checkPorts()) {
  console.error('\n❌ Port check failed. Aborting dev server startup.');
  process.exit(1);
}

console.log(`\n🚀 Starting dev servers${includeVideoStudio ? ' (including video-studio)' : ''}...\n`);

// Build command line
const concurrentlyArgs = [
  '-k',
  '--names', names,
  '--prefix-colors', colors,
  ...commands
];

const child = spawn('npx', ['concurrently', ...concurrentlyArgs], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
  process.exit(0);
});

child.on('exit', (code) => {
  process.exit(code);
});
