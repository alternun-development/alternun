# AIRS profile badges

App-owned exports of `assets/Badges AIRS V-1 Assets/`. AIRS runs on Expo in
`apps/mobile`, including the web app; Metro bundles these through static requires.
Do not import the root design files into runtime code.

- `status/`: transparent 256 × 256 lossless WebP, vector reference page 3.
- `milestones/`: transparent 256 × 256 lossless WebP, vector reference page 4.
- `status-3d/`: transparent 512 × 512 lossless WebP, individual named PSD layers,
  used in the profile tier details modal for the larger explanatory display.

Export with Python 3 and `pymupdf==1.28.2 pillow==12.3.0 psd-tools==1.19.0`:

```sh
python apps/mobile/scripts/export-profile-badges.py
```

The script crops artwork without surrounding labels, preserves alpha, fits it into
square canvases without stretching, and retains source files. The milestone PSD
contains a combined photographic composition; the vector PDF provides the clean
individual profile illustrations instead.

`components/profile/badgeAssets.ts` maps existing achievement keys to supplied
artwork. Locked achievements use the empty slot. Other earned achievements keep
their existing icons. The profile header and tier journey use Bronze, Silver and
Gold artwork; Platinum keeps its existing fallback because no Platinum design was
supplied. Earning thresholds and server achievement state are unchanged. The
reference's Bronze 100 AIRS differs from the current application rule (0); changing
that rule requires a coordinated scoring change. Unused milestone exports are
available for future server-supported achievements, not automatically awarded.

## Tier details

Every Tier Journey node opens `components/profile/TierDetailsModal.tsx`, including
unreached tiers. The modal uses the shared `TIERS` thresholds, localized labels,
and 3D status artwork, with an award icon for Platinum. It shows the current,
reached, remaining-score or unavailable-score state without changing progression.
On narrow screens artwork stacks above the text and the content scrolls; desktop
uses the reference’s side-by-side artwork and copy. Close, backdrop, Escape on web,
and the native back action dismiss it.

The reference has placeholder perk text. Until tier-specific entitlements are
approved, the modal explains documented AIRS benefits (verifiable reputation,
eligible ecosystem opportunities and RBI participation) with program eligibility
conditions. Copy is available in English, Spanish and Thai.
