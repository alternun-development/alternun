#!/usr/bin/env python3
"""Email the audit reports via the Tláo SMTP secret.

Executive report -> CEO, technical report -> CTO (both get both as attachments,
but the body is the audience-specific one).

Usage:
  python3 security/scripts/send-reports.py <audit-dir> \
      --ceo <ceo-email> --cto <cto-email> [--dry-run]

Reads SMTP settings from AWS Secrets Manager (alternun/tlao/smtp). Sends nothing
with --dry-run. No secret values are printed.
"""
import argparse
import json
import smtplib
import ssl
import subprocess
import sys
from email.message import EmailMessage

SECRET_ID = "alternun/tlao/smtp"


def load_smtp():
    raw = subprocess.check_output(
        ["aws", "secretsmanager", "get-secret-value", "--secret-id", SECRET_ID,
         "--query", "SecretString", "--output", "text"]
    )
    return json.loads(raw)


def truthy(v):
    return str(v).strip().lower() in ("1", "true", "yes", "on")


def html_to_text(html_doc):
    """A readable plain-text fallback so the message is not HTML-only (helps deliverability)."""
    import re
    t = re.sub(r"(?is)<(script|style).*?</\1>", "", html_doc)
    t = re.sub(r"(?i)</(p|div|h[1-6]|li|tr|section)>", "\n", t)
    t = re.sub(r"(?i)<li[^>]*>", " - ", t)
    t = re.sub(r"<[^>]+>", "", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return (t.strip() or "Informe de seguridad Alternun.")


def build(audience_html, subject, from_addr, sender_name, to_addr, attachments, text_body=None):
    from email.utils import formatdate, make_msgid
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{sender_name} <{from_addr}>" if sender_name else from_addr
    msg["To"] = to_addr
    msg["Reply-To"] = from_addr
    msg["Date"] = formatdate(localtime=True)
    # Message-ID domain must match the From domain for DKIM/DMARC-friendly hygiene.
    msg["Message-ID"] = make_msgid(domain=from_addr.split("@")[-1])
    msg["Auto-Submitted"] = "auto-generated"  # it is an automated report, declare it honestly
    msg.set_content(text_body or html_to_text(audience_html))
    msg.add_alternative(audience_html, subtype="html")
    for name, data in attachments:
        msg.add_attachment(data.encode("utf-8"), maintype="text", subtype="html", filename=name)
    return msg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audit_dir")
    ap.add_argument("--ceo", required=True)
    ap.add_argument("--cto", required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    d = args.audit_dir.rstrip("/")
    exec_html = open(f"{d}/report-exec.html").read()
    tech_html = open(f"{d}/report-tech.html").read()
    findings = json.load(open(f"{d}/findings.json"))
    date_label = findings["generatedAt"][:10]
    s = findings["summary"]
    tag = (f"{s['crit']} críticos" if s["crit"]
           else (f"{s['warn']} en atención" if s["warn"] else "todo OK"))

    smtp = load_smtp()
    from_addr = smtp.get("from") or smtp.get("username")
    sender = smtp.get("senderName", "Alternun Security")
    host, port = smtp["host"], int(smtp.get("port", 587))

    jobs = [
        (args.ceo, f"[Seguridad Alternun] Resumen ejecutivo — {date_label} ({tag})",
         exec_html, [(f"seguridad-ejecutivo-{date_label}.html", exec_html),
                     (f"seguridad-tecnico-{date_label}.html", tech_html)]),
        (args.cto, f"[Seguridad Alternun] Informe técnico — {date_label} ({tag})",
         tech_html, [(f"seguridad-tecnico-{date_label}.html", tech_html),
                     (f"seguridad-ejecutivo-{date_label}.html", exec_html)]),
    ]

    if args.dry_run:
        print(f"[dry-run] SMTP {host}:{port} as {from_addr}")
        for to, subj, _, att in jobs:
            print(f"[dry-run] -> {to} | {subj} | {len(att)} adjuntos")
        return

    ctx = ssl.create_default_context()
    if truthy(smtp.get("secure")):
        server = smtplib.SMTP_SSL(host, port, context=ctx)
    else:
        server = smtplib.SMTP(host, port)
        if truthy(smtp.get("useTls", True)) or truthy(smtp.get("requireTls", True)):
            server.starttls(context=ctx)
    try:
        server.login(smtp["username"], smtp["password"])
        for to, subj, body, att in jobs:
            server.send_message(build(body, subj, from_addr, sender, to, att))
            print(f"sent -> {to}")
    finally:
        server.quit()


if __name__ == "__main__":
    main()
