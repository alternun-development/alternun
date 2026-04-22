# Release Promotion Process

This document defines the maintained release flow for Alternun.

## Branch Ownership

- `develop` is the development source of truth.
- `master` is the production source of truth.
- `version.development.json` is the branch manifest for development releases.
- `version.production.json` is the branch manifest for production releases.

## Regular Development Release

Use this when you are cutting a new testnet/development release from `develop`:

```bash
pnpm release:patch
```

This flow:

- bumps the development version
- updates `version.development.json`
- keeps the workspace packages on the semantic base version
- creates the development release commit and tag
- pushes the release to `develop`

## Production Promotion

Use this when you want to promote an already-cut development release to production:

```bash
pnpm release:patch:promote
```

This flow:

- promotes the current `develop` release to the production branch context
- updates `package.json` plus `version.production.json`
- rebuilds the release artifacts in production mode
- creates the production promotion commit and tag
- opens or updates the pull request into `master`

## Why Two Commands

The repo treats development and production as separate version sources of truth. That keeps the branch manifests explicit and avoids accidentally overwriting one environment while releasing the other.

In practice:

- `release:patch` owns `version.development.json`
- `release:patch:promote` owns `version.production.json` and opens or updates the production PR

## Compatibility

`pnpm release:promote` remains available as a compatibility alias for the same promotion flow.
