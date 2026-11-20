#!/usr/bin/env bash
# Weekly AWS security audit — reusable verification loop.
#
# Runs the critical read-only checks surfaced in the 2026-11-14 review and writes a
# findings JSON. Does NOT change anything. Used by the generator + mailer and by the
# weekly GitHub Action.
#
# Requires: AWS credentials with ViewOnly/SecurityAudit (read-only), python3, git.
# Usage: bash security/scripts/run-audit.sh [output-dir]
set -euo pipefail

ACCOUNT_EXPECTED="124120088516"
REPO_SLUG="alternun-development/alternun"
REVIEWER_USER="external-reviewer"
REVIEW_WINDOW_END="2026-11-30T23:59:59Z"
# Non-admin users intentionally allowed to read secrets (authorized reviewers).
SECRET_READER_ALLOWLIST="sgomez"

STAMP="$(date -u +%F)"
OUT_DIR="${1:-security/audits/${STAMP}}"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/findings.json"

j() { python3 -c "import json,sys;print(json.dumps(sys.argv[1]))" "$1"; }

# --- identity guard: never run against the wrong account -----------------------
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
if [ "$ACCOUNT" != "$ACCOUNT_EXPECTED" ]; then
  echo "ERROR: wrong AWS account ($ACCOUNT, expected $ACCOUNT_EXPECTED)" >&2
  exit 1
fi

findings_py=$(mktemp)
trap 'rm -f "$findings_py"' EXIT

# ---------------------------------------------------------------------------
# CHECK 1 — reviewer principal cannot escalate privileges
# ---------------------------------------------------------------------------
PRIVESC_ACTIONS="iam:CreateAccessKey iam:CreateLoginProfile iam:AttachUserPolicy iam:AttachGroupPolicy iam:AttachRolePolicy iam:PutUserPolicy iam:PutGroupPolicy iam:PutRolePolicy iam:CreatePolicyVersion iam:SetDefaultPolicyVersion iam:CreateUser iam:AddUserToGroup iam:CreateRole iam:UpdateAssumeRolePolicy iam:PassRole sts:AssumeRole lambda:CreateFunction lambda:UpdateFunctionCode ec2:RunInstances cloudformation:CreateStack ssm:SendCommand"
PRIVESC_ALLOWED="$(aws iam simulate-principal-policy \
  --policy-source-arn "arn:aws:iam::${ACCOUNT}:user/${REVIEWER_USER}" \
  --action-names $PRIVESC_ACTIONS \
  --query "length(EvaluationResults[?EvalDecision=='allowed'])" --output text 2>/dev/null || echo "ERR")"
PRIVESC_TOTAL="$(echo $PRIVESC_ACTIONS | wc -w | tr -d ' ')"

# ---------------------------------------------------------------------------
# CHECK 2 — reviewer sensitive reads are denied
# ---------------------------------------------------------------------------
DENY_ACTIONS="secretsmanager:GetSecretValue ssm:GetParameter kms:Decrypt s3:GetObject lambda:GetFunctionConfiguration codebuild:BatchGetProjects cloudformation:GetTemplate"
DENY_NOTDENIED="$(aws iam simulate-principal-policy \
  --policy-source-arn "arn:aws:iam::${ACCOUNT}:user/${REVIEWER_USER}" \
  --action-names $DENY_ACTIONS \
  --query "length(EvaluationResults[?EvalDecision!='explicitDeny'])" --output text 2>/dev/null || echo "ERR")"

# ---------------------------------------------------------------------------
# CHECK 3 — admins without MFA  +  access keys older than 90 days
# ---------------------------------------------------------------------------
ADMIN_NO_MFA="[]"
OLD_KEYS="[]"
ADMIN_NO_MFA="$(python3 - <<PY
import json,subprocess
def aws(*a): return json.loads(subprocess.check_output(['aws',*a,'--output','json']))
admins=set()
for g in aws('iam','list-groups','--query','Groups[].GroupName')['']if False else aws('iam','list-groups')['Groups']:
    for p in aws('iam','list-attached-group-policies','--group-name',g['GroupName'])['AttachedPolicies']:
        if p['PolicyName']=='AdministratorAccess':
            for u in aws('iam','get-group','--group-name',g['GroupName'])['Users']: admins.add(u['UserName'])
