# Issue #244: fix(infra): narrow orphan exemption in planCertificatePreservation to avoid masking interrupted creates

**Status:** open
**Created:** 2026-10-08T17:55:40Z
**Updated:** 2026-10-09T15:14:59Z
**Author:** edcalderon (@edcalderon)
**URL:** https://github.com/alternun-development/alternun/issues/244

## Description

## Context

PR #243 review (chatgpt-codex-connector, P1): `planCertificatePreservation` (packages/infra/scripts/preserve-certificate-state.mjs, commit 16b14e54) treats any pending `creating` operation whose resource URN is absent from `latest.resources` as orphaned/safe-to-ignore.

That exemption was built to unblock a specific, verified case: a `command:local:Command` build-step resource removed from state via `sst state remove`, leaving a stale pending-operation entry that blocked every subsequent deploy.

The bot's point: an absent URN is also the signature of a genuinely **interrupted create** elsewhere in the stack — Pulumi may not have written the resource into the checkpoint yet, so it doesn't know whether the real cloud resource exists. Treating that as benign and letting `sst state remove` mutate the checkpoint anyway risks corrupting an indeterminate state. See Pulumi's Recovering from Interrupted Updates guidance (https://www.pulumi.com/docs/iac/concepts/state-and-backends/#recovering-from-interrupted-updates).

## Fix needed

Narrow the exemption so it only applies to pending operations we can positively identify as safe (e.g. match by resource `type` against a known-safe allowlist like `command:local:Command`, or some other signal that distinguishes "intentionally removed build resource" from "create interrupted mid-flight"), rather than exempting every URN-absent pending operation unconditionally.

## Why deferred

Not the current failure mode blocking `alternun-prod-pipeline`/airs.alternun.co (tracked and fixed separately in PR #243). Shipping the prod-pipeline fix now; this is a correctness hardening follow-up for a narrower edge case (concurrent interrupted create during a cert migration run).

Co-Authored-By: Claude Code <noreply@anthropic.com>

## Labels

type:task, area:infra, status:planned, priority:p1

## Assignees

edcalderon
