#!/bin/bash
set -euo pipefail

source /etc/alternun-identity.env
AUTHENTIK_DATABASE_MODE="${AUTHENTIK_DATABASE_MODE:-rds}"
ALTERNUN_IDENTITY_TLS_MODE="${ALTERNUN_IDENTITY_TLS_MODE:-acme-route53-dns-01}"
ALTERNUN_IDENTITY_INGRESS_MODE="${ALTERNUN_IDENTITY_INGRESS_MODE:-instance}"

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
GOOGLE_SOURCE_LOGIN_FLOW_SLUG="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.googleSourceLoginFlowSlug // empty')"
GOOGLE_SOURCE_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.googleSourceName // "Google"')"
GOOGLE_SOURCE_SLUG="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.googleSourceSlug // "google"')"

USER_SYNC_WEBHOOK_URL="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.userSyncWebhookUrl // empty')"
USER_SYNC_WEBHOOK_SECRET="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.userSyncWebhookSecret // empty')"
USER_SYNC_TRANSPORT_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.userSyncTransportName // "Alternun User Sync Webhook"')"
USER_SYNC_RULE_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.userSyncRuleName // "Alternun Sync Users to Supabase"')"

DISCORD_CLIENT_ID="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.discordClientId // empty')"
DISCORD_CLIENT_SECRET="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.discordClientSecret // empty')"
DISCORD_SOURCE_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.discordSourceName // "Discord"')"
DISCORD_SOURCE_SLUG="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.discordSourceSlug // "discord"')"

MOBILE_OIDC_CLIENT_ID="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.mobileOidcClientId // "alternun-mobile"')"
MOBILE_OIDC_APPLICATION_SLUG="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.mobileOidcApplicationSlug // "alternun-mobile"')"
MOBILE_OIDC_APPLICATION_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.mobileOidcApplicationName // "Alternun Mobile"')"
MOBILE_OIDC_PROVIDER_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.mobileOidcProviderName // "Alternun Mobile OIDC"')"
MOBILE_OIDC_REDIRECT_URLS="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '(.mobileOidcRedirectUrls // []) | join(",")')"
MOBILE_OIDC_POST_LOGOUT_REDIRECT_URLS="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '(.mobileOidcPostLogoutRedirectUrls // []) | join(",")')"

