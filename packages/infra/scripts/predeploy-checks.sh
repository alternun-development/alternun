#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_load-infra-env.sh"
load_infra_env

if [ "${SKIP_CONTEXT_VALIDATION:-false}" != "true" ]; then
  bash "$SCRIPT_DIR/validate-deploy-context.sh" "$@"
fi

stage=${1:-${SST_STAGE:-production}}

is_truthy() {
  case "${1:-}" in
    1 | true | TRUE | yes | YES | on | ON) return 0 ;;
    *) return 1 ;;
  esac
}

resolve_hz_id() {
  local root_domain=${DOMAIN_ROOT:-}
  if [ -z "$root_domain" ]; then
    echo ""
    return 0
  fi

  local hz_raw
  hz_raw=$(aws route53 list-hosted-zones-by-name --dns-name "$root_domain" --query 'HostedZones[0].Id' --output text 2>/dev/null || true)
  if [ -z "$hz_raw" ] || [ "$hz_raw" = "None" ]; then
    echo ""
    return 0
  fi

  echo "${hz_raw#/hostedzone/}"
}

report_managed_cert_conflict() {
  local domain_name=$1
  local cert_env_name=${2:-}
  local cert_env_value=${3:-}
  local fail_on_conflict=${INFRA_FAIL_ON_MANAGED_CERT_CNAME_CONFLICT:-true}
  local guidance

  if [ -n "$cert_env_value" ]; then
    echo "INFO: Existing ACM validation CNAME records found for ${domain_name}; ${cert_env_name} is set, so reusing an explicit certificate is expected."
    return 0
  fi

  guidance="Set ${cert_env_name} to reuse an existing ACM certificate, or enable AUTO_REMOVE_CONFLICTING_DNS=true and INFRA_REMOVE_ACM_VALIDATION_CNAME=true if you intend to replace the validation records."

  if is_truthy "$fail_on_conflict"; then
    echo "ERROR: Existing ACM validation CNAME records for ${domain_name} will conflict with managed certificate creation." >&2
    echo "ERROR: ${guidance}" >&2
    return 1
  fi

  echo "WARN: Existing ACM validation CNAME records for ${domain_name} may conflict with managed certificate creation." >&2
  echo "WARN: ${guidance}" >&2
  return 0
}

delete_conflicting_dns_records() {
  local hosted_zone_id=$1
  local record_name=$2
  local auto_remove=${AUTO_REMOVE_CONFLICTING_DNS:-false}

  local existing
  existing=$(aws route53 list-resource-record-sets \
    --hosted-zone-id "$hosted_zone_id" \
    --query "ResourceRecordSets[?Name=='${record_name}.' && (Type=='A' || Type=='AAAA' || Type=='CNAME' || AliasTarget!=null)]" \
    --output json 2>/dev/null || echo "[]")

  if [ "$existing" = "[]" ]; then
    return 0
  fi

  echo "Found potentially blocking DNS records for ${record_name}:"
  echo "$existing"

  if ! is_truthy "$auto_remove"; then
    echo "WARN: AUTO_REMOVE_CONFLICTING_DNS=false; keeping existing DNS records for ${record_name}." >&2
    return 0
  fi

  if ! command -v jq >/dev/null 2>&1; then
    echo "ERROR: jq is required to auto-remove conflicting DNS records." >&2
    return 1
  fi

  echo "AUTO_REMOVE_CONFLICTING_DNS=true — deleting conflicting records for ${record_name}"
  echo "$existing" | jq -c '.[]' | while read -r rec; do
    local tmp
    tmp=$(mktemp)
    cat > "$tmp" <<EOF
{
  "Comment": "DELETE conflicting record for ${record_name}",
  "Changes": [
    {
      "Action": "DELETE",
      "ResourceRecordSet": ${rec}
    }
  ]
}
EOF
    aws route53 change-resource-record-sets --hosted-zone-id "$hosted_zone_id" --change-batch "file://${tmp}" >/dev/null
    rm -f "$tmp"
    echo "Deleted conflicting record for ${record_name}"
  done
}

