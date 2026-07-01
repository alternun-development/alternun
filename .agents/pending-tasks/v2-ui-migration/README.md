# V2 UI Migration — Pending Tasks

Full layout overhaul: desktop sidebar + mobile bottom dock, matching the `docs/v2-ui/` design spec.

## Open items

| Phase | File                       | Summary                     |
| ----- | -------------------------- | --------------------------- |
| P0    | [00-SPEC.md](./00-SPEC.md) | Full spec + all phase tasks |

## Quick task index

| ID    | Task                                           | Phase          |
| ----- | ---------------------------------------------- | -------------- |
| P0-01 | Extract V2 design tokens to `v2tokens.ts`      | 0 — Foundation |
| P0-02 | Scaffold `components/v2/` shared primitives    | 0 — Foundation |
| P1-01 | Enable BottomDock + complete tab routing       | 1 — Mobile     |
| P1-02 | Shared mobile TopNavBar per screen             | 1 — Mobile     |
| P1-03 | Dashboard screen V2 mobile layout              | 1 — Mobile     |
| P1-04 | Profile screen V2 mobile layout                | 1 — Mobile     |
| P2-01 | Desktop shell — DesktopSidebar + DesktopTopbar | 2 — Desktop    |
| P2-02 | Desktop Dashboard wide layout                  | 2 — Desktop    |
| P2-03 | Desktop Profile 2-column layout                | 2 — Desktop    |
| P2-04 | ⌘K Command palette (deferred)                  | 2 — Desktop    |
| P3-01 | Migrate wallet components to V2 tokens         | 3 — Cleanup    |
| P3-02 | Remove V1 layout code + feature flag           | 3 — Cleanup    |

Start with P0-01 → P0-02 → P1-01 in that order. Phase 1 can be demoed independently of Phase 2.
