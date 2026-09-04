# V2 UI Migration — Full-Stack Layout Overhaul

**Feature folder:** `v2-ui-migration`  
**Status:** pending (not yet started)  
**Source design:** `docs/v2-ui/` — desktop.jsx, dashboard.jsx, profile.jsx, components.jsx, tokens.css  
**Feature flag:** `USE_V2_NAV` in `apps/mobile/components/navigation/featureFlags.ts` (currently `false`)

---

## Goal

Migrate the app from its current layout (flat Stack navigation, no persistent chrome) to the V2 design system:

- **Desktop / wide browser (≥720 px):** collapsible sidebar + top bar + main content area
- **Mobile / narrow (< 720 px):** bottom dock with haptic tab switching + per-screen top bars

The two views share the same routes and data — only the chrome differs. The migration must be done behind the existing `USE_V2_NAV` flag so both old and new UI can coexist during development and be toggled without a release.

**Hard requirement: V1 must remain fully functional at all times.** Every phase of the migration must leave the `USE_V2_NAV = false` path working correctly. At any point during development it must be possible to ship V1 to production by flipping one constant.

---

## Design System Reference (docs/v2-ui/)

### Token system — `tokens.css`

All colors, radii, elevations, and typography are in CSS custom properties (`--bg-screen`, `--accent`, `--r-2xl`, `--e1`, etc.) with `.theme-dark` / `.theme-light` overrides. The React Native side must mirror these via a shared token object (or StyleSheet constants).

### Mobile chrome — `dashboard.jsx`

- **TopNavBar:** Airs logo + name, theme toggle, bell, avatar
- **BottomTabBar:** 4 tabs — Inicio (home icon), Portafolio (chart), Explorar (compass), Perfil (user)
- Tabs are bottom-dock style with label + icon, accent color on active

### Desktop chrome — `desktop.jsx`

- **DesktopSidebar:** collapsible (68 px icon-only / 240 px full), lockable open, 6 nav items + 2 support items, Platinum upsell card, animated collapse handle
- **DesktopTopbar:** date/greeting left, ⌘K search center, theme toggle + bell + avatar right
- Sidebar collapse is hover-triggered when unlocked, always-open when locked

### Dashboard page — `dashboard.jsx` + `desktop.jsx`

- **Mobile:** HeroPanel (score + tier + progress), QuickAction row, 2×2 StatCard grid, BenefitCard horizontal scroll, LedgerRow activity list, FilterPill row, CTA buttons
- **Desktop:** DesktopHero (2-col score + sparkline), 4-col StatCard row, projects table (DesktopProjectRow), right column (activity ledger + Donut distribution chart)

### Profile page — `profile.jsx`

- ProfileHeader (avatar initials + score stats + tier badge), TierJourney (step progress rail), Achievements grid (8 items), Settings sections (account + preferences), BottomTabBar

### Shared primitives — `components.jsx`

HeroPanel, StatCard, ProgressBar, FilterPill, StatusPill, Button/ActionButton, IconBadge, Avatar, LedgerRow (same across mobile + desktop)

---

## Current State

| Area          | Current                                       | Target                                        |
| ------------- | --------------------------------------------- | --------------------------------------------- |
| Mobile nav    | `USE_V2_NAV = false` → no dock                | BottomDock enabled, 4 tabs                    |
| Desktop nav   | `_layout.web.tsx` → Stack only, AppInfoFooter | Sidebar + Topbar shell                        |
| Dashboard     | `app/index.tsx`                               | V2 HeroPanel + QuickActions + stats           |
| Profile       | `app/mi-perfil.tsx` (large monolithic file)   | V2 ProfileHeader + TierJourney + Achievements |
| Design tokens | Inline StyleSheet values throughout           | Shared token constants mirroring `tokens.css` |
| Components    | Ad-hoc per-screen                             | Shared primitives in `components/v2/`         |

---

## Tasks

### PHASE −1 — V1/V2 Isolation & Easy Rollback

This phase must be completed **before any V2 code is written**. It ensures V1 and V2 layouts are cleanly separated so either can be shipped independently at any time.

