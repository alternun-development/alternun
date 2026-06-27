#!/bin/bash
set -euo pipefail

wait_for_identity_runtime_prereqs() {
  local runtime_env_file='/etc/alternun-identity.env'
  local compose_cmd_ready=0
  local wait_started_at="$SECONDS"
  local wait_timeout_seconds=600
  local wait_reason='waiting for identity runtime prerequisites'

  while true; do
    if [ ! -f "${runtime_env_file}" ]; then
      wait_reason='waiting for /etc/alternun-identity.env'
    elif command -v docker-compose >/dev/null 2>&1; then
      if docker info >/dev/null 2>&1; then
        compose_cmd_ready=1
      else
        wait_reason='waiting for Docker daemon'
      fi
    elif command -v docker >/dev/null 2>&1; then
      if docker compose version >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        compose_cmd_ready=1
      else
        wait_reason='waiting for Docker Compose'
      fi
    else
      wait_reason='waiting for Docker CLI'
    fi

    if [ "${compose_cmd_ready}" -eq 1 ]; then
      return 0
    fi

    if (( SECONDS - wait_started_at >= wait_timeout_seconds )); then
      echo "Timed out ${wait_reason} on the identity host." >&2
      exit 1
    fi

    sleep 5
  done
}

wait_for_identity_runtime_prereqs
if [ ! -f /etc/alternun-identity.env ]; then
  echo "Missing /etc/alternun-identity.env."
  exit 1
fi

set -a
# shellcheck source=/etc/alternun-identity.env
. /etc/alternun-identity.env
set +a

if command -v docker-compose >/dev/null 2>&1; then
  compose_cmd=(docker-compose)
elif docker compose version >/dev/null 2>&1; then
  compose_cmd=(docker compose)
else
  echo "Docker Compose is unavailable on the identity host." >&2
  exit 1
fi

verify_shell=$(cat <<'PYEOF'
from django.contrib.auth import get_user_model
from authentik.core.models import Application
from authentik.providers.oauth2.models import OAuth2Provider

U = get_user_model()
admin_exists = U.objects.filter(username="akadmin", is_active=True).exists()
default_app_exists = Application.objects.filter(slug="alternun-internal").exists()
admin_oidc_app = Application.objects.filter(slug="alternun-admin").exists()
admin_oidc_provider = OAuth2Provider.objects.filter(name="Alternun Admin OIDC").exists()

print(
  {
    "admin_exists": admin_exists,
    "default_application_exists": default_app_exists,
    "admin_oidc_application_exists": admin_oidc_app,
    "admin_oidc_provider_exists": admin_oidc_provider,
  }
)
raise SystemExit(0 if admin_exists and default_app_exists and admin_oidc_app and admin_oidc_provider else 1)
PYEOF
)

printf '%s\n' "$verify_shell" | timeout 120 "${compose_cmd[@]}" -f /opt/alternun/identity/docker-compose.yml exec -T server /ak-root/.venv/bin/python /manage.py shell
