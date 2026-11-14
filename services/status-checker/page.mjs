// Alternun status checker — server-rendered status page. Zero third-party deps.
const COLOR = { up: '#1f9d6b', slow: '#c47f12', degraded: '#d1792a', down: '#d1403a', unknown: '#5a6b7b' };
const LABEL = { up: 'OK', slow: 'Lento', degraded: 'Degradado', down: 'Caído', unknown: '—' };
const ENVNAME = { prod: 'Producción', dev: 'Development (testnet)' };

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function surfaceRow(s) {
  const c = COLOR[s.status] || COLOR.unknown;
  const ms = s.ms != null ? `${s.ms} ms` : '—';
  return `<div class="surf"><span class="dot" style="background:${c}"></span>
    <span class="nm">${esc(s.name)}</span>
    <span class="mu">HTTP ${esc(s.code)} · ${ms} · ${LABEL[s.status] || '—'}</span></div>`;
}

function envCard(key, env) {
  if (!env) return '';
  const c = COLOR[env.status] || COLOR.unknown;
  const ver = env.apiVersion ? `API v${esc(env.apiVersion)}` : '';
  return `<div class="env"><h2>${ENVNAME[key]}
    <span class="chip" style="background:${c}22;color:${c};border:1px solid ${c}">${LABEL[env.status] || '—'}</span></h2>
    <div class="ver">${ver}</div>
    ${(env.surfaces || []).map(surfaceRow).join('')}</div>`;
}

export function renderPage(data, intervalMs) {
  const envs = data.environments || {};
  const overallColor = data.overall === 'up' ? COLOR.up : data.overall === 'unknown' ? COLOR.unknown : COLOR.slow;
  const overallLabel =
    data.overall === 'up' ? 'Todo operativo' : data.overall === 'unknown' ? 'Sin datos aún' : 'Atención';
  const d = data.versionDrift || {};
  const drift =
    d.differs
      ? `<div class="drift"><b>Drift de versión:</b> producción v${esc(d.prod)} vs development v${esc(
          d.dev
        )} — hay cambios en development sin promover a producción.</div>`
      : '';
  const stamp = data.generatedAt ? new Date(data.generatedAt).toLocaleString() : '—';
  const refreshS = Math.max(15, Math.round((intervalMs || 60000) / 1000));

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Estado Alternun</title>
<style>
  :root{--bg:#f4f6f8;--surface:#fff;--fg:#16202b;--muted:#5a6b7b;--line:#d9e0e8;--ok:#1f9d6b;--warn:#c47f12;
    --sans:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
  @media (prefers-color-scheme:dark){:root{--bg:#0d1218;--surface:#151d26;--fg:#e6edf3;--muted:#93a3b4;--line:#27333f}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--sans);line-height:1.5}
  .wrap{max-width:900px;margin:0 auto;padding:28px 18px 56px}
  h1{font-size:1.5rem;margin:0 0 2px;letter-spacing:-.01em}
  .eyebrow{font-family:var(--mono);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  .bar{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin:10px 0 22px;font-family:var(--mono);font-size:.8rem;color:var(--muted)}
  .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:middle}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
  .env{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
  .env h2{font-size:1.05rem;margin:0 0 4px;display:flex;justify-content:space-between;align-items:center;gap:8px}
  .chip{font-family:var(--mono);font-size:.66rem;letter-spacing:.06em;text-transform:uppercase;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap}
  .ver{font-family:var(--mono);font-size:.74rem;color:var(--muted);margin-bottom:10px}
  .surf{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line)}
  .surf:first-of-type{border-top:none}.surf .nm{font-weight:600}
  .surf .mu{font-family:var(--mono);font-size:.74rem;color:var(--muted);margin-left:auto;text-align:right}
  .drift{margin-top:18px;border:1px solid var(--warn);background:color-mix(in srgb,var(--warn) 12%,transparent);
    color:var(--warn);border-radius:10px;padding:12px 14px;font-size:.88rem}
  footer{margin-top:24px;border-top:1px solid var(--line);padding-top:14px;color:var(--muted);font-size:.78rem}
</style>
<meta http-equiv="refresh" content="${refreshS}"></head>
<body><div class="wrap">
  <span class="eyebrow">Alternun · servicio de estado</span>
  <h1>Estado de la infraestructura</h1>
  <div class="bar">
    <span><span class="dot" style="background:${overallColor}"></span>${overallLabel}</span>
    <span>actualizado ${esc(stamp)}</span>
    <span style="margin-left:auto">se actualiza cada ${refreshS}s</span>
  </div>
  <div class="grid">${envCard('prod', envs.prod)}${envCard('dev', envs.dev)}</div>
  ${drift}
  <footer>Servicio propio de Alternun (sin terceros). Criterios: OK &lt;2s · Lento ≥2s · Degradado 3xx/4xx · Caído 5xx/timeout.
  Datos: <a href="/status.json">/status.json</a> · <a href="/history.json">/history.json</a> · <a href="/healthz">/healthz</a>.</footer>
</div></body></html>`;
}