**Task P-1-01: Harden the `USE_V2_NAV` feature flag**  
Files: `apps/mobile/components/navigation/featureFlags.ts`, `app/_layout.tsx`, `app/_layout.web.tsx`

The flag currently exists but is a compile-time constant. Upgrade it:

1. **Runtime override via `AppPreferences`** — store `uiVersion: 'v1' | 'v2'` in `AppPreferencesProvider`. Defaults to `'v1'` (production-safe). `USE_V2_NAV` becomes `preferences.uiVersion === 'v2'`.
2. **Dev menu toggle** — in `settings.tsx`, add a "UI Version" row (dev-only, hidden in production builds via `__DEV__`) that switches between v1 and v2 instantly with `AsyncStorage` persistence.
3. **URL query override (web only)** — `?ui=v2` or `?ui=v1` in the browser URL immediately overrides the stored preference for that session. Useful for QA screenshots and stakeholder demos without a settings screen.
4. **Env var override** — `EXPO_PUBLIC_UI_VERSION=v2` sets the default on build time (CI/staging can pin v2 for integration testing while production stays on v1).

Priority: env var → URL query → stored preference → default (`v1`).

Verify:

- Switching from v1 → v2 and back does not require an app restart
- All auth and wallet flows work identically in both modes
- Production build ships with v1 unless `EXPO_PUBLIC_UI_VERSION=v2` is explicitly set

**Task P-1-02: Segregate V1 layout files into `layouts/v1/`**  
Move (do not delete) current layout components into a versioned folder so they are never accidentally modified during v2 work:

```
apps/mobile/components/layouts/
  v1/
    AppInfoFooter.tsx         ← move from components/common/
    TopNav.tsx                ← extract current per-screen top nav patterns
    ScreenWrapper.tsx         ← current screen padding/safe-area wrapper
  v2/                         ← empty for now, filled in Phase 0+
```

Update all imports. No behavioural change — this is purely a file organisation step.  
Verify: `pnpm tsc --noEmit` passes after the move.

**Task P-1-03: Add V1/V2 smoke tests**  
File: `apps/mobile/app/__tests__/layout-versions.test.ts`

Write two render tests:

1. Render `RootApp` with `uiVersion = 'v1'` — assert dock is absent, `AppInfoFooter` is present
2. Render `RootApp` with `uiVersion = 'v2'` — assert dock is present, `AppInfoFooter` is absent

These tests serve as regression guards: if a V2 change accidentally breaks V1, the first test catches it immediately.  
Verify: both tests pass before any V2 component work begins.

---

### PHASE 0 — Design Token Foundation

**Task P0-01: Extract V2 design tokens to shared constants**  
File: `apps/mobile/components/theme/v2tokens.ts`

- Map all CSS vars from `tokens.css` to TypeScript constants: `COLORS`, `RADII`, `SHADOWS`, `TYPOGRAPHY`
- Two exported palettes: `darkTokens` and `lightTokens`
- All existing inline color values (`#0d0d1f`, `rgba(232,232,255,0.6)`, etc.) across wallet + dashboard components should be migrated to use these constants in subsequent phases
- Verify: no magic hex strings needed once this is in place

**Task P0-02: V2 shared component library scaffold**  
Directory: `apps/mobile/components/v2/`

Create thin React Native wrappers for each v2 primitive from `components.jsx`:

- `HeroPanel.tsx` — AIRS score hero with tier badge + progress bar (already partially in `components/dashboard/`)
- `StatCard.tsx` — single stat with delta indicator + icon
- `LedgerRow.tsx` — activity row (icon + title/subtitle + amount)
- `FilterPill.tsx` — horizontal filter chip (active/inactive)
- `StatusPill.tsx` — tier status badge (BRONZE/SILVER/GOLD/PLATINUM)
- `IconBadge.tsx` — colored icon container (sm/md sizes)
- `SectionHeader.tsx` — uppercase label + optional action link
- `ProgressBar.tsx` — animated fill bar with optional shimmer
- `QuickActionButton.tsx` — icon + label tap button for action row

Each component receives `isDark: boolean` and `accent: string` props (consistent with existing wallet components pattern).  
Verify: all components render without errors in jest-expo jsdom.

---

### PHASE 1 — Mobile Bottom Dock