delete_acm_validation_cname_records() {
  local hosted_zone_id=$1
  local domain_name=$2
  local cert_env_name=${3:-}
  local cert_env_value=${4:-}
  local auto_remove=${AUTO_REMOVE_CONFLICTING_DNS:-false}
  local remove_validation=${INFRA_REMOVE_ACM_VALIDATION_CNAME:-true}

  local existing
  existing=$(aws route53 list-resource-record-sets \
    --hosted-zone-id "$hosted_zone_id" \
    --query "ResourceRecordSets[?Type=='CNAME' && starts_with(Name, '_') && contains(Name, '.${domain_name}.')]" \
    --output json 2>/dev/null || echo "[]")

  if [ "$existing" = "[]" ]; then
    return 0
  fi

  echo "Found ACM validation CNAME records for ${domain_name}:"
  echo "$existing"

  if ! is_truthy "$remove_validation"; then
    report_managed_cert_conflict "$domain_name" "$cert_env_name" "$cert_env_value" || return 1
    echo "WARN: INFRA_REMOVE_ACM_VALIDATION_CNAME=false; keeping ACM validation CNAME records for ${domain_name}." >&2
    return 0
  fi

  if ! is_truthy "$auto_remove"; then
    report_managed_cert_conflict "$domain_name" "$cert_env_name" "$cert_env_value" || return 1
    echo "WARN: AUTO_REMOVE_CONFLICTING_DNS=false; keeping ACM validation CNAME records for ${domain_name}." >&2
    return 0
  fi

  if ! command -v jq >/dev/null 2>&1; then
    echo "ERROR: jq is required to auto-remove ACM validation CNAME records." >&2
    return 1
  fi

  echo "AUTO_REMOVE_CONFLICTING_DNS=true — deleting ACM validation CNAME records for ${domain_name}"
  echo "$existing" | jq -c '.[]' | while read -r rec; do
    local tmp
    tmp=$(mktemp)
    cat > "$tmp" <<EOF
{
  "Comment": "DELETE ACM validation CNAME records for ${domain_name}",
  "Changes": [
    {
      "Action": "DELETE",
      "ResourceRecordSet": ${rec}
    }
  ]
}
EOF
    aws route53 change-resource-record-sets --hosted-zone-id "$hosted_zone_id" --change-batch "file://${tmp}" >/dev/null
    rm -f "$tmp"
    echo "Deleted ACM validation CNAME record for ${domain_name}"
  done
}

check_stage_domain_validation_cname_records() {
  if is_truthy "${SKIP_DNS_CHECK:-false}"; then
    return 0
  fi

  if ! command -v aws >/dev/null 2>&1; then
    echo "WARN: aws CLI not found; skipping stage ACM validation CNAME check." >&2
    return 0
  fi

  local hosted_zone_id
  hosted_zone_id=$(resolve_hz_id)
  if [ -z "$hosted_zone_id" ]; then
    echo "WARN: hosted zone for ${DOMAIN_ROOT:-<unset>} not found; skipping stage ACM validation CNAME check."
    return 0
  fi

  local stage_domain cert_env_name cert_env_value
  case "$stage" in
    production)
      stage_domain=${INFRA_EXPO_DOMAIN_PRODUCTION:-${DOMAIN_PRODUCTION:-}}
      cert_env_name=INFRA_EXPO_CERT_ARN_PRODUCTION
      cert_env_value=${INFRA_EXPO_CERT_ARN_PRODUCTION:-}
      ;;
    dev)
      stage_domain=${INFRA_EXPO_DOMAIN_DEV:-${DOMAIN_DEV:-}}
      cert_env_name=INFRA_EXPO_CERT_ARN_DEV
      cert_env_value=${INFRA_EXPO_CERT_ARN_DEV:-}
      ;;
    mobile)
      stage_domain=${INFRA_EXPO_DOMAIN_MOBILE:-${DOMAIN_MOBILE:-}}
      cert_env_name=INFRA_EXPO_CERT_ARN_MOBILE
      cert_env_value=${INFRA_EXPO_CERT_ARN_MOBILE:-}
      ;;
    *)
      return 0
      ;;
  esac

  if [ -n "$stage_domain" ]; then
    delete_acm_validation_cname_records "$hosted_zone_id" "$stage_domain" "$cert_env_name" "$cert_env_value"
  fi
}

