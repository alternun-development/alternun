#!/usr/bin/env node

import { execSync } from 'child_process';
import readline from 'readline';

const REQUIRED_PORTS = {
  3000: 'Video Studio',
  5173: 'Admin Dashboard',
  8081: 'Mobile Web App',
  8082: 'API Server',
  8083: 'Documentation Site',
  3004: 'Remotion Composition (auto-detected)',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function checkPort(port) {
  try {
    const cmd = `lsof -i :${port} 2>/dev/null | grep LISTEN || netstat -tulpn 2>/dev/null | grep :${port} || true`;
    const result = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
    return result.length > 0;
  } catch {
    return false;
  }
}

function getProcessOnPort(port) {
  try {
    const result = execSync(`lsof -i :${port} 2>/dev/null | tail -1 | awk '{print $2}'`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();
    return result || null;
  } catch {
    return null;
  }
}

function killPort(port) {
  try {
    // Use fuser to kill all processes on port (most reliable method)
    try {
      execSync(`fuser -k ${port}/tcp 2>/dev/null`, { stdio: 'pipe' });
      console.log(`  ✅ Killed processes on port ${port}`);
      return true;
    } catch (e) {
      // fuser didn't work, try lsof method
      const lsofResult = execSync(`lsof -i :${port} 2>/dev/null | grep LISTEN | awk '{print $2}' | head -1`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      }).trim();

      const pid = lsofResult || getProcessOnPort(port);

      if (pid) {
        // Kill with SIGKILL
        try {
          execSync(`kill -9 ${pid} 2>/dev/null`, { stdio: 'pipe' });
          // Also kill any child processes
          execSync(`pkill -9 -P ${pid} 2>/dev/null`, { stdio: 'pipe' });
          console.log(`  ✅ Killed process on port ${port} (PID: ${pid})`);
          return true;
        } catch (e) {
          // Ignore errors
        }
      }
    }
  } catch (e) {
    // Silently fail
  }
  return false;
}

async function promptUser(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          Port Availability Check for Dev Environment          ║
╚════════════════════════════════════════════════════════════════╝
`);

  const usedPorts = [];
  const availablePorts = [];

  console.log('Checking required ports...\n');

  for (const [port, service] of Object.entries(REQUIRED_PORTS)) {
    const isInUse = checkPort(parseInt(port));
    const status = isInUse ? '❌ IN USE' : '✅ AVAILABLE';
    console.log(`  Port ${port.padEnd(5)} (${service.padEnd(30)}) ${status}`);

    if (isInUse) {
      usedPorts.push({ port: parseInt(port), service });
    } else {
      availablePorts.push({ port: parseInt(port), service });
    }
  }

  if (usedPorts.length === 0) {
    console.log(`
✅ All ports are available! Ready to start development.
`);
    rl.close();
    process.exit(0);
  }

  console.log(`
⚠️  Found ${usedPorts.length} port(s) in use:
`);

  usedPorts.forEach(({ port, service }) => {
    const pid = getProcessOnPort(port);
    console.log(`  • Port ${port} (${service})${pid ? ` - PID: ${pid}` : ''}`);
  });

  const shouldKill = await promptUser(`
Would you like me to kill these processes? (y/n): `);

  if (!shouldKill) {
    console.log('\n⚠️  Please free up the ports manually before starting development.\n');
    rl.close();
    process.exit(1);
  }

  console.log('\nKilling processes...\n');

  for (const { port, service } of usedPorts) {
    killPort(port);
  }

  // Verify ports are now free
  console.log('\nVerifying ports are now available...\n');

  let allKilled = true;
  for (const [port, service] of Object.entries(REQUIRED_PORTS)) {
    const portNum = parseInt(port);
    if (usedPorts.some((p) => p.port === portNum)) {
      const stillInUse = checkPort(portNum);
      const status = stillInUse ? '❌ STILL IN USE' : '✅ FREED';
      console.log(`  Port ${port.padEnd(5)} ${status}`);
      if (stillInUse) allKilled = false;
    }
  }

  if (allKilled) {
    console.log(`
✅ All ports cleared! Ready to start development.
Run: pnpm dev:all:video
`);
    rl.close();
    process.exit(0);
  } else {
    console.log(`
⚠️  Some ports are still in use. Please kill them manually and try again.
`);
    rl.close();
    process.exit(1);
  }
}

main().catch(console.error);
