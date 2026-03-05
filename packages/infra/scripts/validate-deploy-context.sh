#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_load-infra-env.sh"
load_infra_env

STAGE=${1:-${STACK:-${SST_STAGE:-dev}}}
AWS_REGION=${AWS_REGION:-us-east-1}
ROOT_DOMAIN=${DOMAIN_ROOT:-}

ENFORCE_AWS_ACCOUNT=${INFRA_ENFORCE_AWS_ACCOUNT:-true}
EXPECTED_ACCOUNT_ID=${INFRA_AWS_ACCOUNT_ID:-}

REQUIRE_ROUTE53=${INFRA_REQUIRE_ROUTE53:-true}
EXPECTED_HOSTED_ZONE_ID=${INFRA_ROUTE53_HOSTED_ZONE_ID:-}

is_truthy() {
  case "${1:-}" in
    1 | true | TRUE | yes | YES | on | ON) return 0 ;;
    *) return 1 ;;
  esac
}

normalize_hosted_zone_id() {
  local raw=${1:-}
  echo "${raw#/hostedzone/}"
}

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

if [ -z "$ROOT_DOMAIN" ]; then
  fail "Missing DOMAIN_ROOT/INFRA_ROOT_DOMAIN. Set it in packages/infra/.env or CI env."
fi

if ! command -v aws >/dev/null 2>&1; then
  fail "aws CLI is required for deploy context validation."
fi

CURRENT_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || true)
if [ -z "$CURRENT_ACCOUNT_ID" ] || [ "$CURRENT_ACCOUNT_ID" = "None" ]; then
  fail "Unable to resolve AWS account via STS. Check credentials/profile before deploy."
fi

echo "Deploy context: stage=${STAGE} region=${AWS_REGION} account=${CURRENT_ACCOUNT_ID} domain=${ROOT_DOMAIN}"

if is_truthy "$ENFORCE_AWS_ACCOUNT"; then
  if [ -z "$EXPECTED_ACCOUNT_ID" ]; then
    fail "INFRA_ENFORCE_AWS_ACCOUNT=true but INFRA_AWS_ACCOUNT_ID is not set."
  fi

  if [ "$CURRENT_ACCOUNT_ID" != "$EXPECTED_ACCOUNT_ID" ]; then
    fail "AWS account mismatch. Expected ${EXPECTED_ACCOUNT_ID}, got ${CURRENT_ACCOUNT_ID}."
  fi
fi

if ! is_truthy "$REQUIRE_ROUTE53"; then
  echo "Route53 ownership validation skipped (INFRA_REQUIRE_ROUTE53=false)."
  exit 0
fi

EXPECTED_ZONE_FQDN="${ROOT_DOMAIN%.}."
RESOLVED_ZONE_ID=""

if [ -n "$EXPECTED_HOSTED_ZONE_ID" ]; then
  RESOLVED_ZONE_ID=$(normalize_hosted_zone_id "$EXPECTED_HOSTED_ZONE_ID")
  RESOLVED_ZONE_NAME=$(aws route53 get-hosted-zone --id "$RESOLVED_ZONE_ID" --query 'HostedZone.Name' --output text 2>/dev/null || true)

  if [ -z "$RESOLVED_ZONE_NAME" ] || [ "$RESOLVED_ZONE_NAME" = "None" ]; then
    fail "Hosted zone ${RESOLVED_ZONE_ID} is not accessible in this AWS account."
  fi

  if [ "$RESOLVED_ZONE_NAME" != "$EXPECTED_ZONE_FQDN" ]; then
    fail "Hosted zone ${RESOLVED_ZONE_ID} belongs to ${RESOLVED_ZONE_NAME}, expected ${EXPECTED_ZONE_FQDN}."
  fi
else
  RESOLVED_ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name "$ROOT_DOMAIN" --max-items 1 --query 'HostedZones[0].Id' --output text 2>/dev/null || true)
  RESOLVED_ZONE_NAME=$(aws route53 list-hosted-zones-by-name --dns-name "$ROOT_DOMAIN" --max-items 1 --query 'HostedZones[0].Name' --output text 2>/dev/null || true)

  if [ -z "$RESOLVED_ZONE_ID" ] || [ "$RESOLVED_ZONE_ID" = "None" ]; then
    fail "No hosted zone found for ${ROOT_DOMAIN}. Set INFRA_ROUTE53_HOSTED_ZONE_ID or switch AWS account."
  fi

  RESOLVED_ZONE_ID=$(normalize_hosted_zone_id "$RESOLVED_ZONE_ID")

  if [ "$RESOLVED_ZONE_NAME" != "$EXPECTED_ZONE_FQDN" ]; then
    fail "Resolved hosted zone ${RESOLVED_ZONE_ID} is ${RESOLVED_ZONE_NAME}, expected ${EXPECTED_ZONE_FQDN}."
  fi
fi

echo "Route53 zone validation passed: hostedZoneId=${RESOLVED_ZONE_ID} name=${EXPECTED_ZONE_FQDN}"
