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
  local auto_remove=${AUTO_REMOVE_CONFLICTING_DNS:-false}
  local remove_validation=${INFRA_REMOVE_ACM_VALIDATION_CNAME:-true}

  if ! is_truthy "$remove_validation"; then
    return 0
  fi

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

  if ! is_truthy "$auto_remove"; then
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
    delete_acm_validation_cname_records "$hosted_zone_id" "$airs_source"
  fi

  if is_truthy "${INFRA_REDIRECT_DEV_TO_TESTNET:-true}" && [ -n "$dev_source" ]; then
    delete_conflicting_dns_records "$hosted_zone_id" "$dev_source"
    delete_acm_validation_cname_records "$hosted_zone_id" "$dev_source"
  fi

  if is_truthy "${INFRA_REDIRECT_ROOT_DOMAIN:-true}" && [ -n "$root_source" ]; then
    delete_conflicting_dns_records "$hosted_zone_id" "$root_source"
    delete_acm_validation_cname_records "$hosted_zone_id" "$root_source"
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

validate_expo_public_auth_env
run_extra_redirect_dns_cleanup

TARGET=$(bash "$SCRIPT_DIR/_resolve-infra-script.sh" "predeploy-checks.sh")
exec "$TARGET" "$@"