SUPABASE_PROJECT_REF="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.supabaseProjectRef // empty')"
SUPABASE_MANAGEMENT_ACCESS_TOKEN="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.supabaseManagementAccessToken // empty')"
SUPABASE_OIDC_CLIENT_ID="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.supabaseOidcClientId // "alternun-supabase"')"
SUPABASE_OIDC_CLIENT_SECRET="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.supabaseOidcClientSecret // empty')"
SUPABASE_PROVIDER_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.supabaseProviderName // "Alternun Supabase OIDC"')"
SUPABASE_APPLICATION_SLUG="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.supabaseApplicationSlug // "alternun-supabase"')"
SUPABASE_APPLICATION_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.supabaseApplicationName // "Alternun Supabase"')"
SUPABASE_SYNC_CONFIG="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r 'if has("supabaseSyncConfig") then (.supabaseSyncConfig | tostring) else "true" end')"
BOOTSTRAP_ADMIN_USERNAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.adminUsername // "akadmin"')"
BOOTSTRAP_ADMIN_EMAIL="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.adminEmail // "admin@alternun.co"')"
BOOTSTRAP_ADMIN_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.adminName // "authentik Default Admin"')"
BOOTSTRAP_ADMIN_PASSWORD="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.adminPassword // empty')"
BOOTSTRAP_ADMIN_GROUP="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.adminGroup // "authentik Admins"')"
BOOTSTRAP_ADMIN_OIDC_APPLICATION_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.adminOidcApplicationName // "Alternun Admin"')"
BOOTSTRAP_ADMIN_OIDC_APPLICATION_SLUG="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.adminOidcApplicationSlug // "alternun-admin"')"
BOOTSTRAP_ADMIN_ALLOWED_EMAIL_DOMAIN="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.adminAllowedEmailDomain // "alternun.io"')"
BOOTSTRAP_ADMIN_OIDC_PROVIDER_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.adminOidcProviderName // "Alternun Admin OIDC"')"
BOOTSTRAP_ADMIN_OIDC_CLIENT_ID="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.adminOidcClientId // "alternun-admin"')"
BOOTSTRAP_ADMIN_OIDC_CLIENT_SECRET="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.adminOidcClientSecret // empty')"
BOOTSTRAP_ADMIN_OIDC_LAUNCH_URL="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.adminOidcLaunchUrl // empty')"
BOOTSTRAP_ADMIN_OIDC_REDIRECT_URL="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.adminOidcRedirectUrl // empty')"
BOOTSTRAP_ADMIN_OIDC_POST_LOGOUT_REDIRECT_URL="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.adminOidcPostLogoutRedirectUrl // empty')"
BOOTSTRAP_DOCS_CMS_OIDC_APPLICATION_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.docsCmsOidcApplicationName // "Alternun Docs CMS"')"
BOOTSTRAP_DOCS_CMS_OIDC_APPLICATION_SLUG="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.docsCmsOidcApplicationSlug // "alternun-docs-cms"')"
BOOTSTRAP_DOCS_CMS_OIDC_PROVIDER_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.docsCmsOidcProviderName // "Alternun Docs CMS OIDC"')"
BOOTSTRAP_DOCS_CMS_OIDC_CLIENT_ID="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.docsCmsOidcClientId // "alternun-docs-cms"')"
BOOTSTRAP_DOCS_CMS_OIDC_CLIENT_SECRET="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.docsCmsOidcClientSecret // empty')"
BOOTSTRAP_DOCS_CMS_OIDC_REDIRECT_URLS="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '(.docsCmsOidcRedirectUrls // []) | join(",")')"
BOOTSTRAP_DOCS_CMS_OIDC_POST_LOGOUT_REDIRECT_URLS="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '(.docsCmsOidcPostLogoutRedirectUrls // []) | join(",")')"
BOOTSTRAP_DOCS_CMS_OIDC_ALLOWED_GROUPS="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '(.docsCmsOidcAllowedGroups // ["authentik Admins","Alternun Dashboard Admins","Alternun Docs Editors"]) | join(",")')"
BOOTSTRAP_DEFAULT_APPLICATION_ENABLED="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r 'if has("defaultApplicationEnabled") then (.defaultApplicationEnabled | tostring) else "true" end')"
BOOTSTRAP_DEFAULT_APPLICATION_NAME="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.defaultApplicationName // "Alternun Internal"')"
BOOTSTRAP_DEFAULT_APPLICATION_SLUG="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.defaultApplicationSlug // "alternun-internal"')"
BOOTSTRAP_DEFAULT_APPLICATION_GROUP="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.defaultApplicationGroup // "Alternun"')"
BOOTSTRAP_DEFAULT_APPLICATION_LAUNCH_URL="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.defaultApplicationLaunchUrl // empty')"
BOOTSTRAP_DEFAULT_APPLICATION_OPEN_IN_NEW_TAB="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r 'if has("defaultApplicationOpenInNewTab") then (.defaultApplicationOpenInNewTab | tostring) else "false" end')"
BOOTSTRAP_DEFAULT_APPLICATION_PUBLISHER="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.defaultApplicationPublisher // "Alternun"')"
BOOTSTRAP_DEFAULT_APPLICATION_DESCRIPTION="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.defaultApplicationDescription // "Alternun internal access"')"
BOOTSTRAP_DEFAULT_APPLICATION_POLICY_ENGINE_MODE="$(printf '%s' "${INTEGRATION_SECRET_JSON}" | jq -r '.defaultApplicationPolicyEngineMode // "any"')"

if [ -z "${BOOTSTRAP_DEFAULT_APPLICATION_LAUNCH_URL}" ]; then
  BOOTSTRAP_DEFAULT_APPLICATION_LAUNCH_URL="https://${ALTERNUN_IDENTITY_DOMAIN}/if/user/#/library"
fi

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
EC2_ROUTE53_COMPOSE_TEMPLATE="${TEMPLATE_DIR}/docker-compose.ec2.yml"
RDS_ROUTE53_COMPOSE_TEMPLATE="${TEMPLATE_DIR}/docker-compose.rds.yml"
EC2_ALB_COMPOSE_TEMPLATE="${TEMPLATE_DIR}/docker-compose.ec2.alb.yml"
RDS_ALB_COMPOSE_TEMPLATE="${TEMPLATE_DIR}/docker-compose.rds.alb.yml"
BOOTSTRAP_SCRIPT_TEMPLATE="${TEMPLATE_DIR}/bootstrap-authentik-integrations.py"

