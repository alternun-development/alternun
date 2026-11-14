#!/usr/bin/env python3
"""Build two HTML reports from a findings.json: executive (CEO) and technical (CTO).

Usage: python3 security/scripts/build-reports.py <findings.json> <out-dir>
Writes <out-dir>/report-exec.html and <out-dir>/report-tech.html.
No network, no secrets; pure transform of the audit JSON.
"""
import json
import sys
import html
from datetime import datetime

findings_path, out_dir = sys.argv[1], sys.argv[2]
doc = json.load(open(findings_path))
checks = doc["checks"]
summ = doc["summary"]
when = doc["generatedAt"]
date_label = when[:10]

SEV = {
    "crit": ("Crítico", "#d1403a", "#fbe7e6"),
    "warn": ("Atención", "#c47f12", "#faf0db"),
    "ok": ("OK", "#1f9d6b", "#e5f4ee"),
}

# Plain-language meaning per check id, keyed by status (ok vs not-ok), plus the
# technical "what to do". Keeps the exec sentence truthful in both states.
MEANING = {
    "C1": {"ok": "El perfil de revisor externo no puede convertirse en administrador.",
           "bad": "El perfil de revisor externo PODRÍA escalar privilegios.",
           "tech": "Simulación de 21 acciones de escalación (crear claves, adjuntar políticas, PassRole, AssumeRole, lanzar cómputo). Debe permanecer en 0 permitidas."},
    "C2": {"ok": "El revisor externo no puede leer secretos ni datos de clientes.",
           "bad": "El revisor externo PODRÍA leer secretos o datos.",
           "tech": "Lectura de secretos/datos/config con env vars debe dar explicitDeny para user/external-reviewer."},
    "C3a": {"ok": "Todos los administradores tienen segundo factor (MFA).",
            "bad": "Hay administradores que aún no tienen segundo factor (MFA).",
            "tech": "Enrolar un dispositivo MFA por cada admin listado. Acción manual en consola IAM por el propio usuario."},
    "C3b": {"ok": "Ninguna clave de acceso supera los 90 días sin rotar.",
            "bad": "Hay claves de acceso con más de 90 días sin rotar.",
            "tech": "Rotar cada clave listada: crear nueva, actualizar .env/CI, desactivar y borrar la vieja."},
    "C4": {"ok": "Las contraseñas de la cuenta tienen reglas mínimas de seguridad.",
           "bad": "La cuenta no tiene política de contraseñas.",
           "tech": "Política de contraseñas IAM (longitud, complejidad, caducidad, no-reuso) debe existir."},
    "C5": {"ok": "Solo las personas autorizadas pueden ver los secretos del sistema.",
           "bad": "Hay usuarios no autorizados que pueden ver los secretos del sistema.",
           "tech": "Usuarios NO admin, fuera de la allowlist, que pueden leer secretos (Lambda/CodeBuild/Secrets Manager). Debe ser cero."},
    "C6a": {"ok": "El repositorio de código es privado.",
            "bad": "El repositorio de código es público.",
            "tech": "Repo público: el código e infra quedan expuestos. Decidir si debe seguir público; los secretos nunca deben vivir en el código."},
    "C6b": {"ok": "No hay contraseñas ni llaves filtradas en el historial del código.",
            "bad": "Se detectaron posibles secretos en el historial del código.",
            "tech": "Escaneo del historial git: claves AWS (AKIA/ASIA), llaves privadas, tokens JWT. Debe ser cero."},
    "C7": {"ok": "La ventana de acceso del revisor externo está cerrada.",
           "bad": "La ventana de acceso del revisor externo sigue abierta.",
           "tech": "El acceso del revisor caduca el 2026-11-30. Rotar su clave y desactivar el usuario al cerrar."},
}

