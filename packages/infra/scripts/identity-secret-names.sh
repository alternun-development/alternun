#!/usr/bin/env bash

resolve_identity_smtp_credentials_secret_name() {
  local managed_secret_name stage_name adopted_secret_name
  managed_secret_name=${1:-}
  stage_name=${2:-}
  adopted_secret_name=${INFRA_IDENTITY_EXISTING_SMTP_SECRET_NAME:-}

  if [ -n "$adopted_secret_name" ]; then
    printf '%s\n' "$adopted_secret_name"
    return 0
  fi

  scope_secret_name "$managed_secret_name" "$stage_name"
}
