#!/bin/bash
set -euo pipefail

# Setup Postmark SMTP secret in AWS Secrets Manager
# Usage: ./setup-postmark-secret.sh [stage]

STAGE="${1:-${STACK:-${SST_STAGE:-dev}}}"
REGION="${AWS_REGION:-us-east-1}"
SECRET_NAME="alternun/postmark/smtp"
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
load_env_file "$REPO_ROOT/.env.local"

require_expected_account() {
  local expected_account_id=${INFRA_AWS_ACCOUNT_ID:-}
  local current_account_id

  if [ -z "$expected_account_id" ]; then
    echo "ERROR: INFRA_AWS_ACCOUNT_ID is not set. Refusing to update Secrets Manager." >&2
    echo "Set INFRA_AWS_ACCOUNT_ID in packages/infra/.env before updating Postmark secrets." >&2
    exit 1
  fi

  current_account_id=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || true)
  if [ -z "$current_account_id" ] || [ "$current_account_id" = "None" ]; then
    echo "ERROR: Unable to resolve AWS account via STS. Check credentials before updating the secret." >&2
    exit 1
  fi

  if [ "$current_account_id" != "$expected_account_id" ]; then
    echo "ERROR: AWS account mismatch. Expected ${expected_account_id}, got ${current_account_id}." >&2
    echo "Refusing to write Postmark secrets in the wrong account." >&2
    exit 1
  fi
}

require_expected_account

echo "Creating/updating Postmark SMTP secret for stage '${STAGE}' in region '${REGION}'..."

SMTP_HOST=$(first_non_empty "${POSTMARK_SMTP_SERVER:-}" "smtp.postmarkapp.com")
SMTP_PORT=$(first_non_empty "${POSTMARK_SMTP_PORT:-}" "587")
SMTP_USERNAME=$(first_non_empty \
  "${POSTMARK_SMTP_USERNAME:-}" \
  "${POSTMARK_SMTP_ACCESS_KEY:-}" \
  "${POSTMARK_SERVER_TOKEN:-}" \
  "${POSTMARK_SERVER_API_TOKEN:-}" \
  "${POSTMARK_API_TOKEN:-}")
SMTP_PASSWORD=$(first_non_empty \
  "${POSTMARK_SMTP_PASSWORD:-}" \
  "${POSTMARK_SMTP_SECRET_KEY:-}" \
  "${POSTMARK_SERVER_TOKEN:-}" \
  "${POSTMARK_SERVER_API_TOKEN:-}" \
  "${POSTMARK_API_TOKEN:-}")
FROM_EMAIL=$(first_non_empty "${EMAIL_FROM:-}" "noreply@alternun.co")
SENDER_NAME=$(first_non_empty "${EMAIL_SENDER_NAME:-}" "Alternun")

if [ -z "$SMTP_USERNAME" ] || [ -z "$SMTP_PASSWORD" ]; then
  echo "ERROR: Missing Postmark SMTP credentials." >&2
  echo "Set POSTMARK_SMTP_USERNAME/POSTMARK_SMTP_PASSWORD or one of the token aliases before running this script." >&2
  exit 1
fi

# Create the secret JSON payload
SECRET_PAYLOAD=$(cat <<EOF
{
  "host": "${SMTP_HOST}",
  "port": ${SMTP_PORT},
  "username": "${SMTP_USERNAME}",
  "password": "${SMTP_PASSWORD}",
  "from": "${FROM_EMAIL}",
  "senderName": "${SENDER_NAME}",
  "secure": false,
  "requireTls": true,
  "useTls": true
}
EOF
)

aws secretsmanager create-secret \
  --name "$SECRET_NAME" \
  --description "Postmark SMTP credentials for transactional emails" \
  --secret-string "$SECRET_PAYLOAD" \
  --region "$REGION" \
  2>/dev/null || \
aws secretsmanager update-secret \
  --secret-id "$SECRET_NAME" \
  --secret-string "$SECRET_PAYLOAD" \
  --region "$REGION"

echo "Secret created/updated successfully!"
echo ""
echo "Set these environment variables to use the secret:"
echo "  AUTHENTIK_SMTP_SECRET_ARN=arn:aws:secretsmanager:${REGION}:ACCOUNT_ID:secret:${SECRET_NAME}-XXXXX"
echo "  OR"
echo "  AIRS_SMTP_SECRET_ARN=arn:aws:secretsmanager:${REGION}:ACCOUNT_ID:secret:${SECRET_NAME}-XXXXX"
echo ""
echo "Verify with:"
echo "  aws secretsmanager get-secret-value --secret-id \"$SECRET_NAME\" --region \"$REGION\""