CSS = """
*{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,-apple-system,sans-serif;line-height:1.5;color:#16202b;background:#f4f6f8}
.wrap{max-width:720px;margin:0 auto;padding:28px 20px 56px}
h1{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;letter-spacing:-.02em;margin:0 0 4px}
.eyebrow{font-family:ui-monospace,monospace;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#5a6b7b}
.meta{font-family:ui-monospace,monospace;font-size:.76rem;color:#5a6b7b;margin:6px 0 20px}
.banner{border:1px solid #d9e0e8;border-left:5px solid var(--bc);background:#fff;border-radius:10px;padding:16px 18px;margin-bottom:22px}
.banner .tag{font-family:ui-monospace,monospace;font-size:.74rem;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:var(--bc)}
.counts{display:flex;gap:10px;margin:0 0 24px;flex-wrap:wrap}
.count{flex:1 1 90px;background:#fff;border:1px solid #d9e0e8;border-radius:10px;padding:12px 14px}
.count .n{font-family:'Space Grotesk',sans-serif;font-size:1.6rem;font-weight:600}
.count .l{font-size:.76rem;color:#5a6b7b}
.item{background:#fff;border:1px solid #d9e0e8;border-radius:10px;border-left:5px solid var(--sc);padding:14px 16px;margin-bottom:12px}
.item .top{display:flex;gap:10px;align-items:flex-start;justify-content:space-between}
.item h3{font-family:'Space Grotesk',sans-serif;font-size:1rem;margin:0}
.pill{font-family:ui-monospace,monospace;font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap;background:var(--pb);color:var(--sc)}
.item p{margin:6px 0 0;font-size:.9rem;color:#39485a}
.item .tech{font-family:ui-monospace,monospace;font-size:.8rem;color:#5a6b7b;margin-top:6px}
ul{margin:6px 0 0;padding-left:1.1rem;font-size:.88rem;color:#39485a}
footer{margin-top:28px;border-top:1px solid #d9e0e8;padding-top:14px;font-size:.78rem;color:#5a6b7b}
"""

def banner(audience):
    c = summ["crit"]; w = summ["warn"]
    if c:
        bc = "#d1403a"; tag = f"● {c} crítico(s) requieren acción"
    elif w:
        bc = "#c47f12"; tag = f"● Sin críticos · {w} punto(s) de atención"
    else:
        bc = "#1f9d6b"; tag = "● Todos los controles en verde"
    if audience == "exec":
        body = ("Estado de seguridad de los sistemas de Alternun. "
                + ("Hay puntos que requieren decisión o acción; abajo, en lenguaje claro."
                   if (c or w) else "Todos los controles críticos verificados pasan."))
    else:
        body = "Verificación automática semanal. Detalle técnico y acción responsable por hallazgo."
    return f'<div class="banner" style="--bc:{bc}"><span class="tag">{tag}</span><p style="margin:6px 0 0;color:#39485a;font-size:.9rem">{body}</p></div>'

def counts():
    out = '<div class="counts">'
    for key, lbl in (("crit", "Críticos"), ("warn", "Atención"), ("ok", "OK")):
        col = SEV[key][1]
        out += f'<div class="count"><div class="n" style="color:{col}">{summ[key]}</div><div class="l">{lbl}</div></div>'
    return out + "</div>"

def render(audience):
    rows = ""
    for c in checks:
        name, sc, pb = SEV[c["status"]]
        m = MEANING.get(c["id"], {})
        plain = m.get("ok" if c["status"] == "ok" else "bad", c["title"])
        tech = m.get("tech", c["detail"])
        lst = ""
        if c.get("list"):
            items = "".join(f"<li>{html.escape(str(x))}</li>" for x in c["list"])
            lst = f"<ul>{items}</ul>"
        if audience == "exec":
            # executive: plain meaning + status, hide raw command detail
            body = f'<p>{html.escape(plain)}</p>'
            title = c["title"]
        else:
            # technical: title + plain + raw detail + what to do
            body = f'<p>{html.escape(plain)}</p><div class="tech">{html.escape(c["detail"])}</div><p style="margin-top:6px"><b>Acción:</b> {html.escape(tech)}</p>{lst}'
            title = f'{c["id"]} · {c["title"]}'
        rows += (f'<div class="item" style="--sc:{sc};--pb:{pb}">'
                 f'<div class="top"><h3>{html.escape(title)}</h3>'
                 f'<span class="pill">{name}</span></div>{body}</div>')
    who = "Resumen ejecutivo · CEO" if audience == "exec" else "Informe técnico · CTO"
    return f"""<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<title>Seguridad Alternun — {date_label}</title><style>{CSS}</style></head>
<body><div class="wrap">
<span class="eyebrow">Auditoría de seguridad AWS · {who}</span>
<h1>Estado de seguridad — {date_label}</h1>
<div class="meta">Cuenta 124120088516 · {html.escape(when)} · generado automáticamente</div>
{banner(audience)}{counts()}{rows}
<footer>Verificación automática semanal (lunes 11:11 COT). Solo lectura: no modifica la cuenta. Hallazgos ordenados por severidad. Fuente: findings.json de esta corrida.</footer>
</div></body></html>"""

for audience, fname in (("exec", "report-exec.html"), ("tech", "report-tech.html")):
    open(f"{out_dir}/{fname}", "w").write(render(audience))
    print("wrote", f"{out_dir}/{fname}")
