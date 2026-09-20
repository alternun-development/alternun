# AIRS profile badges

App-owned exports of `assets/Badges AIRS V-1 Assets/`. AIRS runs on Expo in
`apps/mobile`, including the web app; Metro bundles these through static requires.
Do not import the root design files into runtime code.

- `status/`: transparent 256 × 256 lossless WebP, vector reference page 3.
- `milestones/`: transparent 256 × 256 lossless WebP, vector reference page 4.
- `milestones-locked/`: numbered grayscale variants of those vector badges.
- `milestones-3d/`: transparent 512 × 512 metallic badges cropped from the PSD.
- `status-3d/`: transparent 512 × 512 lossless WebP, individual named PSD layers,
  used in the profile tier details modal for the larger explanatory display.

Export with Python 3 and `pymupdf==1.28.2 pillow==12.3.0 psd-tools==1.19.0`:

```sh
python apps/mobile/scripts/export-profile-badges.py
```

The script crops artwork without surrounding labels, preserves alpha, fits it into
square canvases without stretching, and retains source files. The milestone PSD
contains a transparent contact sheet; the exporter isolates its eight badges using
layer-local bounds. Grayscale exports preserve the vector artwork's alpha channel.

`components/profile/badgeAssets.ts` maps all eight numbered milestones to grey
locked artwork and colorful vector earned artwork. Metallic artwork appears in the
details modal; 1080 × 1080 PNG cards in `milestones-share/` attach to celebration posts. The profile displays 10, 50, 100, 500,
1,000, 5,000, 10,000 and 50,000 AIRS milestones. A milestone is shown as earned when
the canonical AIRS balance reaches its threshold or the achievements API already
reports it unlocked. Missing balances do not unlock milestones. This presentation
does not create server awards or change scoring rules. Non-score achievements
continue to rely only on server state, with empty slots when locked and their
existing icons when earned.

The profile header and tier journey use Bronze, Silver and Gold artwork; Platinum
keeps its fallback because no Platinum design was supplied. Tier thresholds stay
unchanged (Bronze starts at 0, despite the design reference showing 100 AIRS).

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

The signed-in account pill reads the shared AIRS dashboard snapshot directly on
all routes, including profile and settings. It uses a neutral surface with a thin metallic tier border, a softly tinted avatar,
and a localized label beside the score; auth metadata is not a balance source. Dashboard
and profile hero panels repeat the tier color in borders and ambient accents.
Unknown balances retain neutral AIRS styling.

Landing contribution CTAs use a consistent 148 × 40 layout. Long CTA and price
labels truncate to one line, while each button keeps its full accessible label.
The account pill shows a neutral skeleton while authentication or the initial AIRS
balance resolves. Background refreshes retain the last known tier; an initial
balance error shows a neutral account control rather than a fabricated tier.

Navbar and dropdown avatars use `TierAvatarBorder`: a thin tier-colored ring with
a slow orbiting highlight. The initials remain stationary. System reduced motion,
low/off app motion preferences, and background visibility suspend the animation.

The dashboard hero's metallic status chip opens the profile. Its adjacent info
control opens a compact modal overlay outside the image's clipping container;
close, backdrop, Escape on web and the native back action dismiss it. The overlay
is viewport-constrained and scrollable for small screens and large text.

The profile badge browser orders completed achievements first. Within each state,
account basics precede numeric AIRS milestones, impact and community badges.
The search/filter bar sits above the achievements card. It reuses `SearchFilterBar`, supports localized labels
and accent-insensitive search (including raw AIRS amounts and 5k/10k/50k aliases),
and paginates the complete catalog eight badges at a time. Search/type changes
reset the page; empty results keep both pagination controls disabled.
Numbered SVG placeholders remain visible during image loading or failure, so an
asset request cannot leave an empty milestone slot.

Clicking a badge opens its details. Only earned AIRS milestones offer celebration
sharing. Supported share sheets receive a PNG attachment and caption; desktop
fallback uses public preview links; Instagram uses a download for manual attachment.
Copy caption and save image remain available; no post is published automatically.

Locked badge details show the numbered grey artwork, AIRS target and remaining
balance, or localized steps for the specific account/community/impact achievement.
Non-score badges remain subject to recorded recognition; the modal does not grant them.
Tier journey nodes have opaque circular backings so muted artwork never reveals
the progress track through its center.

## Personalized public sharing

The achievement modal has an opaque surface. “Create share image” calls
`POST /v1/airs/milestones/share` with only the milestone key and the session bearer
token. The API verifies ownership/earned status and reads the display name from
the account snapshot. It renders a 1080px PNG using the metallic artwork and name,
then publishes it to the public Supabase Storage `milestone-shares` bucket.
Opening the modal alone does not publish anything.

The response contains `displayName`, `amount`, `imageUrl` and `shareUrl`.
`GET /v1/airs/milestones/share/:id` serves escaped HTML with Open Graph and X card
metadata. No email, access token or raw user ID appears in the card or metadata.
The content-addressed key reuses the same card for the same account/name/milestone.

Apply migration `20260919_0001_milestone_share_storage.sql` and configure
`AIRS_SHARE_PUBLIC_API_URL` to the public HTTPS API origin before deployment.
The API requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; these never enter
the client bundle. API builds package the PNG templates and font for Lambda.
Changing renderer layout requires bumping the renderer version used in its key.
Remove both the PNG and JSON objects to revoke a public card (social caches may
retain their own copies). Bucket writes are server-only.

X, Facebook and LinkedIn receive the public preview URL. Their crawlers control
preview timing/caching; a web composer cannot force an uploaded attachment.
Instagram uses device image sharing or a downloaded PNG and copied caption.
Deployment and live crawler validation are required; localhost URLs cannot be
previewed by external social networks.
