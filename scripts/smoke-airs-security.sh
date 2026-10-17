#!/usr/bin/env bash
set -euo pipefail

# Non-mutating AIRS API smoke test.  The onboarding endpoint is deliberately
# not called because it awards bonuses and sends email.  Set
# AIRS_API_BASE_URL to the API origin and AIRS_SMOKE_BEARER_TOKEN to a test
# user's bearer token before running this against a live environment.

: "${AIRS_API_BASE_URL:?Set AIRS_API_BASE_URL to the API origin}"
: "${AIRS_SMOKE_BEARER_TOKEN:?Set AIRS_SMOKE_BEARER_TOKEN to a test user bearer token}"

base_url="${AIRS_API_BASE_URL%/}"
auth_header=( -H "Authorization: Bearer ${AIRS_SMOKE_BEARER_TOKEN}" )

check_status() {
  local label="$1"
  local expected="$2"
  local url="$3"
  shift 3

  local status
  status=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$@" "$url")
  if [[ "$status" != "$expected" ]]; then
    echo "FAIL ${label}: expected ${expected}, got ${status}" >&2
    return 1
  fi
  echo "PASS ${label} -> ${status}"
}

check_status 'community total' 200 "${base_url}/v1/airs/community-total"

for endpoint in me my-position leaderboard activity achievements; do
  check_status "$endpoint" 200 "${base_url}/v1/airs/${endpoint}" "${auth_header[@]}"
done

# Private routes must fail closed without a bearer token.
check_status 'unauthenticated AIRS profile' 401 "${base_url}/v1/airs/me"

echo 'AIRS security smoke passed; no mutating endpoint was invoked.'
