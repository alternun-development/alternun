#!/usr/bin/env node
// Alternun status checker — standalone HTTP service. Zero third-party deps.
//
// Serves:
//   GET /            -> self-contained status page (auto-refreshing)
//   GET /status.json -> latest computed status
//   GET /history.json-> recent checks (ring buffer on disk)
//   GET /healthz     -> service liveness
//
// Re-checks every CHECK_INTERVAL_MS in the background and persists to STATE_DIR.
// Env: PORT (default 8787), CHECK_INTERVAL_MS (default 60000), STATE_DIR (default ./state)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { checkAll } from './checker.mjs';
import { renderPage } from './page.mjs';

const PORT = Number(process.env.PORT || 8787);
const INTERVAL = Number(process.env.CHECK_INTERVAL_MS || 60000);
const STATE_DIR = process.env.STATE_DIR || path.join(process.cwd(), 'state');
const HISTORY_MAX = 500;

fs.mkdirSync(STATE_DIR, { recursive: true });
const LATEST = path.join(STATE_DIR, 'status.json');
const HISTORY = path.join(STATE_DIR, 'history.json');

let latest = safeRead(LATEST) || { overall: 'unknown', environments: {}, generatedAt: null };

function safeRead(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

async function runCheck() {
  try {
    latest = await checkAll();
    fs.writeFileSync(LATEST, JSON.stringify(latest, null, 2));
    const hist = safeRead(HISTORY) || [];
    hist.push({
      at: latest.generatedAt,
      overall: latest.overall,
      prod: latest.environments.prod?.status,
      dev: latest.environments.dev?.status,
    });
    fs.writeFileSync(HISTORY, JSON.stringify(hist.slice(-HISTORY_MAX)));
  } catch (e) {
    console.error('check failed:', e.message);
  }
}

function send(res, code, type, body) {
  res.writeHead(code, {
    'content-type': type,
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/healthz') return send(res, 200, 'application/json', JSON.stringify({ ok: true }));
  if (url === '/status.json') return send(res, 200, 'application/json', JSON.stringify(latest));
  if (url === '/history.json')
    return send(res, 200, 'application/json', JSON.stringify(safeRead(HISTORY) || []));
  if (url === '/') return send(res, 200, 'text/html; charset=utf-8', renderPage(latest, INTERVAL));
  return send(res, 404, 'application/json', JSON.stringify({ error: 'not found' }));
});

await runCheck();
setInterval(runCheck, INTERVAL);
server.listen(PORT, () => {
  console.log(`alternun status-checker on http://localhost:${PORT} (every ${INTERVAL}ms)`);
});
