#!/bin/bash
set -euo pipefail

source /etc/alternun-identity.env
AUTHENTIK_DATABASE_MODE="${AUTHENTIK_DATABASE_MODE:-rds}"

TOKEN="$(curl -fsS -X PUT 'http://169.254.169.254/latest/api/token' -H 'X-aws-ec2-metadata-token-ttl-seconds: 21600')"
INSTANCE_IDENTITY="$(curl -fsS -H "X-aws-ec2-metadata-token: ${TOKEN}" 'http://169.254.169.254/latest/dynamic/instance-identity/document')"
AWS_REGION="$(printf '%s' "${INSTANCE_IDENTITY}" | jq -r '.region')"

if [ -z "${AWS_REGION}" ] || [ "${AWS_REGION}" = "null" ]; then
  echo "Unable to resolve AWS region from EC2 metadata."
  exit 1
fi

get_secret_json() {
  aws --region "${AWS_REGION}" secretsmanager get-secret-value --secret-id "$1" --query SecretString --output text
}

AUTHENTIK_SECRET_JSON="$(get_secret_json "${AUTHENTIK_SECRET_ARN}")"
DATABASE_SECRET_JSON="$(get_secret_json "${AUTHENTIK_DATABASE_SECRET_ARN}")"
SMTP_SECRET_JSON="$(get_secret_json "${AUTHENTIK_SMTP_SECRET_ARN}")"
INTEGRATION_SECRET_JSON='{}'
if [ -n "${AUTHENTIK_INTEGRATION_CONFIG_SECRET_ARN:-}" ]; then
  INTEGRATION_SECRET_JSON="$(get_secret_json "${AUTHENTIK_INTEGRATION_CONFIG_SECRET_ARN}")"
fi

AUTHENTIK_SECRET_KEY_VALUE="$(printf '%s' "${AUTHENTIK_SECRET_JSON}" | jq -r '.secretKey // empty')"
DATABASE_HOST="$(printf '%s' "${DATABASE_SECRET_JSON}" | jq -r '.host // empty')"
DATABASE_NAME="$(printf '%s' "${DATABASE_SECRET_JSON}" | jq -r '.database // empty')"
DATABASE_USER="$(printf '%s' "${DATABASE_SECRET_JSON}" | jq -r '.username // empty')"
DATABASE_PASSWORD="$(printf '%s' "${DATABASE_SECRET_JSON}" | jq -r '.password // empty')"
DATABASE_PORT="$(printf '%s' "${DATABASE_SECRET_JSON}" | jq -r '(.port // 5432) | tostring')"
DATABASE_SSLMODE="$(printf '%s' "${DATABASE_SECRET_JSON}" | jq -r '.sslmode // empty')"

if [ -z "${DATABASE_SSLMODE}" ]; then
  if [ "${AUTHENTIK_DATABASE_MODE}" = "ec2" ]; then
    DATABASE_SSLMODE='disable'
  else
    DATABASE_SSLMODE='require'
  fi
fi

if [ -z "${AUTHENTIK_SECRET_KEY_VALUE}" ]; then
  echo "Authentik secret key is missing from ${AUTHENTIK_SECRET_ARN}."
  exit 1
fi

if [ -z "${DATABASE_HOST}" ] || [ -z "${DATABASE_NAME}" ] || [ -z "${DATABASE_USER}" ] || [ -z "${DATABASE_PASSWORD}" ]; then
  echo "Database credentials secret ${AUTHENTIK_DATABASE_SECRET_ARN} is incomplete."
  exit 1
fi

SMTP_HOST="$(printf '%s' "${SMTP_SECRET_JSON}" | jq -r '.host // empty')"
SMTP_PORT="$(printf '%s' "${SMTP_SECRET_JSON}" | jq -r '(.port // 587) | tostring')"
SMTP_USERNAME="$(printf '%s' "${SMTP_SECRET_JSON}" | jq -r '.username // empty')"
SMTP_PASSWORD="$(printf '%s' "${SMTP_SECRET_JSON}" | jq -r '.password // empty')"
SMTP_USE_TLS="$(printf '%s' "${SMTP_SECRET_JSON}" | jq -r 'if has("useTls") then (.useTls | tostring) else "true" end')"
SMTP_USE_SSL="$(printf '%s' "${SMTP_SECRET_JSON}" | jq -r 'if has("useSsl") then (.useSsl | tostring) else "false" end')"
SMTP_FROM="$(printf '%s' "${SMTP_SECRET_JSON}" | jq -r '.from // empty')"

if [ -z "${SMTP_FROM}" ]; then
  SMTP_FROM="authentik@${ALTERNUN_ROOT_DOMAIN}"
fi

GOOGLE_AUTH_CLIENT_ID="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.googleClientId // empty')"
GOOGLE_AUTH_CLIENT_SECRET="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.googleClientSecret // empty')"
GOOGLE_SOURCE_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.googleSourceName // "Google"')"
GOOGLE_SOURCE_SLUG="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.googleSourceSlug // "google"')"

