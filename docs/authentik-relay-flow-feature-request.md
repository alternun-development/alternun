# Issue Draft: Add A Reusable Authentik Relay/Callback Flow For Admin And Docs

## Summary

Alternun still has two different Authentik entry patterns:

- `apps/mobile` already uses `@alternun/auth` helpers that can start Authentik with an app-owned relay route and callback handling.
- `apps/admin` and `apps/docs` still use direct `oidc-client-ts` redirects into Authentik.

That split leaves a visible gap in browser UX. When login starts from a bare Authentik flow URL or from an application/library tile without a continuation target, the browser can end on the Authentik library instead of returning straight to the intended Alternun app.

We need a reusable relay/callback pattern for admin and docs that matches the cleaner CIG approach and keeps Alternun applications, not Authentik, in control of the visible login entrypoint.

## Scope

- define a shared relay/callback contract in `@alternun/auth`
- add app-owned login starter routes for `apps/admin` and `apps/docs`
- preserve existing authorization checks after callback completion
- keep Authentik server bootstrap declarative and avoid depending on custom Authentik UI templates
- document the supported entrypoint rules so future infra or app changes do not reintroduce library-first login

Out of scope:

- replacing Authentik as the IdP
- bypassing Authentik-hosted credential entry
- introducing project-specific HTML template overrides on the Authentik server unless a later requirement proves they are necessary

## Deliverables

- shared `@alternun/auth` helper or preset for:
  - provider-aware relay start URLs
  - PKCE/state persistence
  - callback completion helpers
  - safe return-target resolution
- admin app route that starts login from the Alternun app origin instead of a raw Authentik flow URL
- docs CMS route with the same pattern
- infra/bootstrap validation that application launch URLs point at app entry routes, not the Authentik library
- documentation update covering:
  - supported login entrypoints
  - relay responsibilities
  - when Authentik custom templates are and are not required

## Acceptance Criteria

- starting admin login from the Alternun admin UI returns the browser to `/dashboard` after successful Authentik authentication
- starting docs CMS login from the Alternun docs UI returns the browser to `/admin`
- direct application tiles for admin/docs point at Alternun-owned entry routes
- the default internal application tile never regresses to the AIRS auth entrypoint unless explicitly configured
- no custom Authentik UI template override is required for the standard admin/docs login path
- the flow is documented well enough that future identity pipeline changes cannot silently reintroduce Authentik-library redirects

## Dependencies

- current `@alternun/auth` browser helpers
- Authentik OIDC providers and application launch URLs managed by `packages/infra`
- admin auth callback logic in `apps/admin`
- docs CMS callback logic in `apps/docs`

## References

- Alternun mobile/browser auth helpers:
  - `packages/auth/src/mobile/authEntry.ts`
  - `packages/auth/src/mobile/authentikClient.ts`
  - `apps/mobile/app/auth-relay.tsx`
  - `apps/mobile/app/auth/callback.tsx`
- Current direct redirect consumers:
  - `apps/admin/src/auth/authProvider.ts`
  - `apps/admin/src/pages/auth/callback-page.tsx`
  - `apps/docs/src/pages/admin/index.tsx`
  - `apps/docs/src/pages/admin/auth/callback.tsx`
- CIG relay/callback implementation used as reference:
  - `/home/ed/Documents/MAESTRIA/SISTEMAS_INTELIGENTES/CIG-2/apps/dashboard/app/auth/login/[provider]/route.ts`
  - `/home/ed/Documents/MAESTRIA/SISTEMAS_INTELIGENTES/CIG-2/apps/dashboard/app/auth/login-callback/route.ts`
  - `/home/ed/Documents/MAESTRIA/SISTEMAS_INTELIGENTES/CIG-2/packages/auth/src/authentik.ts`
