# @alternun/update

Shared release-update helpers for Alternun web and Expo surfaces.

This package keeps the release detection logic local to the monorepo while staying agnostic about the consuming app:

- generates a versioned manifest from the current package version
- renders a tiny service worker that compares the manifest with the active build
- exposes a React hook that can display a reload toast when a newer release is available

## Build

```bash
pnpm --filter @alternun/update build
```

## Asset Generation

The app build scripts call `scripts/export-assets.mjs` to write:

- `alternun-release-manifest.json`
- `alternun-release-worker.js`

into each app's `public/` directory before the app build runs.

## Runtime Usage

The shared hook is exported from `@alternun/update` and can be mounted by any web or Expo app that wants the reload prompt.

Typical integration:

1. read the current app version from the app's `package.json`
2. pass the version, an optional `auto|on|off` mode, and the app origin into `useReleaseUpdate`
3. show a toast-style reload prompt when the hook reports a newer release

On web, the hook registers the generated service worker and checks the manifest through the browser. On Expo/native runtimes, the same manifest URL is polled directly and the reload action can fall back to the platform-appropriate restart path.

The app-specific wrapper stays in the app, while the service worker and manifest logic stay shared here.
