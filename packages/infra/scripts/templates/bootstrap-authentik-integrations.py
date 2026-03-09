import json
import os

from authentik.core.models import Application
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


results = {
    "google_source": "skipped",
    "supabase_provider": "skipped",
}

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
identity_domain = read_env("ALTERNUN_BOOTSTRAP_IDENTITY_DOMAIN")

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