for u in aws('iam','list-users')['Users']:
    for p in aws('iam','list-attached-user-policies','--user-name',u['UserName'])['AttachedPolicies']:
        if p['PolicyName']=='AdministratorAccess': admins.add(u['UserName'])
no_mfa=[u for u in sorted(admins) if not aws('iam','list-mfa-devices','--user-name',u)['MFADevices']]
print(json.dumps(no_mfa))
PY
)"
OLD_KEYS="$(python3 - <<PY
import json,subprocess,datetime
def aws(*a): return json.loads(subprocess.check_output(['aws',*a,'--output','json']))
now=datetime.datetime.now(datetime.timezone.utc); old=[]
for u in aws('iam','list-users')['Users']:
    for k in aws('iam','list-access-keys','--user-name',u['UserName'])['AccessKeyMetadata']:
        if k['Status']!='Active': continue
        age=(now-datetime.datetime.fromisoformat(k['CreateDate'])).days
        if age>90: old.append({'user':u['UserName'],'ageDays':age})
print(json.dumps(old))
PY
)"

# ---------------------------------------------------------------------------
# CHECK 4 — account password policy exists
# ---------------------------------------------------------------------------
if aws iam get-account-password-policy >/dev/null 2>&1; then PWPOLICY="present"; else PWPOLICY="MISSING"; fi

# ---------------------------------------------------------------------------
# CHECK 5 — who can read secrets (non-admin principals without the deny)
# ---------------------------------------------------------------------------
SECRET_READERS="$(python3 - <<PY
import json,subprocess
def aws(*a): return json.loads(subprocess.check_output(['aws',*a,'--output','json']))
allow=set(filter(None,"$SECRET_READER_ALLOWLIST".split()))
risky=[]
for u in aws('iam','list-users')['Users']:
    name=u['UserName']
    if name in allow: continue  # authorized secret reader (e.g. sgomez)
    r=aws('iam','simulate-principal-policy','--policy-source-arn',u['Arn'],
          '--action-names','lambda:GetFunctionConfiguration','codebuild:BatchGetProjects','secretsmanager:GetSecretValue')
    allowed=[e['EvalActionName'] for e in r['EvaluationResults'] if e['EvalDecision']=='allowed']
    # admins are expected to read; flag only NON-admin users that can read
    is_admin=any(p['PolicyName']=='AdministratorAccess' for p in aws('iam','list-attached-user-policies','--user-name',name)['AttachedPolicies'])
    if allowed and not is_admin: risky.append({'user':name,'canRead':allowed})
print(json.dumps(risky))
PY
)"

# ---------------------------------------------------------------------------
# CHECK 6 — repo visibility + git-history secret scan
# ---------------------------------------------------------------------------
REPO_VIS="$(gh repo view "$REPO_SLUG" --json visibility --jq .visibility 2>/dev/null || echo unknown)"
# Exclude the audit's own files: they legitimately contain example key patterns
# (AKIA..., BEGIN PRIVATE KEY in the scanner, JWT samples in the report) and would
# otherwise make the scanner flag itself.
HIST_LOG="$(git log -p --all -- . ':(exclude)security/' 2>/dev/null | tr -d '\000' || true)"
HIST_AKIA="$(printf '%s' "$HIST_LOG" | grep -oE 'A(KIA|SIA)[0-9A-Z]{16}' | sort -u | wc -l | tr -d ' ' || true)"
HIST_PK="$(printf '%s' "$HIST_LOG" | grep -c 'BEGIN .*PRIVATE KEY' || true)"
HIST_JWT="$(printf '%s' "$HIST_LOG" | grep -oE 'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}' | sort -u | wc -l | tr -d ' ' || true)"
HIST_AKIA="${HIST_AKIA:-0}"; HIST_PK="${HIST_PK:-0}"; HIST_JWT="${HIST_JWT:-0}"

