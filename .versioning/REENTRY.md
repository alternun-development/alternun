# Re-entry Status

Schema: 1.1
Version: 1.0.294
Phase: building

Next micro-step: Fixed mi-perfil.tsx tab-switching bug: ?tab= URL sync effect had 'tabs' in its deps array, but tabs is recreated every render (useAppTranslation's t() isn't memoized) — caused the active tab to snap back to the URL param on every re-render. Fixed by depending only on params.tab, and added router.setParams() to keep the URL in sync when switching tabs via UI. Affects all profile tabs (ranking/wallet/perfil), not wallet-specific. Ready for 1.1.0 release.

Milestone: Alternun Wallet System (non-custodial, multi-chain) (id: wallet-system)
Roadmap: .versioning/ROADMAP.md

## Notes

- This file is generated for stable diffs. Edit ROADMAP.md for long-term planning.