for required_template in \
  "${EC2_ROUTE53_COMPOSE_TEMPLATE}" \
  "${RDS_ROUTE53_COMPOSE_TEMPLATE}" \
  "${EC2_ALB_COMPOSE_TEMPLATE}" \
  "${RDS_ALB_COMPOSE_TEMPLATE}" \
  "${BOOTSTRAP_SCRIPT_TEMPLATE}"
do
  if [ ! -f "${required_template}" ]; then
    echo "Missing identity runtime template: ${required_template}"
    exit 1
  fi
done

export ALTERNUN_IDENTITY_DOMAIN
export ALTERNUN_ROOT_DOMAIN
export ALTERNUN_ROUTE53_HOSTED_ZONE_ID
export ALTERNUN_IDENTITY_TLS_ACME_EMAIL
export AUTHENTIK_IMAGE_TAG
export AWS_DEFAULT_REGION="${AWS_REGION}"
export AWS_REGION
export DATABASE_NAME
export DATABASE_PASSWORD
export DATABASE_USER

if [ "${AUTHENTIK_DATABASE_MODE}" = "ec2" ] && [ "${ALTERNUN_IDENTITY_TLS_MODE}" = "alb-acm" ]; then
  cp "${EC2_ALB_COMPOSE_TEMPLATE}" /opt/alternun/identity/docker-compose.yml
elif [ "${AUTHENTIK_DATABASE_MODE}" = "ec2" ]; then
  cp "${EC2_ROUTE53_COMPOSE_TEMPLATE}" /opt/alternun/identity/docker-compose.yml
elif [ "${ALTERNUN_IDENTITY_TLS_MODE}" = "alb-acm" ]; then
  cp "${RDS_ALB_COMPOSE_TEMPLATE}" /opt/alternun/identity/docker-compose.yml
else
  cp "${RDS_ROUTE53_COMPOSE_TEMPLATE}" /opt/alternun/identity/docker-compose.yml
fi

cp "${BOOTSTRAP_SCRIPT_TEMPLATE}" /opt/alternun/identity/authentik/custom-templates/alternun-bootstrap-integrations.py

ACME_FILE='/opt/alternun/identity/traefik-acme.json'
LAST_KNOWN_GOOD_ACME_FILE='/opt/alternun/identity/traefik-acme.last-known-good.json'
ACME_BACKUP_BUCKET="${ALTERNUN_IDENTITY_ACME_BACKUP_BUCKET:-}"
ACME_BACKUP_PREFIX="${ALTERNUN_IDENTITY_ACME_BACKUP_PREFIX:-state}"

if [ "${ALTERNUN_IDENTITY_TLS_MODE}" != "alb-acm" ] && [ ! -f "${ACME_FILE}" ]; then
  install -m 600 /dev/null "${ACME_FILE}"
fi

chmod 0600 "${ENV_FILE}"
chown root:root "${ENV_FILE}"

docker compose -f /opt/alternun/identity/docker-compose.yml pull
docker compose -f /opt/alternun/identity/docker-compose.yml up -d --remove-orphans

traefik_container_id() {
  docker compose -f /opt/alternun/identity/docker-compose.yml ps -q traefik 2>/dev/null || true
}

acme_backup_enabled() {
  [ -n "${ACME_BACKUP_BUCKET}" ]
}

acme_backup_uri() {
  local file_name prefix
  file_name=$1
  prefix="${ACME_BACKUP_PREFIX#/}"
  prefix="${prefix%/}"

  if [ -n "${prefix}" ]; then
    echo "s3://${ACME_BACKUP_BUCKET}/${prefix}/${file_name}"
    return 0
  fi

  echo "s3://${ACME_BACKUP_BUCKET}/${file_name}"
}

