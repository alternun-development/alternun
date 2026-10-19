# Issue #73: Integrate Supabase JWT validation and RLS claims with Authentik

**Status:** open
**Created:** 2026-03-07T23:04:44Z
**Updated:** 2026-10-09T15:13:51Z
**Author:** edcalderon (@edcalderon)
**URL:** https://github.com/alternun-development/alternun/issues/73

## Description

## Summary

Integrate Supabase JWT validation and application authorization with Authentik-issued tokens.

Parent: #69

## Scope

- Configure Supabase to trust Authentik-issued JWTs
- Validate issuer, audience, signing algorithm, and key-distribution approach
- Map Authentik claims to the application authorization model
- Confirm Postgres RLS policies can consume the required claims
- Add minimal end-to-end validation for login, token issuance, and Supabase access
- Update application auth configuration where required for web, mobile, or backend consumers

## Deliverables

- Documented JWT validation configuration for Supabase
- Verified claim mapping for authorization
- End-to-end test or validation procedure covering the main flow

## Acceptance Criteria

- Valid Authentik tokens are accepted by Supabase
- Invalid or malformed tokens are rejected
- Required claims are available for RLS decisions
- The end-to-end flow from login to authorized Supabase access is validated

## Dependencies

- Architecture/JWT contract issue completed
- Authentik runtime issue completed enough to issue real tokens

## Labels

type:feature, area:identity, area:api, status:needs-validation, priority:p0

## Assignees

edcalderon