**Task P1-01: Enable BottomDock and complete tab routing**  
Files: `components/navigation/featureFlags.ts`, `app/_layout.tsx`

- Set `USE_V2_NAV = true` behind a dev-only check or make it runtime-configurable via `AppPreferences`
- Confirm BottomDock renders correctly at all 4 tab states
- Fix any existing animation or z-index issues that occur when dock is enabled
- Dock tabs: `dashboard` → `/`, `portafolio` → `/portafolio`, `explorar` → `/explorar`, `mi-perfil` → `/mi-perfil`
- Verify: dock hidden on `/auth`, `/auth/callback`, `/auth-relay`, `/auth/reset-password`

**Task P1-02: Mobile TopNavBar per screen**  
Files: `components/v2/TopNavBar.tsx`, each screen

Per the v2 design, each main screen gets the same top bar:

- Airs logo mark + "Airs / BY ALTERNUN" wordmark (left)
- Theme toggle + bell (notification count badge) + avatar (right)
- Blur/frosted background, pinned at top, respects safe area inset

Replace current per-screen headers in `index.tsx`, `portafolio.tsx`, `explorar.tsx`, `mi-perfil.tsx` with the shared `TopNavBar`.  
Verify: no double headers, correct safe area padding on iOS and Android.

**Task P1-03: Dashboard screen — V2 mobile layout**  
File: `app/index.tsx`

Replace current dashboard content with the V2 layout from `dashboard.jsx`:

1. TopNavBar (from P1-02)
2. HeroPanel — AIRS score, tier badge, progress to next tier, 30-day delta
3. QuickAction row — Deposit / Transfer / Withdraw / Projects (4 buttons)
4. Stats 2×2 grid — AIRS earned, active projects, balance, CO₂ offset
5. BenefitCard horizontal scroll — tier-specific benefits from API
6. LedgerRow activity list — last 3–5 transactions from activity feed
7. BottomDock (from P1-01)

Data is already available from existing API hooks — wire to v2 components.  
Verify: renders on iOS Simulator, Android emulator, and web (< 720 px viewport).

**Task P1-04: Profile screen — V2 mobile layout**  
File: `app/mi-perfil.tsx`

Refactor the current monolithic `mi-perfil.tsx` to use v2 primitives:

1. ProfileHeader — avatar initials, name, handle, score stats (Airs / projects / CO₂)
2. TierJourney — step rail showing Bronze → Silver → Gold → Platinum with current position
3. Achievements grid — 8 achievement badges (4 columns), locked/unlocked state
4. Wallet section — existing wallet tab content, keep as-is
5. Account / Preferences settings sections — using SettingRow pattern
6. BottomDock

The wallet tab sub-content (WalletManageModal, WalletCreationFlow, etc.) stays intact — only the outer chrome and non-wallet sections get the v2 treatment.  
Verify: wallet flows (create, backup, restore, change PIN) still work correctly after refactor.

---

### PHASE 2 — Desktop Sidebar Layout

**Task P2-01: Desktop shell — sidebar + topbar**  
Files: `app/_layout.web.tsx`, `components/v2/desktop/DesktopShell.tsx`

Create `DesktopShell` component (web-only) that wraps the Stack navigator:

```
┌──────────────────────────────────────────────────────┐
│  DesktopSidebar (68px collapsed / 240px expanded)    │  DesktopTopbar
├──────────────────────────────────────────────────────┤
│  <Stack screens />                                   │
└──────────────────────────────────────────────────────┘
```

Sidebar nav items (from `desktop.jsx`):

- Dashboard, Portafolio, Proyectos, Explorar, Cartera, Actividad (main group)
- Perfil, Ayuda (account group)
- Platinum upsell card (when not collapsed)
- Collapse handle at right edge — hover-expand when unlocked, always-open when locked

DesktopTopbar:

- Date + greeting (left), ⌘K command search (center), theme toggle + bell + avatar (right)

Only rendered when `width >= 720`. Below 720 px, the mobile dock layout takes over.  
Verify: sidebar collapses/expands with animation, tooltips show in collapsed mode, active route highlighted.

**Task P2-02: Desktop Dashboard — wide layout**  
File: `app/index.tsx` (or `app/index.web.tsx` if platform split needed)