# ---------------------------------------------------------------------------
# CHECK 7 — reviewer access window still open?
# ---------------------------------------------------------------------------
WINDOW_OPEN="$([ "$(date -u +%s)" -lt "$(date -u -d "$REVIEW_WINDOW_END" +%s 2>/dev/null || echo 0)" ] && echo true || echo false)"

# ---------------------------------------------------------------------------
# emit findings.json
# ---------------------------------------------------------------------------
python3 - "$OUT" <<PY
import json,sys,datetime
out=sys.argv[1]
def sev(ok): return 'ok' if ok else 'crit'
checks=[
 {"id":"C1","title":"Reviewer no puede escalar privilegios",
  "status": sev("$PRIVESC_ALLOWED"=="0"),
  "detail": "0 de $PRIVESC_TOTAL acciones de escalación permitidas" if "$PRIVESC_ALLOWED"=="0" else "$PRIVESC_ALLOWED de $PRIVESC_TOTAL acciones de escalación PERMITIDAS",
  "metric": "$PRIVESC_ALLOWED/$PRIVESC_TOTAL"},
 {"id":"C2","title":"Lectura de secretos del reviewer denegada",
  "status": sev("$DENY_NOTDENIED"=="0"),
  "detail": "todas con explicitDeny" if "$DENY_NOTDENIED"=="0" else "$DENY_NOTDENIED acciones sensibles NO denegadas"},
 {"id":"C3a","title":"Admins sin MFA",
  "status": "ok" if json.loads('''$ADMIN_NO_MFA''')==[] else "warn",
  "detail": ("todos los admins con MFA" if json.loads('''$ADMIN_NO_MFA''')==[] else "sin MFA: "+", ".join(json.loads('''$ADMIN_NO_MFA'''))),
  "list": json.loads('''$ADMIN_NO_MFA''')},
 {"id":"C3b","title":"Claves de acceso > 90 días",
  "status": "ok" if json.loads('''$OLD_KEYS''')==[] else "warn",
  "detail": ("ninguna clave vieja" if json.loads('''$OLD_KEYS''')==[] else str(len(json.loads('''$OLD_KEYS''')))+" clave(s) a rotar"),
  "list": json.loads('''$OLD_KEYS''')},
 {"id":"C4","title":"Política de contraseñas",
  "status": "ok" if "$PWPOLICY"=="present" else "warn",
  "detail": "aplicada" if "$PWPOLICY"=="present" else "AUSENTE"},
 {"id":"C5","title":"No-admins que pueden leer secretos",
  "status": "ok" if json.loads('''$SECRET_READERS''')==[] else "crit",
  "detail": ("ninguno" if json.loads('''$SECRET_READERS''')==[] else str(len(json.loads('''$SECRET_READERS''')))+" usuario(s) no-admin con lectura de secretos"),
  "list": json.loads('''$SECRET_READERS''')},
 {"id":"C6a","title":"Visibilidad del repositorio",
  "status": "ok" if "$REPO_VIS".upper()!="PUBLIC" else "warn",
  "detail": "$REPO_VIS"},
 {"id":"C6b","title":"Fugas en el historial git",
  "status": "ok" if ("$HIST_AKIA"=="0" and "$HIST_JWT"=="0" and "${HIST_PK:-0}"=="0") else "crit",
  "detail": "AKIA=$HIST_AKIA · JWT=$HIST_JWT · privKeys=${HIST_PK:-0}"},
 {"id":"C7","title":"Ventana de acceso del reviewer",
  "status": "warn" if "$WINDOW_OPEN"=="true" else "ok",
  "detail": ("abierta hasta $REVIEW_WINDOW_END" if "$WINDOW_OPEN"=="true" else "cerrada")},
]
order={"crit":0,"warn":1,"ok":2}
checks.sort(key=lambda c: order.get(c["status"],3))
doc={"account":"$ACCOUNT","generatedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
     "repo":"$REPO_SLUG","checks":checks,
     "summary":{s:sum(1 for c in checks if c["status"]==s) for s in ("crit","warn","ok")}}
json.dump(doc,open(out,"w"),ensure_ascii=False,indent=2)
print("wrote",out)
print("summary:",doc["summary"])
PY