acme_has_domain_certificate() {
  local acme_path

  acme_path="${1:-${ACME_FILE}}"

  if [ ! -s "${acme_path}" ]; then
    return 1
  fi

  jq -e --arg domain "${ALTERNUN_IDENTITY_DOMAIN}" '
    (.letsencrypt.Certificates // []) |
    any(
      (.domain.main // "") == $domain or
      ((.domain.sans // []) | index($domain))
    )
  ' "${acme_path}" >/dev/null 2>&1
}

traefik_logs_show_corrupt_acme_state() {
  local traefik_id
  traefik_id="$(traefik_container_id)"

  if [ -z "${traefik_id}" ]; then
    return 1
  fi

  docker logs --tail 200 "${traefik_id}" 2>&1 | grep -q 'Certificate not found'
}

traefik_logs_show_rate_limited_acme_state() {
  local traefik_id
  traefik_id="$(traefik_container_id)"

  if [ -z "${traefik_id}" ]; then
    return 1
  fi

  docker logs --tail 200 "${traefik_id}" 2>&1 | grep -q 'rateLimited'
}

trigger_traefik_certificate_request() {
  curl -ksS --resolve "${ALTERNUN_IDENTITY_DOMAIN}:443:127.0.0.1" \
    "https://${ALTERNUN_IDENTITY_DOMAIN}/" >/dev/null || true
}

restore_acme_file_from_s3() {
  local object_name target_path
  object_name=$1
  target_path=$2

  if ! acme_backup_enabled; then
    return 1
  fi

  if aws s3 cp "$(acme_backup_uri "${object_name}")" "${target_path}" >/dev/null 2>&1; then
    chown root:root "${target_path}"
    chmod 600 "${target_path}"
    return 0
  fi

  return 1
}

restore_acme_state_from_s3() {
  local restored=1

  if restore_acme_file_from_s3 'traefik-acme.last-known-good.json' "${LAST_KNOWN_GOOD_ACME_FILE}"; then
    restored=0
  fi

  if restore_acme_file_from_s3 'traefik-acme.json' "${ACME_FILE}"; then
    restored=0
  fi

  return "${restored}"
}

backup_acme_file_to_s3() {
  local source_path object_name
  source_path=$1
  object_name=$2

  if ! acme_backup_enabled || [ ! -s "${source_path}" ]; then
    return 1
  fi

  aws s3 cp "${source_path}" "$(acme_backup_uri "${object_name}")" \
    --sse AES256 >/dev/null
}

backup_last_known_good_acme_state() {
  if ! acme_has_domain_certificate "${ACME_FILE}"; then
    return 1
  fi

  cp "${ACME_FILE}" "${LAST_KNOWN_GOOD_ACME_FILE}"
  chown root:root "${LAST_KNOWN_GOOD_ACME_FILE}"
  chmod 600 "${LAST_KNOWN_GOOD_ACME_FILE}"
  backup_acme_file_to_s3 "${ACME_FILE}" 'traefik-acme.json' || true
  backup_acme_file_to_s3 "${LAST_KNOWN_GOOD_ACME_FILE}" 'traefik-acme.last-known-good.json' || true
}

restore_last_known_good_acme_state() {
  if ! acme_has_domain_certificate "${LAST_KNOWN_GOOD_ACME_FILE}"; then
    return 1
  fi

  cp "${LAST_KNOWN_GOOD_ACME_FILE}" "${ACME_FILE}"
  chown root:root "${ACME_FILE}"
  chmod 600 "${ACME_FILE}"
  docker compose -f /opt/alternun/identity/docker-compose.yml restart traefik
}

reset_corrupt_acme_state() {
  local backup_file

  backup_file="${ACME_FILE}.bak.$(date +%Y%m%d%H%M%S)"
  cp "${ACME_FILE}" "${backup_file}" || true
  install -m 600 /dev/null "${ACME_FILE}"
  chown root:root "${ACME_FILE}"
  docker compose -f /opt/alternun/identity/docker-compose.yml restart traefik
}

ensure_traefik_certificate() {
  local attempt=1
  local max_attempts=18
  local acme_reset_performed=0

  backup_last_known_good_acme_state || true

  while [ "${attempt}" -le "${max_attempts}" ]; do
    trigger_traefik_certificate_request

    if acme_has_domain_certificate; then
      backup_last_known_good_acme_state || true
      echo "TLS certificate ready for ${ALTERNUN_IDENTITY_DOMAIN}."
      return 0
    fi

    if [ "${acme_reset_performed}" -eq 0 ] && traefik_logs_show_corrupt_acme_state; then
      echo "WARN: Detected corrupt Traefik ACME state for ${ALTERNUN_IDENTITY_DOMAIN}; resetting ACME storage and retrying."
      reset_corrupt_acme_state
      acme_reset_performed=1
    fi

    if traefik_logs_show_rate_limited_acme_state && restore_last_known_good_acme_state; then
      echo "WARN: Restored last known good TLS certificate for ${ALTERNUN_IDENTITY_DOMAIN} after Let's Encrypt rate limiting."
      return 0
    fi

    sleep 10
    attempt=$((attempt + 1))
  done

  if restore_last_known_good_acme_state; then
    echo "WARN: Restored last known good TLS certificate for ${ALTERNUN_IDENTITY_DOMAIN} after certificate issuance retries were exhausted."
    return 0
  fi

  echo "WARN: No Let's Encrypt certificate recorded for ${ALTERNUN_IDENTITY_DOMAIN}; Traefik may still be serving its default certificate."
  return 1
}

if [ "${ALTERNUN_IDENTITY_TLS_MODE}" = "alb-acm" ]; then
  echo "Skipping Traefik ACME bootstrap because TLS is terminated at the production ALB."
else
  if [ -z "${ALTERNUN_ROUTE53_HOSTED_ZONE_ID:-}" ]; then
    echo "ALTERNUN_ROUTE53_HOSTED_ZONE_ID is required for Route53 DNS-01 certificate issuance."
    exit 1
  fi

  if ! acme_has_domain_certificate && restore_acme_state_from_s3 && acme_has_domain_certificate; then
    echo "Restored ACME state for ${ALTERNUN_IDENTITY_DOMAIN} from S3 backup."
  fi

  ensure_traefik_certificate || true
fi

wait_for_authentik_django() {
  local max_attempts=36
  local attempt=1

  while [ "${attempt}" -le "${max_attempts}" ]; do
    if docker compose -f /opt/alternun/identity/docker-compose.yml exec -T \
      server sh -lc '/ak-root/.venv/bin/python /manage.py shell -c "print(\"ok\")"' \
      >/dev/null 2>&1; then
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

BOOTSTRAP_STDERR_FILE="$(mktemp)"
if ! BOOTSTRAP_RESULTS="$(docker compose -f /opt/alternun/identity/docker-compose.yml exec -T \
  -e ALTERNUN_BOOTSTRAP_ADMIN_USERNAME="${BOOTSTRAP_ADMIN_USERNAME}" \
  -e ALTERNUN_BOOTSTRAP_ADMIN_EMAIL="${BOOTSTRAP_ADMIN_EMAIL}" \
  -e ALTERNUN_BOOTSTRAP_ADMIN_NAME="${BOOTSTRAP_ADMIN_NAME}" \
  -e ALTERNUN_BOOTSTRAP_ADMIN_PASSWORD="${BOOTSTRAP_ADMIN_PASSWORD}" \
  -e ALTERNUN_BOOTSTRAP_ADMIN_GROUP="${BOOTSTRAP_ADMIN_GROUP}" \
  -e ALTERNUN_BOOTSTRAP_ADMIN_OIDC_APPLICATION_NAME="${BOOTSTRAP_ADMIN_OIDC_APPLICATION_NAME}" \
  -e ALTERNUN_BOOTSTRAP_ADMIN_OIDC_APPLICATION_SLUG="${BOOTSTRAP_ADMIN_OIDC_APPLICATION_SLUG}" \
  -e ALTERNUN_BOOTSTRAP_ADMIN_ALLOWED_EMAIL_DOMAIN="${BOOTSTRAP_ADMIN_ALLOWED_EMAIL_DOMAIN}" \
  -e ALTERNUN_BOOTSTRAP_ADMIN_OIDC_PROVIDER_NAME="${BOOTSTRAP_ADMIN_OIDC_PROVIDER_NAME}" \
  -e ALTERNUN_BOOTSTRAP_ADMIN_OIDC_CLIENT_ID="${BOOTSTRAP_ADMIN_OIDC_CLIENT_ID}" \
  -e ALTERNUN_BOOTSTRAP_ADMIN_OIDC_CLIENT_SECRET="${BOOTSTRAP_ADMIN_OIDC_CLIENT_SECRET}" \
  -e ALTERNUN_BOOTSTRAP_ADMIN_OIDC_LAUNCH_URL="${BOOTSTRAP_ADMIN_OIDC_LAUNCH_URL}" \
  -e ALTERNUN_BOOTSTRAP_ADMIN_OIDC_REDIRECT_URL="${BOOTSTRAP_ADMIN_OIDC_REDIRECT_URL}" \
  -e ALTERNUN_BOOTSTRAP_ADMIN_OIDC_POST_LOGOUT_REDIRECT_URL="${BOOTSTRAP_ADMIN_OIDC_POST_LOGOUT_REDIRECT_URL}" \
  -e ALTERNUN_BOOTSTRAP_DOCS_CMS_OIDC_APPLICATION_NAME="${BOOTSTRAP_DOCS_CMS_OIDC_APPLICATION_NAME}" \
  -e ALTERNUN_BOOTSTRAP_DOCS_CMS_OIDC_APPLICATION_SLUG="${BOOTSTRAP_DOCS_CMS_OIDC_APPLICATION_SLUG}" \
  -e ALTERNUN_BOOTSTRAP_DOCS_CMS_OIDC_PROVIDER_NAME="${BOOTSTRAP_DOCS_CMS_OIDC_PROVIDER_NAME}" \
  -e ALTERNUN_BOOTSTRAP_DOCS_CMS_OIDC_CLIENT_ID="${BOOTSTRAP_DOCS_CMS_OIDC_CLIENT_ID}" \
  -e ALTERNUN_BOOTSTRAP_DOCS_CMS_OIDC_CLIENT_SECRET="${BOOTSTRAP_DOCS_CMS_OIDC_CLIENT_SECRET}" \
  -e ALTERNUN_BOOTSTRAP_DOCS_CMS_OIDC_REDIRECT_URLS="${BOOTSTRAP_DOCS_CMS_OIDC_REDIRECT_URLS}" \
  -e ALTERNUN_BOOTSTRAP_DOCS_CMS_OIDC_POST_LOGOUT_REDIRECT_URLS="${BOOTSTRAP_DOCS_CMS_OIDC_POST_LOGOUT_REDIRECT_URLS}" \
  -e ALTERNUN_BOOTSTRAP_DOCS_CMS_OIDC_ALLOWED_GROUPS="${BOOTSTRAP_DOCS_CMS_OIDC_ALLOWED_GROUPS}" \
  -e ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_ENABLED="${BOOTSTRAP_DEFAULT_APPLICATION_ENABLED}" \
  -e ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_NAME="${BOOTSTRAP_DEFAULT_APPLICATION_NAME}" \
  -e ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_SLUG="${BOOTSTRAP_DEFAULT_APPLICATION_SLUG}" \
  -e ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_GROUP="${BOOTSTRAP_DEFAULT_APPLICATION_GROUP}" \
  -e ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_LAUNCH_URL="${BOOTSTRAP_DEFAULT_APPLICATION_LAUNCH_URL}" \
  -e ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_OPEN_IN_NEW_TAB="${BOOTSTRAP_DEFAULT_APPLICATION_OPEN_IN_NEW_TAB}" \
  -e ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_PUBLISHER="${BOOTSTRAP_DEFAULT_APPLICATION_PUBLISHER}" \
  -e ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_DESCRIPTION="${BOOTSTRAP_DEFAULT_APPLICATION_DESCRIPTION}" \
  -e ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_POLICY_ENGINE_MODE="${BOOTSTRAP_DEFAULT_APPLICATION_POLICY_ENGINE_MODE}" \
  -e ALTERNUN_BOOTSTRAP_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS="${ALTERNUN_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS:-false}" \
  -e ALTERNUN_BOOTSTRAP_GOOGLE_CLIENT_ID="${GOOGLE_AUTH_CLIENT_ID}" \
  -e ALTERNUN_BOOTSTRAP_GOOGLE_CLIENT_SECRET="${GOOGLE_AUTH_CLIENT_SECRET}" \
  -e ALTERNUN_BOOTSTRAP_GOOGLE_SOURCE_LOGIN_FLOW_SLUG="${GOOGLE_SOURCE_LOGIN_FLOW_SLUG}" \
  -e ALTERNUN_BOOTSTRAP_GOOGLE_SOURCE_NAME="${GOOGLE_SOURCE_NAME}" \
  -e ALTERNUN_BOOTSTRAP_GOOGLE_SOURCE_SLUG="${GOOGLE_SOURCE_SLUG}" \
  -e ALTERNUN_BOOTSTRAP_USER_SYNC_WEBHOOK_URL="${USER_SYNC_WEBHOOK_URL}" \
  -e ALTERNUN_BOOTSTRAP_USER_SYNC_WEBHOOK_SECRET="${USER_SYNC_WEBHOOK_SECRET}" \
  -e ALTERNUN_BOOTSTRAP_USER_SYNC_TRANSPORT_NAME="${USER_SYNC_TRANSPORT_NAME}" \
  -e ALTERNUN_BOOTSTRAP_USER_SYNC_RULE_NAME="${USER_SYNC_RULE_NAME}" \
  -e ALTERNUN_BOOTSTRAP_DISCORD_CLIENT_ID="${DISCORD_CLIENT_ID}" \
  -e ALTERNUN_BOOTSTRAP_DISCORD_CLIENT_SECRET="${DISCORD_CLIENT_SECRET}" \
  -e ALTERNUN_BOOTSTRAP_DISCORD_SOURCE_NAME="${DISCORD_SOURCE_NAME}" \
  -e ALTERNUN_BOOTSTRAP_DISCORD_SOURCE_SLUG="${DISCORD_SOURCE_SLUG}" \
  -e ALTERNUN_BOOTSTRAP_MOBILE_OIDC_CLIENT_ID="${MOBILE_OIDC_CLIENT_ID}" \
  -e ALTERNUN_BOOTSTRAP_MOBILE_OIDC_APPLICATION_SLUG="${MOBILE_OIDC_APPLICATION_SLUG}" \
  -e ALTERNUN_BOOTSTRAP_MOBILE_OIDC_APPLICATION_NAME="${MOBILE_OIDC_APPLICATION_NAME}" \
  -e ALTERNUN_BOOTSTRAP_MOBILE_OIDC_PROVIDER_NAME="${MOBILE_OIDC_PROVIDER_NAME}" \
  -e ALTERNUN_BOOTSTRAP_MOBILE_OIDC_REDIRECT_URLS="${MOBILE_OIDC_REDIRECT_URLS}" \
  -e ALTERNUN_BOOTSTRAP_MOBILE_OIDC_POST_LOGOUT_REDIRECT_URLS="${MOBILE_OIDC_POST_LOGOUT_REDIRECT_URLS}" \
  -e ALTERNUN_BOOTSTRAP_SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF}" \
  -e ALTERNUN_BOOTSTRAP_SUPABASE_CLIENT_ID="${SUPABASE_OIDC_CLIENT_ID}" \
  -e ALTERNUN_BOOTSTRAP_SUPABASE_CLIENT_SECRET="${SUPABASE_OIDC_CLIENT_SECRET}" \
  -e ALTERNUN_BOOTSTRAP_SUPABASE_PROVIDER_NAME="${SUPABASE_PROVIDER_NAME}" \
  -e ALTERNUN_BOOTSTRAP_SUPABASE_APPLICATION_SLUG="${SUPABASE_APPLICATION_SLUG}" \
  -e ALTERNUN_BOOTSTRAP_SUPABASE_APPLICATION_NAME="${SUPABASE_APPLICATION_NAME}" \
  -e ALTERNUN_BOOTSTRAP_IDENTITY_DOMAIN="${ALTERNUN_IDENTITY_DOMAIN}" \
  server sh -lc '/ak-root/.venv/bin/python /manage.py shell < /templates/alternun-bootstrap-integrations.py' 2>"${BOOTSTRAP_STDERR_FILE}")"; then
  BOOTSTRAP_STDERR="$(cat "${BOOTSTRAP_STDERR_FILE}")"
  BOOTSTRAP_RESULTS="$(printf '%s' "${BOOTSTRAP_STDERR}" | jq -Rs '{status:"bootstrap_failed", output:.}')"
  echo "WARN: Failed to bootstrap Authentik integrations."
fi
rm -f "${BOOTSTRAP_STDERR_FILE}"
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
