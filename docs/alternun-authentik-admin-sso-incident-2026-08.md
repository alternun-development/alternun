# Alternun Admin Authentik SSO Incident - August 2026

This document records two production incidents on the admin login path (`admin.alternun.co` / `alternun-admin` at `sso.alternun.co`) during August 2026, and the fixed, current state. It exists so a future release does not silently reintroduce either bug.

## Summary

Two distinct issues surfaced back-to-back on the same login path:

1. **Infinite Google-login redirect loop** — logging into the admin app via Google looped between AIRS/Authentik/Google indefinitely and never reached `admin.alternun.co`.
2. **"Permission denied" after successful login** — once (1) was fixed, `sso.alternun.co/application/o/authorize/...` for `alternun-admin` returned "Permission denied" for a specific user even though authentication itself succeeded.

Both are now fixed and confirmed working in production. Root causes were unrelated to each other:

- (1) was a bug in Alternun's custom Authentik hotfix code.
- (2) was Authentik's access-control policy working as designed — the user simply wasn't in an authorized group yet.

## Incident 1: Redirect loop — outer-flow `SourceStage` architecture

### Background

Alternun's admin login uses a custom **outer-flow SourceStage** pattern on top of stock Authentik, implemented as a runtime hotfix applied by `packages/infra/scripts/templates/deploy-authentik.sh` (function `apply_authentik_source_stage_hotfix`), which patches `authentik/enterprise/stages/source/stage.py` inside the live `identity-server-1` container on every identity deploy.

The pattern:

- `SourceStageView` suspends the current flow, creates a `FlowToken` that pickles the current `FlowPlan`, stores an override token in the session (`SESSION_KEY_OVERRIDE_FLOW_TOKEN`), and sends the browser to the source's login button (e.g. Google).
- The source flow it hands off to has a dynamic in-memory final stage, `SourceStageFinal` (`in_memory_stage(SourceStageFinal)`, stored under `SESSION_KEY_SOURCE_FLOW_STAGES`), injected so it runs at the end of whichever flow the source flow manager picks (authentication or enrollment).
- When `SourceStageFinal.dispatch()` runs, it reads the override `FlowToken` back out of the session, restores the original suspended `FlowPlan`, merges context, and calls `plan.to_redirect(self.request, token.flow)` to resume the _original_ flow (e.g. the admin app's flow) — completing the handoff.

### Root cause

The hotfix's `SourceStageFinal.dispatch()` popped the three session keys (`SESSION_KEY_OVERRIDE_FLOW_TOKEN`, `SESSION_KEY_SOURCE_FLOW_STAGES`, `SESSION_KEY_SOURCE_FLOW_CONTEXT`) **before** `plan.to_redirect(...)` ran instead of after. `to_redirect` needs `SESSION_KEY_PLAN` intact to hand execution back to the flow executor; popping the override-flow bookkeeping first left the resumed flow with no way to tell it had already been restored, so `SourceStageView.dispatch()` kept treating every pass as a fresh suspend-and-redirect, looping forever.

### Fix

`SourceStageFinal.dispatch()` must:

1. Redirect first: `response = plan.to_redirect(self.request, token.flow)`
2. Only then pop the three session keys
3. Only then attempt `token.delete()`, tolerating `ValueError` if the token's `token_ptr_id` was already cleared by the redirect

This ordering is now baked into `apply_authentik_source_stage_hotfix` in `packages/infra/scripts/templates/deploy-authentik.sh`. The function is **self-healing**: it detects and repairs both the old buggy live variant and stock (unpatched) `stage.py`, and is reapplied on every identity redeploy (see `packages/infra/README.md`), so a routine redeploy cannot silently reintroduce the buggy ordering.

Regression coverage: `packages/infra/test/deploy-authentik-runtime-hotfix.test.ts`.

## Incident 2: "Permission denied" — group-gated admin access

### Background

The `alternun-admin` Authentik application is protected by an expression policy, `alternun-admin-access`, bound to the application with `order=0` (`bootstrap-authentik-integrations.py`, `upsert_expression_policy` + `ensure_policy_binding`). The policy expression checks:

```python
allowed_groups = set([...])  # admin_group env value ∪ {"authentik Admins", "Alternun Dashboard Admins"}
if user.groups.filter(name__in=list(allowed_groups)).exists():
    return True
return False
```

`admin_group` defaults to `ALTERNUN_BOOTSTRAP_ADMIN_GROUP` (falls back to `"authentik Admins"`). In practice, the durable allow-list for `alternun-admin` is membership in **either** `Alternun Dashboard Admins` **or** `authentik Admins`.

### Root cause

This was **not a bug**. User `edward` authenticated successfully via Google/Authentik but was not a member of `Alternun Dashboard Admins` or `authentik Admins`, so the policy correctly denied access to the `alternun-admin` application.

### Fix

Added `edward` to the `Alternun Dashboard Admins` group directly in the production Authentik database. This is the expected, repeatable procedure for granting a new person admin-dashboard access — it is not something the identity pipeline or bootstrap script should do automatically, since group membership is an authorization decision, not infrastructure state.

## Preventive Rules

- **Do not remove or "simplify" `apply_authentik_source_stage_hotfix`** in `deploy-authentik.sh` — it is the only thing keeping the outer-flow `SourceStage` resume path from regressing to the redirect-loop bug on every identity redeploy. It is idempotent and self-repairing by design; that is intentional, not incidental complexity.
- **Do not remove the `alternun-admin-access` policy binding or its allowed-groups list** in `bootstrap-authentik-integrations.py` — this is the only access gate on the admin OIDC application. Removing it would make `alternun-admin` open to any authenticated user.
- **New admin users must be added to `Alternun Dashboard Admins` or `authentik Admins` explicitly** — a successful Google/Discord login does not imply admin access. "Permission denied" for a real admin candidate means adding them to one of these groups, not touching the policy or the hotfix.
- Any change to `stage.py`'s hotfix logic must preserve the ordering: `to_redirect()` → pop session keys → `token.delete()` (tolerating `ValueError`).

## Related Code Paths

- `packages/infra/scripts/templates/deploy-authentik.sh` (`apply_authentik_source_stage_hotfix`)
- `packages/infra/test/deploy-authentik-runtime-hotfix.test.ts`
- `packages/infra/scripts/templates/bootstrap-authentik-integrations.py` (`build_admin_access_expression`, `alternun-admin-access` policy, `admin_oidc_*` application/provider setup)
- `packages/infra/modules/identity-resources.ts`

## Related Reading

- [Alternun Authentik Social Login Incident - April 2026](./alternun-authentik-social-login-incident-2026-04.md) — the sibling incident on the AIRS mobile/web consumer login path (different app, different root causes)