run_extra_redirect_dns_cleanup() {
  if [ "$stage" != "dev" ]; then
    return 0
  fi

  if is_truthy "${SKIP_DNS_CHECK:-false}"; then
    return 0
  fi

  if ! command -v aws >/dev/null 2>&1; then
    echo "WARN: aws CLI not found; skipping extra redirect DNS cleanup." >&2
    return 0
  fi

  local hosted_zone_id
  hosted_zone_id=$(resolve_hz_id)
  if [ -z "$hosted_zone_id" ]; then
    echo "WARN: hosted zone for ${DOMAIN_ROOT:-<unset>} not found; skipping extra redirect DNS cleanup."
    return 0
  fi

  local airs_source dev_source root_source
  airs_source=${INFRA_REDIRECT_AIRS_TO_DEV_SOURCE:-${INFRA_EXPO_DOMAIN_PRODUCTION:-${DOMAIN_PRODUCTION:-}}}
  dev_source=${INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE:-}
  root_source=${INFRA_ROOT_DOMAIN:-${DOMAIN_ROOT:-}}

  if is_truthy "${INFRA_REDIRECT_AIRS_TO_DEV:-true}" && [ -n "$airs_source" ]; then
    delete_conflicting_dns_records "$hosted_zone_id" "$airs_source"
    delete_acm_validation_cname_records "$hosted_zone_id" "$airs_source" \
      INFRA_REDIRECT_AIRS_TO_DEV_CERT_ARN "${INFRA_REDIRECT_AIRS_TO_DEV_CERT_ARN:-}"
  fi

  if is_truthy "${INFRA_REDIRECT_DEV_TO_TESTNET:-true}" && [ -n "$dev_source" ]; then
    delete_conflicting_dns_records "$hosted_zone_id" "$dev_source"
    delete_acm_validation_cname_records "$hosted_zone_id" "$dev_source" \
      INFRA_REDIRECT_DEV_TO_TESTNET_CERT_ARN "${INFRA_REDIRECT_DEV_TO_TESTNET_CERT_ARN:-}"
  fi

  if is_truthy "${INFRA_REDIRECT_ROOT_DOMAIN:-true}" && [ -n "$root_source" ]; then
    delete_conflicting_dns_records "$hosted_zone_id" "$root_source"
    delete_acm_validation_cname_records "$hosted_zone_id" "$root_source" \
      INFRA_REDIRECT_ROOT_CERT_ARN "${INFRA_REDIRECT_ROOT_CERT_ARN:-}"
  fi
}

validate_expo_public_auth_env() {
  local require_auth=${INFRA_REQUIRE_EXPO_PUBLIC_AUTH:-true}
  if ! is_truthy "$require_auth"; then
    echo "INFRA_REQUIRE_EXPO_PUBLIC_AUTH=false — skipping Expo auth env validation."
    return 0
  fi

  case "$stage" in
    dev|production|mobile) ;;
    *) return 0 ;;
  esac

  local supabase_url supabase_key
  supabase_url=${EXPO_PUBLIC_SUPABASE_URL:-}
  supabase_key=${EXPO_PUBLIC_SUPABASE_KEY:-${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}}

  if [ -z "$supabase_url" ] || [ -z "$supabase_key" ]; then
    echo "ERROR: Missing required Expo auth env for stage ${stage}." >&2
    echo "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY in CI/.env." >&2
    return 1
  fi

  echo "Expo auth env check passed for stage ${stage}."
}

validate_custom_authentik_provider_flow_slugs() {
  local infra_allow_custom_provider_flow_slugs=${INFRA_ALLOW_CUSTOM_AUTHENTIK_PROVIDER_FLOW_SLUGS:-}
  local expo_allow_custom_provider_flow_slugs=${EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS:-}
  local expo_provider_flow_slugs=${EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS:-}
  local identity_google_login_flow_slug=${INFRA_IDENTITY_GOOGLE_LOGIN_FLOW_SLUG:-}

  if is_truthy "$infra_allow_custom_provider_flow_slugs" || is_truthy "$expo_allow_custom_provider_flow_slugs"; then
    return 0
  fi

  if [ -z "$expo_provider_flow_slugs" ] && [ -z "$identity_google_login_flow_slug" ]; then
    return 0
  fi

  echo "ERROR: Custom Authentik provider flow slugs are set without an explicit allow flag." >&2
  echo "Set INFRA_ALLOW_CUSTOM_AUTHENTIK_PROVIDER_FLOW_SLUGS=true (or EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS=true for local app builds) only when you deliberately want custom starter flows." >&2
  echo "Otherwise leave EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS and INFRA_IDENTITY_GOOGLE_LOGIN_FLOW_SLUG empty so deployed bundles use the direct source-login path." >&2
  return 1
}

validate_expo_public_auth_env
validate_custom_authentik_provider_flow_slugs
check_stage_domain_validation_cname_records
run_extra_redirect_dns_cleanup

if is_truthy "${INFRA_RUN_UPSTREAM_PREDEPLOY_CHECKS:-false}"; then
  TARGET=$(bash "$SCRIPT_DIR/_resolve-infra-script.sh" "predeploy-checks.sh")
  exec "$TARGET" "$@"
fi

echo "Skipping upstream predeploy checks (INFRA_RUN_UPSTREAM_PREDEPLOY_CHECKS=false)."
