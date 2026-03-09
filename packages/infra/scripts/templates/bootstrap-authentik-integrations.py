import json
import os

from django.contrib.auth import get_user_model

from authentik.core.models import Application, Group
from authentik.flows.models import Flow
from authentik.providers.oauth2.models import OAuth2Provider, RedirectURI
from authentik.sources.oauth.models import OAuthSource
from authentik.stages.identification.models import IdentificationStage


def read_env(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip()


def normalize_redirects(values):
    normalized = set()
    for value in values or []:
        if isinstance(value, dict):
            mode = str(value.get("matching_mode", "strict"))
            url = str(value.get("url", "")).strip()
        else:
            mode = str(getattr(value, "matching_mode", "strict"))
            url = str(getattr(value, "url", "")).strip()
        if url:
            normalized.add((mode, url))
    return normalized


def read_bool_env(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() not in {"0", "false", "no", "off"}


def normalize_policy_mode(value: str) -> str:
    normalized = value.strip().lower()
    return "all" if normalized == "all" else "any"


results = {
    "admin_user": "skipped",
    "default_application": "skipped",
    "google_source": "skipped",
    "supabase_provider": "skipped",
}

identity_domain = read_env("ALTERNUN_BOOTSTRAP_IDENTITY_DOMAIN")

admin_username = read_env("ALTERNUN_BOOTSTRAP_ADMIN_USERNAME", "akadmin")
admin_email = read_env("ALTERNUN_BOOTSTRAP_ADMIN_EMAIL", "admin@alternun.co")
admin_name = read_env("ALTERNUN_BOOTSTRAP_ADMIN_NAME", "authentik Default Admin")
admin_password = read_env("ALTERNUN_BOOTSTRAP_ADMIN_PASSWORD")
admin_group = read_env("ALTERNUN_BOOTSTRAP_ADMIN_GROUP", "authentik Admins")

if admin_username and admin_email:
    user_model = get_user_model()
    admin_defaults = {
        "email": admin_email,
        "is_active": True,
        "name": admin_name,
        "type": "internal",
    }
    admin_user, admin_created = user_model.objects.get_or_create(
        username=admin_username,
        defaults=admin_defaults,
    )

    admin_changed = False
    if admin_user.email != admin_email:
        admin_user.email = admin_email
        admin_changed = True
    if admin_name and getattr(admin_user, "name", "") != admin_name:
        admin_user.name = admin_name
        admin_changed = True
    if not admin_user.is_active:
        admin_user.is_active = True
        admin_changed = True
    if getattr(admin_user, "type", "") != "internal":
        admin_user.type = "internal"
        admin_changed = True

    if admin_password:
        admin_user.set_password(admin_password)
        admin_changed = True
    else:
        results["admin_password"] = "missing"

    if admin_created or admin_changed:
        admin_user.save()

    admin_group_obj = Group.objects.filter(name=admin_group).first()
    if admin_group_obj:
        if not admin_user.groups.filter(pk=admin_group_obj.pk).exists():
            admin_user.groups.add(admin_group_obj)
            admin_changed = True
            if not admin_created:
                results["admin_user"] = "updated"
    else:
        results["admin_group"] = "missing"

    if admin_created:
        results["admin_user"] = "created"
    elif admin_changed:
        results["admin_user"] = "updated"
    else:
        results["admin_user"] = "unchanged"

    results["admin_username"] = admin_username
    results["admin_email"] = admin_email
else:
    results["admin_user"] = "missing_inputs"

default_application_enabled = read_bool_env(
    "ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_ENABLED", True
)
default_application_name = read_env(
    "ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_NAME", "Alternun Internal"
)
default_application_slug = read_env(
    "ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_SLUG", "alternun-internal"
)
default_application_group = read_env(
    "ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_GROUP", "Alternun"
)
default_application_launch_url = read_env(
    "ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_LAUNCH_URL",
    f"https://{identity_domain}/if/user/#/library" if identity_domain else "",
)
default_application_open_in_new_tab = read_bool_env(
    "ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_OPEN_IN_NEW_TAB", False
)
default_application_publisher = read_env(
    "ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_PUBLISHER", "Alternun"
)
default_application_description = read_env(
    "ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_DESCRIPTION", "Alternun internal access"
)
default_application_policy_mode = normalize_policy_mode(
    read_env("ALTERNUN_BOOTSTRAP_DEFAULT_APPLICATION_POLICY_ENGINE_MODE", "any")
)

if default_application_enabled and default_application_name and default_application_slug:
    app_defaults = {
        "name": default_application_name,
        "open_in_new_tab": default_application_open_in_new_tab,
        "policy_engine_mode": default_application_policy_mode,
    }
    if default_application_group:
        app_defaults["group"] = default_application_group
    if default_application_launch_url:
        app_defaults["meta_launch_url"] = default_application_launch_url
    if default_application_publisher:
        app_defaults["meta_publisher"] = default_application_publisher
    if default_application_description:
        app_defaults["meta_description"] = default_application_description

    default_app, default_app_created = Application.objects.get_or_create(
        slug=default_application_slug, defaults=app_defaults
    )

    default_app_changed = False
    default_app_updates = {
        "name": default_application_name,
        "open_in_new_tab": default_application_open_in_new_tab,
        "policy_engine_mode": default_application_policy_mode,
    }

    for field, expected in default_app_updates.items():
        if hasattr(default_app, field) and getattr(default_app, field) != expected:
            setattr(default_app, field, expected)
            default_app_changed = True

    optional_default_app_updates = {
        "group": default_application_group,
        "meta_launch_url": default_application_launch_url,
        "meta_publisher": default_application_publisher,
        "meta_description": default_application_description,
    }
    for field, expected in optional_default_app_updates.items():
        if expected and hasattr(default_app, field) and getattr(default_app, field) != expected:
            setattr(default_app, field, expected)
            default_app_changed = True

    if default_app_created or default_app_changed:
        default_app.save()

    if default_app_created:
        results["default_application"] = "created"
    elif default_app_changed:
        results["default_application"] = "updated"
    else:
        results["default_application"] = "unchanged"

    results["default_application_slug"] = default_application_slug
else:
    results["default_application"] = (
        "disabled" if not default_application_enabled else "missing_inputs"
    )

google_client_id = read_env("ALTERNUN_BOOTSTRAP_GOOGLE_CLIENT_ID")
google_client_secret = read_env("ALTERNUN_BOOTSTRAP_GOOGLE_CLIENT_SECRET")
google_source_slug = read_env("ALTERNUN_BOOTSTRAP_GOOGLE_SOURCE_SLUG", "google")
google_source_name = read_env("ALTERNUN_BOOTSTRAP_GOOGLE_SOURCE_NAME", "Google")

if google_client_id and google_client_secret:
    source_authentication_flow = Flow.objects.filter(
        slug="default-source-authentication"
    ).first()
    source_enrollment_flow = Flow.objects.filter(slug="default-source-enrollment").first()
    source, source_created = OAuthSource.objects.get_or_create(
        slug=google_source_slug,
        defaults={
            "name": google_source_name,
            "provider_type": "google",
            "consumer_key": google_client_id,
            "consumer_secret": google_client_secret,
            "authentication_flow": source_authentication_flow,
            "enrollment_flow": source_enrollment_flow,
        },
    )

    source_changed = False
    source_updates = {
        "name": google_source_name,
        "provider_type": "google",
        "consumer_key": google_client_id,
        "consumer_secret": google_client_secret,
    }
    for field, expected in source_updates.items():
        current = getattr(source, field)
        if current != expected:
            setattr(source, field, expected)
            source_changed = True

    if (
        source_authentication_flow
        and source.authentication_flow_id != source_authentication_flow.pk
    ):
        source.authentication_flow = source_authentication_flow
        source_changed = True
    if source_enrollment_flow and source.enrollment_flow_id != source_enrollment_flow.pk:
        source.enrollment_flow = source_enrollment_flow
        source_changed = True

    if source_created or source_changed:
        source.save()

    identification_stage = IdentificationStage.objects.filter(
        slug="default-authentication-identification"
    ).first()
    if identification_stage and not identification_stage.sources.filter(pk=source.pk).exists():
        identification_stage.sources.add(source)

    if source_created:
        results["google_source"] = "created"
    elif source_changed:
        results["google_source"] = "updated"
    else:
        results["google_source"] = "unchanged"
else:
    results["google_source"] = "missing_credentials"

supabase_project_ref = read_env("ALTERNUN_BOOTSTRAP_SUPABASE_PROJECT_REF")
supabase_client_id = read_env("ALTERNUN_BOOTSTRAP_SUPABASE_CLIENT_ID")
supabase_client_secret = read_env("ALTERNUN_BOOTSTRAP_SUPABASE_CLIENT_SECRET")
supabase_provider_name = read_env(
    "ALTERNUN_BOOTSTRAP_SUPABASE_PROVIDER_NAME", "Alternun Supabase OIDC"
)
supabase_application_slug = read_env(
    "ALTERNUN_BOOTSTRAP_SUPABASE_APPLICATION_SLUG", "alternun-supabase"
)
supabase_application_name = read_env(
    "ALTERNUN_BOOTSTRAP_SUPABASE_APPLICATION_NAME", "Alternun Supabase"
)

if (
    supabase_project_ref
    and supabase_client_id
    and supabase_client_secret
    and identity_domain
):
    redirect_url = f"https://{supabase_project_ref}.supabase.co/auth/v1/callback"
    expected_redirects = {("strict", redirect_url)}
    authorization_flow = Flow.objects.filter(
        slug="default-provider-authorization-implicit-consent"
    ).first()
    invalidation_flow = Flow.objects.filter(slug="default-provider-invalidation-flow").first()

    provider, provider_created = OAuth2Provider.objects.get_or_create(
        name=supabase_provider_name,
        defaults={
            "client_id": supabase_client_id,
            "client_secret": supabase_client_secret,
            "_redirect_uris": [RedirectURI(matching_mode="strict", url=redirect_url)],
            "authorization_flow": authorization_flow,
            "invalidation_flow": invalidation_flow,
            "sub_mode": "user_email",
        },
    )

    provider_changed = False
    provider_updates = {
        "client_id": supabase_client_id,
        "client_secret": supabase_client_secret,
        "sub_mode": "user_email",
    }
    for field, expected in provider_updates.items():
        current = getattr(provider, field)
        if current != expected:
            setattr(provider, field, expected)
            provider_changed = True

    current_redirects = normalize_redirects(getattr(provider, "_redirect_uris", []))
    if current_redirects != expected_redirects:
        provider._redirect_uris = [RedirectURI(matching_mode="strict", url=redirect_url)]
        provider_changed = True

    if authorization_flow and provider.authorization_flow_id != authorization_flow.pk:
        provider.authorization_flow = authorization_flow
        provider_changed = True
    if invalidation_flow and provider.invalidation_flow_id != invalidation_flow.pk:
        provider.invalidation_flow = invalidation_flow
        provider_changed = True

    if provider_created or provider_changed:
        provider.save()

    application, application_created = Application.objects.get_or_create(
        slug=supabase_application_slug,
        defaults={
            "name": supabase_application_name,
            "provider": provider,
        },
    )

    application_changed = False
    if application.name != supabase_application_name:
        application.name = supabase_application_name
        application_changed = True
    if application.provider_id != provider.pk:
        application.provider = provider
        application_changed = True

    if application_created or application_changed:
        application.save()

    if provider_created or application_created:
        results["supabase_provider"] = "created"
    elif provider_changed or application_changed:
        results["supabase_provider"] = "updated"
    else:
        results["supabase_provider"] = "unchanged"

    results["supabase_issuer"] = (
        f"https://{identity_domain}/application/o/{supabase_application_slug}/"
    )
else:
    results["supabase_provider"] = "missing_inputs"

print(json.dumps(results))
