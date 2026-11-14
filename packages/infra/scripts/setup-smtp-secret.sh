#!/bin/bash
set -euo pipefail

# Setup the Tláo Mail SMTP secret (notifications@alternun.co) in AWS Secrets Manager.
# Postmark is retired: this script refuses any Postmark host.
# Usage: ./setup-smtp-secret.sh [stage]

STAGE="${1:-${STACK:-${SST_STAGE:-dev}}}"
REGION="${AWS_REGION:-us-east-1}"
SECRET_NAME="alternun/tlao/smtp"
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../../.." && pwd)

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_load-infra-env.sh"
load_infra_env

load_env_file() {
  local env_file=$1
  local line key value

  [ -f "$env_file" ] || return 0

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"

    case "$line" in
      '' | \#*) continue ;;
      export\ *) line="${line#export }" ;;
    esac

    key=${line%%=*}
    value=${line#*=}

    key=$(echo "$key" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
    value=$(echo "$value" | sed -e 's/^[[:space:]]*//')

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value=${value:1:${#value}-2}
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value=${value:1:${#value}-2}
    fi

    if [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      if [[ -n "${!key+x}" ]]; then
        continue
      fi
      export "$key=$value"
    fi
  done < "$env_file"
}

first_non_empty() {
  local value
  for value in "$@"; do
    if [ -n "${value:-}" ]; then
      printf '%s\n' "$value"
      return 0
    fi
  done

  printf '\n'
}

load_env_file "$REPO_ROOT/.env"

require_expected_account() {
  local expected_account_id=${INFRA_AWS_ACCOUNT_ID:-}
  local current_account_id

  if [ -z "$expected_account_id" ]; then
    echo "ERROR: INFRA_AWS_ACCOUNT_ID is not set. Refusing to update Secrets Manager." >&2
    echo "Set INFRA_AWS_ACCOUNT_ID in packages/infra/.env before updating SMTP secrets." >&2
    exit 1
  fi

  current_account_id=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || true)
  if [ -z "$current_account_id" ] || [ "$current_account_id" = "None" ]; then
    echo "ERROR: Unable to resolve AWS account via STS. Check credentials before updating the secret." >&2
    exit 1
  fi

  if [ "$current_account_id" != "$expected_account_id" ]; then
    echo "ERROR: AWS account mismatch. Expected ${expected_account_id}, got ${current_account_id}." >&2
    echo "Refusing to write SMTP secrets in the wrong account." >&2
    exit 1
  fi
}

require_expected_account

echo "Creating/updating Tláo SMTP secret for stage '${STAGE}' in region '${REGION}'..."

SMTP_HOST=$(first_non_empty "${ALTERNUN_SMTP_HOST:-}" "${NODEMAILER_HOST_INFO:-}" "mail.xn--tlo-fla.com")
SMTP_PORT=$(first_non_empty "${ALTERNUN_SMTP_PORT:-}" "${NODEMAILER_PORT_INFO:-}" "587")
SMTP_USERNAME=$(first_non_empty "${ALTERNUN_NOTIFICATIONS_EMAIL:-}")
SMTP_PASSWORD=$(first_non_empty "${ALTERNUN_NOTIFICATIONS_PASSWORD:-}")
SENDER_NAME=$(first_non_empty "${EMAIL_SENDER_NAME:-}" "Alternun")

case "$(printf '%s' "$SMTP_HOST" | tr '[:upper:]' '[:lower:]')" in
  *postmark*)
    echo "ERROR: Postmark is retired. Use the Tláo Mail SMTP host (mail.xn--tlo-fla.com)." >&2
    exit 1
    ;;
esac

if [ -z "$SMTP_USERNAME" ] || [ -z "$SMTP_PASSWORD" ]; then
  echo "ERROR: Missing Tláo SMTP credentials." >&2
  echo "Set ALTERNUN_NOTIFICATIONS_EMAIL and ALTERNUN_NOTIFICATIONS_PASSWORD before running this script." >&2
  exit 1
fi

# JSON built by Python so passwords with quotes or backslashes stay valid.
# Tláo only relays mail from the authenticated mailbox, so `from` is that mailbox.
SECRET_PAYLOAD=$(SMTP_HOST="$SMTP_HOST" SMTP_PORT="$SMTP_PORT" SMTP_USERNAME="$SMTP_USERNAME" \
  SMTP_PASSWORD="$SMTP_PASSWORD" SENDER_NAME="$SENDER_NAME" python3 -c '
import json, os
print(json.dumps({
  "host": os.environ["SMTP_HOST"],
  "port": int(os.environ["SMTP_PORT"]),
  "username": os.environ["SMTP_USERNAME"],
  "password": os.environ["SMTP_PASSWORD"],
  "from": os.environ["SMTP_USERNAME"],
  "senderName": os.environ["SENDER_NAME"],
  "secure": False,
  "requireTls": True,
  "useTls": True,
}))')

aws secretsmanager create-secret \
  --name "$SECRET_NAME" \
  --description "Tláo Mail SMTP credentials (notifications@alternun.co) for Airs emails" \
  --secret-string "$SECRET_PAYLOAD" \
  --region "$REGION" \
  >/dev/null 2>&1 || \
aws secretsmanager update-secret \
  --secret-id "$SECRET_NAME" \
  --secret-string "$SECRET_PAYLOAD" \
  --region "$REGION" \
  >/dev/null

echo "Secret created/updated successfully!"
echo ""
echo "Set these environment variables to use the secret:"
echo "  AUTHENTIK_SMTP_SECRET_ARN=arn:aws:secretsmanager:${REGION}:ACCOUNT_ID:secret:${SECRET_NAME}-XXXXX"
echo "  OR"
echo "  AIRS_SMTP_SECRET_ARN=arn:aws:secretsmanager:${REGION}:ACCOUNT_ID:secret:${SECRET_NAME}-XXXXX"
echo ""
echo "Verify with:"
echo "  aws secretsmanager get-secret-value --secret-id \"$SECRET_NAME\" --region \"$REGION\""
