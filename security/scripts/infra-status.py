#!/usr/bin/env python3
"""Probe prod + development infra surfaces, compute a status per environment, and
render a clean, self-explanatory topological SVG for embedding in the email.

Usage: python3 security/scripts/infra-status.py <out-dir>
Writes <out-dir>/infra-status.json and <out-dir>/infra-status.svg.
Read-only: HTTP GETs to public health endpoints only.

Status criteria (per surface):
  up        HTTP 200 and latency < 2.0s
  slow      HTTP 200 and latency >= 2.0s
  degraded  HTTP 3xx/4xx
  down      HTTP 5xx / 000 / timeout
Environment status = worst surface status, plus a 'drift' note when prod and dev
API versions differ.
"""
import json
import sys
import time
import urllib.request

OUT_DIR = sys.argv[1] if len(sys.argv) > 1 else "."
SLOW_S = 2.0

SURFACES = [
    ("prod", "API", "https://api.alternun.co/health", True),
    ("prod", "Admin", "https://admin.alternun.co", False),
    ("prod", "SSO", "https://sso.alternun.co/-/health/live/", False),
    ("dev", "API", "https://testnet.api.alternun.co/health", True),
    ("dev", "Admin", "https://testnet.admin.alternun.co", False),
    ("dev", "SSO", "https://testnet.sso.alternun.co/-/health/live/", False),
]

RANK = {"up": 0, "slow": 1, "degraded": 2, "down": 3}
COLOR = {"up": "#1f9d6b", "slow": "#c47f12", "degraded": "#d1792a", "down": "#d1403a"}
LABEL = {"up": "OK", "slow": "Lento", "degraded": "Degradado", "down": "Caído"}


def probe(url, want_version):
    t0 = time.time()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "alternun-infra-status"})
        with urllib.request.urlopen(req, timeout=12) as r:
            body = r.read(4096)
            code = r.status
            dt = time.time() - t0
    except urllib.error.HTTPError as e:  # noqa
        code = e.code
        dt = time.time() - t0
        body = b""
    except Exception:
        return {"code": 0, "ms": None, "status": "down", "version": None}
    version = None
    if want_version:
        try:
            version = json.loads(body.decode()).get("version")
        except Exception:
            version = None
    if code >= 500 or code == 0:
        st = "down"
    elif code >= 300:
        st = "degraded"
    elif dt >= SLOW_S:
        st = "slow"
    else:
        st = "up"
    return {"code": code, "ms": round(dt * 1000), "status": st, "version": version}


def main():
    results = []
    for env, surf, url, wv in SURFACES:
        r = probe(url, wv)
        results.append({"env": env, "surface": surf, "url": url, **r})

    envs = {}
    for env in ("prod", "dev"):
        items = [r for r in results if r["env"] == env]
        worst = max(items, key=lambda r: RANK[r["status"]])["status"]
        api_ver = next((r["version"] for r in items if r["surface"] == "API"), None)
        envs[env] = {"status": worst, "apiVersion": api_ver, "surfaces": items}

    prod_v = envs["prod"]["apiVersion"]
    dev_v = envs["dev"]["apiVersion"]
    drift = bool(prod_v and dev_v and prod_v != dev_v)

    doc = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "environments": envs,
        "versionDrift": {"prod": prod_v, "dev": dev_v, "differs": drift},
        "overall": "up" if all(envs[e]["status"] == "up" for e in envs) else "attention",
    }
    json.dump(doc, open(f"{OUT_DIR}/infra-status.json", "w"), ensure_ascii=False, indent=2)
    open(f"{OUT_DIR}/infra-status.svg", "w").write(render_svg(doc))
    print("wrote infra-status.json / .svg ::", {e: envs[e]["status"] for e in envs},
          "drift" if drift else "no-drift")


def render_svg(doc):
    """Topological map: viewer -> edge -> [API, Admin, SSO] -> DB, one column per env."""
    W, H = 760, 430
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
           f'font-family="Inter,Segoe UI,Arial,sans-serif" width="100%" style="max-width:{W}px">']
    svg.append(f'<rect x="0" y="0" width="{W}" height="{H}" rx="14" fill="#0d1218"/>')
    svg.append(f'<text x="24" y="34" fill="#e6edf3" font-size="18" font-weight="700">'
               f'Topología de infraestructura — estado</text>')
    svg.append(f'<text x="24" y="54" fill="#93a3b4" font-size="12">Generado {doc["generatedAt"]} · '
               f'prueba de salud en vivo de cada superficie</text>')

    cols = {"prod": 250, "dev": 560}
    for env, cx in cols.items():
        e = doc["environments"][env]
        head = "Producción" if env == "prod" else "Development (testnet)"
        ec = COLOR[e["status"]]
        svg.append(f'<text x="{cx}" y="92" fill="#e6edf3" font-size="14" font-weight="700" '
                   f'text-anchor="middle">{head}</text>')
        svg.append(f'<rect x="{cx-70}" y="100" width="140" height="22" rx="11" fill="{ec}22" '
                   f'stroke="{ec}"/>')
        svg.append(f'<text x="{cx}" y="115" fill="{ec}" font-size="11" font-weight="700" '
                   f'text-anchor="middle">ENTORNO: {LABEL[e["status"]].upper()}'
                   f'{" · v"+e["apiVersion"] if e["apiVersion"] else ""}</text>')
        y = 160
        for s in e["surfaces"]:
            c = COLOR[s["status"]]
            svg.append(f'<line x1="{cx}" y1="134" x2="{cx}" y2="{y}" stroke="#27333f" stroke-width="2"/>')
            svg.append(f'<rect x="{cx-100}" y="{y}" width="200" height="54" rx="10" '
                       f'fill="#151d26" stroke="{c}" stroke-width="2"/>')
            svg.append(f'<circle cx="{cx-84}" cy="{y+27}" r="6" fill="{c}"/>')
            svg.append(f'<text x="{cx-68}" y="{y+22}" fill="#e6edf3" font-size="13" '
                       f'font-weight="600">{s["surface"]}</text>')
            ms = f'{s["ms"]} ms' if s["ms"] is not None else "sin respuesta"
            svg.append(f'<text x="{cx-68}" y="{y+40}" fill="#93a3b4" font-size="11">'
                       f'HTTP {s["code"]} · {ms} · {LABEL[s["status"]]}</text>')
            y += 72

    # viewer node feeding both columns
    svg.append(f'<rect x="{W/2-60}" y="134" width="120" height="0" />')
    # version drift banner
    d = doc["versionDrift"]
    if d["differs"]:
        svg.append(f'<rect x="24" y="{H-40}" width="{W-48}" height="26" rx="8" '
                   f'fill="#c47f1222" stroke="#c47f12"/>')
        svg.append(f'<text x="{W/2}" y="{H-22}" fill="#e0a53c" font-size="12" '
                   f'text-anchor="middle">Drift de versión: prod v{d["prod"]} vs dev v{d["dev"]} '
                   f'— hay cambios en development sin promover a producción</text>')
    svg.append('</svg>')
    return "".join(svg)


if __name__ == "__main__":
    main()
