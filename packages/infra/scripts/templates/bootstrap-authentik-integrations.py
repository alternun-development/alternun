import json
import os

from django.contrib.auth import get_user_model

from authentik.core.models import Application, Group
from authentik.flows.models import Flow
from authentik.policies.expression.models import ExpressionPolicy
from authentik.policies.models import PolicyBinding
from authentik.providers.oauth2.models import OAuth2Provider, ScopeMapping
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


def build_redirect_uri(url: str):
    return {"matching_mode": "strict", "url": url}


def read_bool_env(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() not in {"0", "false", "no", "off"}


def normalize_policy_mode(value: str) -> str:
    normalized = value.strip().lower()
    return "all" if normalized == "all" else "any"


def build_admin_access_expression(allowed_domain: str, allowed_groups):
    encoded_groups = json.dumps(sorted(set(group for group in allowed_groups if group)))
    return f"""
allowed_domain = {json.dumps(allowed_domain.lower())}
allowed_groups = set({encoded_groups})
user = request.user

if not user or not getattr(user, "is_authenticated", False):
    ak_message("Authentication is required for Alternun Admin.")
    return False

if user.groups.filter(name__in=list(allowed_groups)).exists():
    return True

email = (getattr(user, "email", "") or "").strip().lower()
if allowed_domain and email.endswith(f"@{{allowed_domain}}"):
    return True

ak_message(f"Only approved admin users or @{{allowed_domain}} accounts can access Alternun Admin.")
return False
""".strip()


def upsert_expression_policy(name: str, expression: str):
    policy, created = ExpressionPolicy.objects.get_or_create(
        name=name,
        defaults={"expression": expression},
    )
    changed = False
    if policy.expression != expression:
        policy.expression = expression
        changed = True
    if created or changed:
        policy.save()
    return policy, created, changed


def ensure_policy_binding(target, policy, order: int = 0):
    binding, created = PolicyBinding.objects.get_or_create(
        target=target,
        policy=policy,
        defaults={"order": order},
    )
    changed = False
    if binding.order != order:
        binding.order = order
        changed = True
    if created or changed:
        binding.save()
    return created, changed


def resolve_scope_mappings(managed_ids):
    mappings = {
        mapping.managed: mapping
        for mapping in ScopeMapping.objects.filter(managed__in=managed_ids)
    }
    ordered = [mappings[managed_id] for managed_id in managed_ids if managed_id in mappings]
    missing = [managed_id for managed_id in managed_ids if managed_id not in mappings]
    return ordered, missing


results = {
    "admin_user": "skipped",
    "admin_application_policy": "skipped",
    "admin_provider_policy": "skipped",
    "admin_oidc_provider": "skipped",
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
admin_oidc_application_name = read_env(
    "ALTERNUN_BOOTSTRAP_ADMIN_OIDC_APPLICATION_NAME", "Alternun Admin"
)
admin_oidc_application_slug = read_env(
    "ALTERNUN_BOOTSTRAP_ADMIN_OIDC_APPLICATION_SLUG", "alternun-admin"
)
admin_allowed_email_domain = read_env(
    "ALTERNUN_BOOTSTRAP_ADMIN_ALLOWED_EMAIL_DOMAIN", "alternun.io"
)
admin_oidc_provider_name = read_env(
    "ALTERNUN_BOOTSTRAP_ADMIN_OIDC_PROVIDER_NAME", "Alternun Admin OIDC"
)
admin_oidc_client_id = read_env(
    "ALTERNUN_BOOTSTRAP_ADMIN_OIDC_CLIENT_ID", "alternun-admin"
)
admin_oidc_client_secret = read_env("ALTERNUN_BOOTSTRAP_ADMIN_OIDC_CLIENT_SECRET")
admin_oidc_redirect_url = read_env("ALTERNUN_BOOTSTRAP_ADMIN_OIDC_REDIRECT_URL")
admin_oidc_post_logout_redirect_url = read_env(
    "ALTERNUN_BOOTSTRAP_ADMIN_OIDC_POST_LOGOUT_REDIRECT_URL"
)

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

    admin_group_obj, admin_group_created = Group.objects.get_or_create(name=admin_group)
    results["admin_group"] = "created" if admin_group_created else "unchanged"
    if not admin_user.groups.filter(pk=admin_group_obj.pk).exists():
        admin_user.groups.add(admin_group_obj)
        admin_changed = True
        if not admin_created:
            results["admin_user"] = "updated"

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

if admin_oidc_application_slug and admin_oidc_client_id and admin_oidc_redirect_url:
    admin_scope_mapping_ids = [
        "goauthentik.io/providers/oauth2/scope-openid",
        "goauthentik.io/providers/oauth2/scope-email",
        "goauthentik.io/providers/oauth2/scope-profile",
        "goauthentik.io/providers/oauth2/scope-offline_access",
    ]
    expected_redirects = {("strict", admin_oidc_redirect_url)}
    authorization_flow = Flow.objects.filter(
        slug="default-provider-authorization-implicit-consent"
    ).first()
    invalidation_flow = Flow.objects.filter(slug="default-provider-invalidation-flow").first()

    provider, provider_created = OAuth2Provider.objects.get_or_create(
        name=admin_oidc_provider_name,
        defaults={
            "client_id": admin_oidc_client_id,
            "client_secret": admin_oidc_client_secret,
            "_redirect_uris": [build_redirect_uri(admin_oidc_redirect_url)],
            "authorization_flow": authorization_flow,
            "invalidation_flow": invalidation_flow,
            "sub_mode": "user_email",
        },
    )

    provider_changed = False
    provider_updates = {
        "client_id": admin_oidc_client_id,
        "client_secret": admin_oidc_client_secret,
        "sub_mode": "user_email",
    }
    for field, expected in provider_updates.items():
        current = getattr(provider, field)
        if current != expected:
            setattr(provider, field, expected)
            provider_changed = True

    current_redirects = normalize_redirects(getattr(provider, "_redirect_uris", []))
    if current_redirects != expected_redirects:
        provider._redirect_uris = [build_redirect_uri(admin_oidc_redirect_url)]
        provider_changed = True

    if authorization_flow and provider.authorization_flow_id != authorization_flow.pk:
        provider.authorization_flow = authorization_flow
        provider_changed = True
    if invalidation_flow and provider.invalidation_flow_id != invalidation_flow.pk:
        provider.invalidation_flow = invalidation_flow
        provider_changed = True
    if (
        hasattr(provider, "client_type")
        and getattr(provider, "client_type", None) != "public"
    ):
        provider.client_type = "public"
        provider_changed = True
    if (
        admin_oidc_post_logout_redirect_url
        and hasattr(provider, "post_logout_redirect_uris")
    ):
        current_logout_redirects = normalize_redirects(
            getattr(provider, "post_logout_redirect_uris", [])
        )
        expected_logout_redirects = {("strict", admin_oidc_post_logout_redirect_url)}
        if current_logout_redirects != expected_logout_redirects:
            provider.post_logout_redirect_uris = [
                build_redirect_uri(admin_oidc_post_logout_redirect_url)
            ]
            provider_changed = True

    if provider_created or provider_changed:
        provider.save()

    desired_scope_mappings, missing_scope_mapping_ids = resolve_scope_mappings(
        admin_scope_mapping_ids
    )
    current_scope_mapping_ids = set(provider.property_mappings.values_list("pk", flat=True))
    desired_scope_mapping_pks = {mapping.pk for mapping in desired_scope_mappings}
    if current_scope_mapping_ids != desired_scope_mapping_pks:
        provider.property_mappings.set(desired_scope_mappings)
        provider_changed = True

    if missing_scope_mapping_ids:
        results["admin_oidc_scope_mappings"] = {
            "status": "missing_defaults",
            "missing": missing_scope_mapping_ids,
        }
    else:
        results["admin_oidc_scope_mappings"] = {
            "status": "configured",
            "scopes": [mapping.scope_name for mapping in desired_scope_mappings],
        }

    application, application_created = Application.objects.get_or_create(
        slug=admin_oidc_application_slug,
        defaults={
            "name": admin_oidc_application_name,
            "provider": provider,
        },
    )

    application_changed = False
    if application.name != admin_oidc_application_name:
        application.name = admin_oidc_application_name
        application_changed = True
    if application.provider_id != provider.pk:
        application.provider = provider
        application_changed = True

    if application_created or application_changed:
        application.save()

    application_policy, policy_created, policy_changed = upsert_expression_policy(
        "alternun-admin-access",
        build_admin_access_expression(
            admin_allowed_email_domain,
            [admin_group, "authentik Admins", "Alternun Dashboard Admins"],
        ),
    )
    policy_binding_created, policy_binding_changed = ensure_policy_binding(
        application, application_policy, order=0
    )
    provider_policy_binding_created, provider_policy_binding_changed = ensure_policy_binding(
        provider, application_policy, order=0
    )
    if policy_created or policy_binding_created:
        results["admin_application_policy"] = "created"
    elif policy_changed or policy_binding_changed:
        results["admin_application_policy"] = "updated"
    else:
        results["admin_application_policy"] = "unchanged"

    if policy_created or provider_policy_binding_created:
        results["admin_provider_policy"] = "created"
    elif policy_changed or provider_policy_binding_changed:
        results["admin_provider_policy"] = "updated"
    else:
        results["admin_provider_policy"] = "unchanged"

    if provider_created or application_created:
        results["admin_oidc_provider"] = "created"
    elif provider_changed or application_changed:
        results["admin_oidc_provider"] = "updated"
    else:
        results["admin_oidc_provider"] = "unchanged"

    if identity_domain:
        results["admin_oidc_issuer"] = (
            f"https://{identity_domain}/application/o/{admin_oidc_application_slug}/"
        )
else:
    results["admin_oidc_provider"] = "missing_inputs"

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

    if hasattr(source, "policy_engine_mode") and source.policy_engine_mode != "any":
        source.policy_engine_mode = "any"
        source_changed = True
    if hasattr(source, "user_matching_mode") and source.user_matching_mode != "email_link":
        source.user_matching_mode = "email_link"
        source_changed = True
    if hasattr(source, "enabled") and not source.enabled:
        source.enabled = True
        source_changed = True
    if hasattr(source, "promoted") and not source.promoted:
        source.promoted = True
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
        name="default-authentication-identification"
    ).first()
    if identification_stage:
        identification_stage_changed = False
        if (
            hasattr(identification_stage, "show_source_labels")
            and not identification_stage.show_source_labels
        ):
            identification_stage.show_source_labels = True
            identification_stage_changed = True
        if identification_stage_changed:
            identification_stage.save()
        if not identification_stage.sources.filter(pk=source.pk).exists():
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
            "_redirect_uris": [build_redirect_uri(redirect_url)],
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
        provider._redirect_uris = [build_redirect_uri(redirect_url)]
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