SUPABASE_PROJECT_REF="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.supabaseProjectRef // empty')"
SUPABASE_MANAGEMENT_ACCESS_TOKEN="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.supabaseManagementAccessToken // empty')"
SUPABASE_OIDC_CLIENT_ID="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.supabaseOidcClientId // "alternun-supabase"')"
SUPABASE_OIDC_CLIENT_SECRET="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.supabaseOidcClientSecret // empty')"
SUPABASE_PROVIDER_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.supabaseProviderName // "Alternun Supabase OIDC"')"
SUPABASE_APPLICATION_SLUG="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.supabaseApplicationSlug // "alternun-supabase"')"
SUPABASE_APPLICATION_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.supabaseApplicationName // "Alternun Supabase"')"
SUPABASE_SYNC_CONFIG="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r 'if has("supabaseSyncConfig") then (.supabaseSyncConfig | tostring) else "true" end')"

install -d -o ec2-user -g ec2-user /opt/alternun/identity
install -d -o ec2-user -g ec2-user /opt/alternun/identity/authentik/data
install -d -o ec2-user -g ec2-user /opt/alternun/identity/authentik/certs
install -d -o ec2-user -g ec2-user /opt/alternun/identity/authentik/custom-templates

if [ "${AUTHENTIK_DATABASE_MODE}" = "ec2" ]; then
  install -d -o ec2-user -g ec2-user /opt/alternun/identity/postgres/data
fi

ENV_FILE='/opt/alternun/identity/.env.authentik'
: > "${ENV_FILE}"

append_env() {
  printf '%s=%s\n' "$1" "$2" >> "${ENV_FILE}"
}

append_env AUTHENTIK_SECRET_KEY "${AUTHENTIK_SECRET_KEY_VALUE}"
append_env AUTHENTIK_POSTGRESQL__HOST "${DATABASE_HOST}"
append_env AUTHENTIK_POSTGRESQL__PORT "${DATABASE_PORT}"
append_env AUTHENTIK_POSTGRESQL__NAME "${DATABASE_NAME}"
append_env AUTHENTIK_POSTGRESQL__USER "${DATABASE_USER}"
append_env AUTHENTIK_POSTGRESQL__PASSWORD "${DATABASE_PASSWORD}"
append_env AUTHENTIK_POSTGRESQL__SSLMODE "${DATABASE_SSLMODE}"
append_env AUTHENTIK_ERROR_REPORTING__ENABLED 'false'
append_env AUTHENTIK_ERROR_REPORTING__ENVIRONMENT "${ALTERNUN_STAGE}"
append_env AUTHENTIK_DISABLE_UPDATE_CHECK 'true'

if [ -n "${SMTP_HOST}" ]; then
  append_env AUTHENTIK_EMAIL__HOST "${SMTP_HOST}"
  append_env AUTHENTIK_EMAIL__PORT "${SMTP_PORT}"
  append_env AUTHENTIK_EMAIL__USERNAME "${SMTP_USERNAME}"
  append_env AUTHENTIK_EMAIL__PASSWORD "${SMTP_PASSWORD}"
  append_env AUTHENTIK_EMAIL__USE_TLS "${SMTP_USE_TLS}"
  append_env AUTHENTIK_EMAIL__USE_SSL "${SMTP_USE_SSL}"
  append_env AUTHENTIK_EMAIL__FROM "${SMTP_FROM}"
fi

TEMPLATE_DIR='/opt/alternun/identity/templates'
EC2_COMPOSE_TEMPLATE="${TEMPLATE_DIR}/docker-compose.ec2.yml"
RDS_COMPOSE_TEMPLATE="${TEMPLATE_DIR}/docker-compose.rds.yml"
BOOTSTRAP_SCRIPT_TEMPLATE="${TEMPLATE_DIR}/bootstrap-authentik-integrations.py"

for required_template in "${EC2_COMPOSE_TEMPLATE}" "${RDS_COMPOSE_TEMPLATE}" "${BOOTSTRAP_SCRIPT_TEMPLATE}"; do
  if [ ! -f "${required_template}" ]; then
    echo "Missing identity runtime template: ${required_template}"
    exit 1
  fi
done

export ALTERNUN_IDENTITY_DOMAIN
export ALTERNUN_ROOT_DOMAIN
export AUTHENTIK_IMAGE_TAG
export DATABASE_NAME
export DATABASE_PASSWORD
export DATABASE_USER

if [ "${AUTHENTIK_DATABASE_MODE}" = "ec2" ]; then
  cp "${EC2_COMPOSE_TEMPLATE}" /opt/alternun/identity/docker-compose.yml
else
  cp "${RDS_COMPOSE_TEMPLATE}" /opt/alternun/identity/docker-compose.yml
fi

cp "${BOOTSTRAP_SCRIPT_TEMPLATE}" /opt/alternun/identity/authentik/custom-templates/alternun-bootstrap-integrations.py

if [ ! -f /opt/alternun/identity/traefik-acme.json ]; then
  install -m 600 /dev/null /opt/alternun/identity/traefik-acme.json