When `width >= 720`, render `DesktopDashboard` layout from `desktop.jsx`:

- DesktopHero (2-column: score + sparkline side by side)
- 4-column stat row
- Main grid: projects table (left, 1.8fr) + right column (activity + Donut chart, 1fr)

Below 720 px, keep the mobile V2 layout from P1-03.  
Prefer a single file with `useWindowDimensions` branching over separate `.web.tsx` files unless code diverges significantly.  
Verify: layout reflows correctly when resizing browser window across the 720 px breakpoint.

**Task P2-03: Desktop Profile — wide layout**  
File: `app/mi-perfil.tsx`

When `width >= 720`, show profile in a 2-column layout:

- Left column (40%): ProfileHeader + TierJourney + Achievements
- Right column (60%): Wallet section + Account/Preferences settings

Below 720 px, the single-column mobile layout from P1-04.  
Verify: wallet flows open as modals on both desktop and mobile.

**Task P2-04: ⌘K Command palette (desktop)**  
File: `components/v2/desktop/CommandPalette.tsx`

Triggered by click on search bar or `Ctrl/Cmd + K` keyboard shortcut:

- Modal overlay with fuzzy search input
- Results: screens (navigate), projects (deep link), wallet actions
- Keyboard navigation (↑↓ select, Enter confirm, Esc dismiss)
- Web-only; no-op on native

This is a deferred nice-to-have — implement after P2-01/02/03 are stable.

---

### PHASE 3 — Design Token Rollout & Cleanup

**Task P3-01: Migrate wallet components to V2 tokens**

Replace inline magic colors in all wallet component files with `v2tokens` constants from P0-01:

- `WalletCreationFlow.tsx`, `WalletManageModal.tsx`, `WalletChangePinFlow.tsx`
- `WalletAddAccountFlow.tsx`, `WalletImportKeystoreFlow.tsx`, `WalletRestoreFlow.tsx`
- `PinPad.tsx`, `PinSetupScreen.tsx`, `PinUnlockScreen.tsx`
- `WalletActivityModal.tsx`, `WalletSendModal.tsx`, `WalletReceiveModal.tsx`

Verify: visual appearance unchanged, dark/light modes correct.

**Task P3-02: Remove V1 layout code**

Once V2 is stable behind the flag and manually QA'd on iOS, Android, and web:

- Remove `USE_V2_NAV` flag (always true)
- Delete `_layout.web.tsx` v1 branch code and `AppInfoFooter` positioning
- Delete any components only used by v1 layout
- Remove `featureFlags.ts` if it has no remaining flags

Verify: all routes still work, no orphaned imports.

---

## Acceptance Criteria

- [ ] Mobile: bottom dock visible on all 4 main screens, hidden on auth/modal screens
- [ ] Mobile: TopNavBar consistent across all main screens (no per-screen custom headers)
- [ ] Mobile: Dashboard V2 layout matches `dashboard.jsx` design fidelity
- [ ] Mobile: Profile V2 layout matches `profile.jsx` including TierJourney + Achievements
- [ ] Desktop: sidebar visible and collapsible at ≥720 px
- [ ] Desktop: topbar shows date/greeting + search + user chip
- [ ] Desktop: dashboard shows hero + stat row + projects table + right column
- [ ] Desktop: profile shows 2-column layout
- [ ] Responsive: layout reflows at 720 px breakpoint without flash or layout shift
- [ ] Wallet flows: all wallet modals/screens unaffected by layout refactor
- [ ] Tests: new v2 components have render tests in `__tests__/`
- [ ] i18n: all new strings added to en/es/th catalogs
- [ ] V1/V2 isolation: `USE_V2_NAV = false` path fully works after every commit; V1 can be shipped to production at any point
- [ ] Runtime toggle: switching UI version in Settings (dev) takes effect without app restart
- [ ] URL override: `?ui=v2` forces V2 in browser for QA/demos; `?ui=v1` forces V1
- [ ] Env var: `EXPO_PUBLIC_UI_VERSION=v2` sets default at build time; production default stays `v1`
- [ ] Regression tests: `layout-versions.test.ts` passes for both v1 and v2 render paths
