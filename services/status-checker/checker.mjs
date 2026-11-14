// Alternun status checker — core probe + status logic. Zero third-party deps (Node builtins only).
import https from 'node:https';
import http from 'node:http';

/** Surfaces to monitor. Edit here to add an environment or endpoint. */
export const SURFACES = [
  { env: 'prod', name: 'API', url: 'https://api.alternun.co/health', expectVersion: true },
  { env: 'prod', name: 'Admin', url: 'https://admin.alternun.co', expectVersion: false },
  { env: 'prod', name: 'SSO', url: 'https://sso.alternun.co/-/health/live/', expectVersion: false },
  { env: 'dev', name: 'API', url: 'https://testnet.api.alternun.co/health', expectVersion: true },
  { env: 'dev', name: 'Admin', url: 'https://testnet.admin.alternun.co', expectVersion: false },
  { env: 'dev', name: 'SSO', url: 'https://testnet.sso.alternun.co/-/health/live/', expectVersion: false },
];

/** Status thresholds (ms). */
const SLOW_MS = 2000;
const TIMEOUT_MS = 12000;

export const STATUS_RANK = { up: 0, slow: 1, degraded: 2, down: 3 };

/** One HTTP(S) GET with timing, no redirects followed (a redirect is a signal). */
function probeOnce(url) {
  const lib = url.startsWith('https:') ? https : http;
  const started = Date.now();
  return new Promise((resolve) => {
    const req = lib.get(
      url,
      { timeout: TIMEOUT_MS, headers: { 'user-agent': 'alternun-status-checker' } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => {
          if (chunks.length < 32) chunks.push(c); // cap body read
        });
        res.on('end', () =>
          resolve({ code: res.statusCode ?? 0, ms: Date.now() - started, body: Buffer.concat(chunks).toString('utf8') })
        );
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ code: 0, ms: Date.now() - started, body: '', error: 'timeout' });
    });
    req.on('error', (e) => resolve({ code: 0, ms: Date.now() - started, body: '', error: e.code || e.message }));
  });
}

function classify(code, ms) {
  if (code === 0 || code >= 500) return 'down';
  if (code >= 300) return 'degraded';
  if (ms >= SLOW_MS) return 'slow';
  return 'up';
}

function readVersion(body) {
  try {
    return JSON.parse(body).version ?? null;
  } catch {
    return null;
  }
}

/** Probe every surface once and compute per-environment + overall status. */
export async function checkAll() {
  const surfaces = await Promise.all(
    SURFACES.map(async (s) => {
      const r = await probeOnce(s.url);
      return {
        env: s.env,
        name: s.name,
        url: s.url,
        code: r.code,
        ms: r.ms,
        status: classify(r.code, r.ms),
        error: r.error ?? null,
        version: s.expectVersion ? readVersion(r.body) : null,
      };
    })
  );

  const environments = {};
  for (const env of ['prod', 'dev']) {
    const items = surfaces.filter((s) => s.env === env);
    const worst = items.reduce((a, b) => (STATUS_RANK[b.status] > STATUS_RANK[a] ? STATUS_RANK[b.status] : a), 0);
    const status = Object.keys(STATUS_RANK).find((k) => STATUS_RANK[k] === worst) ?? 'up';
    environments[env] = {
      status,
      apiVersion: items.find((s) => s.name === 'API')?.version ?? null,
      surfaces: items,
    };
  }

  const pv = environments.prod.apiVersion;
  const dv = environments.dev.apiVersion;
  const overall = Object.values(environments).every((e) => e.status === 'up') ? 'up' : 'attention';

  return {
    generatedAt: new Date().toISOString(),
    overall,
    environments,
    versionDrift: { prod: pv, dev: dv, differs: Boolean(pv && dv && pv !== dv) },
  };
}
