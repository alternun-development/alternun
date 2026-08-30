#!/usr/bin/env bash

resolve_identity_secret_name() {
  local adoption_variable managed_secret_name stage_name adopted_secret_name
  adoption_variable=${1:-}
  managed_secret_name=${2:-}
  stage_name=${3:-}
  adopted_secret_name=${!adoption_variable:-}

  if [ -n "$adopted_secret_name" ]; then
    printf '%s\n' "$adopted_secret_name"
    return 0
  fi

  scope_secret_name "$managed_secret_name" "$stage_name"
}

resolve_identity_smtp_credentials_secret_name() {
  local managed_secret_name stage_name
  managed_secret_name=${1:-}
  stage_name=${2:-}

  resolve_identity_secret_name \
    INFRA_IDENTITY_EXISTING_SMTP_SECRET_NAME \
    "$managed_secret_name" \
    "$stage_name"
}
