---
sidebar_position: 4.5
---

# Release Update Flow

Alternun uses a small shared release-update package to keep web surfaces aware of new builds.
The goal is simple: when the deployment layer publishes a newer release, the browser should notice it and offer a reload prompt.

## Why This Exists

Web apps can keep running an older bundle long after a new release has been deployed.
For Alternun that matters because:

- auth and session changes should arrive without a hard refresh hunt
- deployment changes should not leave the user on stale UI state
- the reload prompt needs to be reusable across Next.js and Expo web surfaces

## What Powers It

The implementation lives in `packages/update` and is shared by the web apps.

It provides three pieces:

1. a manifest format that records the current release version
2. a small service worker that compares the manifest against the running build
3. a React hook that drives the banner or reload prompt UI

The worker and manifest are generated from the current package version during each app build.

## Build Flow

Each web app runs the asset generator before its own build:

- `apps/web/build.sh`
- `apps/mobile/build.sh`

Those scripts call `packages/update/scripts/export-assets.mjs`, which writes:

- `public/alternun-release-manifest.json`
- `public/alternun-release-worker.js`

The actual app build then ships those files as part of the static bundle.

## Runtime Flow

At runtime the banner logic:

1. reads the current app version from the app package
2. registers the release worker
3. fetches the release manifest
4. compares the remote version with the active version
5. prompts the user to reload when a newer build is detected

The hook persists dismissals locally so the banner does not keep reappearing after the user chooses to postpone.

## Mode Switch

The update banner is controlled by a small mode flag:

- `auto`
- `on`
- `off`

Recommended defaults:

- local development: `auto`
- deployed Expo testnet / production: `on`
- temporary disable: `off`

For deployed Expo builds, infra injects `EXPO_PUBLIC_RELEASE_UPDATE_MODE=on`.
Local environment files can keep the mode on `auto` to avoid service-worker noise on loopback hosts.

## Where It Is Mounted

The banner is mounted in the web shell for:

- `apps/web`
- `apps/mobile` web output

Native mobile builds do not use the service worker.

## Relationship To Versioning

The release-update flow is tied to the monorepo versioning system:

- release bumps update the package versions
- the build scripts embed that version into the manifest
- the browser sees a new manifest version and knows a newer release exists

That keeps the user-facing prompt aligned with the same release signal used by the monorepo itself.
