# Issue #242: Investigate missing email verification delivery during testnet signup

**Status:** open
**Created:** 2026-10-06T19:53:34Z
**Updated:** 2026-10-09T15:15:03Z
**Author:** brannerXD (@brannerXD)
**URL:** https://github.com/alternun-development/alternun/issues/242

## Description

Parent: #100

## Summary

During manual testnet validation on `2026-10-06`, email registration was submitted and the deployed web client displayed `Creating account...`, but the verification email did not arrive in the test inbox or, as far as was checked, its other folders.

The deployed web client reported `v1.1.89-dev.0`, and the API reported version `1.1.91`. No server-side investigation was performed, and the cause was not determined.

This issue should identify the execution and delivery path used by that deployment, establish where delivery stopped, and validate registration, verification, and sign-in end to end without assuming that SMTP, Supabase, Better Auth, the callback, or the client caused the failure.

## Evidence

Manual evidence:

- Date: `2026-10-06`.
- Registration submission reached the `Creating account...` state.
- No verification message was found in the test inbox or the other folders that were reviewed.
- No server logs or delivery-provider events were investigated during the test.

Repository evidence:

- `apps/api/src/common/bootstrap/better-auth-runtime.ts` excludes `/auth/sign-up/email` and `/auth/sign-in/email` from the embedded Better Auth HTTP handler so the Nest endpoints can handle them.
- `apps/api/src/modules/auth-exchange/auth-exchange.controller.ts` routes `POST /auth/sign-up/email` to `SignupService`.
- `apps/api/src/modules/auth-exchange/services/signup.service.ts` selects a sign-up provider, supplies the verification callback, and reports whether verification is required.
- `apps/api/src/modules/auth-exchange/services/signup/signup.provider.factory.ts` selects Better Auth, Supabase, or Authentik through `AUTH_SIGNUP_PROVIDER`; the code default is Supabase.
- `packages/infra/config/pipelines/specs/dashboard.ts` configures `dashboard-dev` to select Better Auth for sign-up, but the effective environment of the validated deployment still needs to be confirmed.
- `apps/api/src/modules/auth-exchange/services/signup/better-auth-signup.provider.ts` invokes the Better Auth sign-up API directly.
- `apps/api/src/modules/better-auth-dev/better-auth-dev.server.ts` requires email verification and connects its verification hook to the backend email sender.
- `apps/api/src/modules/auth-exchange/auth-confirmation.email.ts` loads SMTP configuration from the configured secret reference and sends the verification message.
- `apps/api/src/modules/auth-exchange/services/signup/supabase-signup.provider.ts` uses Supabase `/auth/v1/signup` when Supabase owns registration.
- `apps/api/src/modules/auth-exchange/services/email-verification.service.ts` currently verifies confirmation codes through Supabase `/auth/v1/verify`.
- `apps/api/src/modules/auth-exchange/services/signup/signup.utils.ts` resolves the sign-up provider, callback URL, and Supabase connection configuration.

All cited paths exist on `issue-100-better-auth-validation`.

## Investigation scope

- Confirm the effective `AUTH_SIGNUP_PROVIDER` and callback configuration in the deployed testnet API.
- Reproduce the signup with a controlled test account and a timestamp/correlation identifier.
- Determine whether the account was created and remained unverified.
- Review redacted API logs to determine whether the selected provider attempted to send a verification message.
- If Better Auth handled signup, verify that the email hook ran, SMTP configuration was available, and the delivery provider accepted or rejected the message.
- If Supabase handled signup, inspect the corresponding Supabase Auth mail configuration and delivery result.
- Check delivery-provider suppression, bounce, sender-domain, and template events without recording message contents or credentials.
- Confirm that the verification callback and verification endpoint match the provider that owns signup.
- Review whether `confirmationEmailSent` accurately represents provider acceptance rather than only the need for verification.
- Add sufficient redacted observability to distinguish configuration, provider, delivery, and callback failures.

## Acceptance criteria

- A new testnet registration receives its verification email within a maintainer-approved reasonable interval.
- The user can complete verification using the delivered code or link.
- The verified user can sign in successfully and restore the resulting session.
- The active signup provider, verification owner, callback contract, and delivery configuration are documented.
- Failure logs and metrics identify the delivery stage without exposing addresses, tokens, message contents, or credentials.
- Tests cover provider selection, missing email configuration, provider rejection, successful dispatch, verification, and end-to-end sign-in.
- The testnet validation matrix is updated with the final result and evidence date.

## Dependencies

- Access to redacted `dashboard-dev` API logs and delivery-provider events.
- Access to a controlled test inbox.
- Confirmation of the effective testnet environment configuration.
- Maintainer decision on the authoritative owner of signup and verification if the Better Auth and Supabase paths are not intended to coexist.

## Open questions

- Which sign-up provider was active in the `2026-10-06` deployment?
- Was the verification-send hook reached, and did the delivery provider accept the message?
- Was the destination suppressed, bounced, delayed, or rejected?
- Should verification continue through Supabase when Better Auth owns signup, or should the verification endpoint become provider-aware?
- What delivery interval should be considered acceptable in testnet?
- Is an explicit resend operation required for recovery?

## Labels

type:task, area:identity, area:infra, area:backend, status:in-progress, priority:p1

## Assignees

brannerXD