fi

chmod 0600 "${ENV_FILE}"
chown root:root "${ENV_FILE}"

docker compose -f /opt/alternun/identity/docker-compose.yml pull
docker compose -f /opt/alternun/identity/docker-compose.yml up -d --remove-orphans

wait_for_authentik_django() {
  local max_attempts=36
  local attempt=1

  while [ "${attempt}" -le "${max_attempts}" ]; do
    if docker compose -f /opt/alternun/identity/docker-compose.yml exec -T server sh -lc '/ak-root/.venv/bin/python - <<'"'"'"'"'"'"'"'"'PY'"'"'"'"'"'"'"'"'
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "authentik.root.settings")
import django
django.setup()
print("ok")
PY' >/dev/null 2>&1; then
      return 0
    fi
    sleep 5
    attempt=$((attempt + 1))
  done

  return 1
}

if ! wait_for_authentik_django; then
  echo "WARN: Authentik did not become ready for integration bootstrap; skipping integration configuration."
  exit 0
fi

if ! BOOTSTRAP_RESULTS="$(docker compose -f /opt/alternun/identity/docker-compose.yml exec -T \
  -e ALTERNUN_BOOTSTRAP_GOOGLE_CLIENT_ID="${GOOGLE_AUTH_CLIENT_ID}" \
  -e ALTERNUN_BOOTSTRAP_GOOGLE_CLIENT_SECRET="${GOOGLE_AUTH_CLIENT_SECRET}" \
  -e ALTERNUN_BOOTSTRAP_GOOGLE_SOURCE_NAME="${GOOGLE_SOURCE_NAME}" \
  -e ALTERNUN_BOOTSTRAP_GOOGLE_SOURCE_SLUG="${GOOGLE_SOURCE_SLUG}" \
  -e ALTERNUN_BOOTSTRAP_SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF}" \
  -e ALTERNUN_BOOTSTRAP_SUPABASE_CLIENT_ID="${SUPABASE_OIDC_CLIENT_ID}" \
  -e ALTERNUN_BOOTSTRAP_SUPABASE_CLIENT_SECRET="${SUPABASE_OIDC_CLIENT_SECRET}" \
  -e ALTERNUN_BOOTSTRAP_SUPABASE_PROVIDER_NAME="${SUPABASE_PROVIDER_NAME}" \
  -e ALTERNUN_BOOTSTRAP_SUPABASE_APPLICATION_SLUG="${SUPABASE_APPLICATION_SLUG}" \
  -e ALTERNUN_BOOTSTRAP_SUPABASE_APPLICATION_NAME="${SUPABASE_APPLICATION_NAME}" \
  -e ALTERNUN_BOOTSTRAP_IDENTITY_DOMAIN="${ALTERNUN_IDENTITY_DOMAIN}" \
  server sh -lc '/ak-root/.venv/bin/python /manage.py shell < /templates/alternun-bootstrap-integrations.py')"; then
  BOOTSTRAP_RESULTS='{"status":"bootstrap_failed"}'
  echo "WARN: Failed to bootstrap Authentik integrations."
fi
echo "Authentik integration bootstrap: ${BOOTSTRAP_RESULTS}"

if [ "${SUPABASE_SYNC_CONFIG}" = "true" ] && \
   [ -n "${SUPABASE_PROJECT_REF}" ] && \
   [ -n "${SUPABASE_MANAGEMENT_ACCESS_TOKEN}" ] && \
   [ -n "${SUPABASE_OIDC_CLIENT_ID}" ] && \
   [ -n "${SUPABASE_OIDC_CLIENT_SECRET}" ]; then
  AUTHENTIK_ISSUER_URL="https://${ALTERNUN_IDENTITY_DOMAIN}/application/o/${SUPABASE_APPLICATION_SLUG}/"
  SUPABASE_CONFIG_PAYLOAD="$(jq -n \
    --arg external_keycloak_client_id "${SUPABASE_OIDC_CLIENT_ID}" \
    --arg external_keycloak_secret "${SUPABASE_OIDC_CLIENT_SECRET}" \
    --arg external_keycloak_url "${AUTHENTIK_ISSUER_URL}" \
    '{
      external_keycloak_enabled: true,
      external_keycloak_client_id: $external_keycloak_client_id,
      external_keycloak_secret: $external_keycloak_secret,
      external_keycloak_url: $external_keycloak_url
    }'
  )"

  if ! curl -fsS --retry 3 --retry-delay 2 --max-time 30 \
    -X PATCH "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth" \
    -H "Authorization: Bearer ${SUPABASE_MANAGEMENT_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${SUPABASE_CONFIG_PAYLOAD}" >/dev/null; then
    echo "WARN: Failed to patch Supabase auth OIDC settings for project ${SUPABASE_PROJECT_REF}."
  else
    echo "Supabase auth OIDC synced for project ${SUPABASE_PROJECT_REF}."
  fi
else
  echo "Supabase auth sync skipped (missing credentials, project ref, OIDC values, or sync disabled)."
fi
