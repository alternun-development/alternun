#!/bin/bash
set -euo pipefail

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

printf '%s\n' "$verify_shell" | "${compose_cmd[@]}" -f /opt/alternun/identity/docker-compose.yml exec -T server /ak-root/.venv/bin/python /manage.py shell
