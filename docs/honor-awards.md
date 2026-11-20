# Honor awards (Galardones de honor / Legado)

**Status (2026-11-19, v1.2.11): built and on testnet.** Swing Golf Colombia has two medals (Torneo and Comunidad). Its team can send them with Airs from the ally desk or share claim codes, and people redeem the codes in Legado.

Honor awards are special medals and trophies for people (in their **Legado**, "medallas de misión") and for allied enterprises ("Galardones de honor" on their page). Every award is designed by the Alternun design team and is given for a mission, with an ally that supports it and an impact project it contributes to.

Related: [User Airs reports and claiming](airs-user-reports-and-claiming.md), which credit the Airs of an award.

## Model

| Table                            | What it holds                                                                                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `honor_award_recipes`            | The design of an award: title, classification, purpose, event (name, year, `event_dates`), venue, Airs shown, art (`art_preset` or image URLs), project and ally.    |
| `honor_award_grants`             | One award given to one person or enterprise. `pending` until it is claimed in the app (which plays the claim animation), then `claimed`; Super Admins can revoke it. |
| `project_medals.honor_recipe_id` | The project medal that gives a recipe through an Airs report. Its `image_url` is the award art used in emails.                                                       |
| `honor_award_claim_codes`        | Claim codes of an ally's awards (hash only, window, maximum uses, creator, revocation).                                                                              |
| `honor_award_claim_redemptions`  | One row per person and code, with the Airs report or the grant it produced.                                                                                          |
| `honor_award_claim_attempts`     | Every redemption attempt per person, for the attempt limit.                                                                                                          |

Migrations: `20261114_0001`, `20261114_0002`, `20261119_0001_honor_award_event_dates`, `20261119_0002_honor_award_claim_codes`.

Testing tip: a code redeemed, or an award sent, by the same person who created it is a self-report and always waits for another approver (`SELF_REPORT`). Use a second account to test the release.

## Card art

The app draws the cards from recipe data. `art_preset` picks bundled art (`apps/mobile/components/honorAwards/honorAwardArt.ts`):

| Preset                    | Design file                     | Front                                                   |
| ------------------------- | ------------------------------- | ------------------------------------------------------- |
| `golf_mangrove`           | Medalla_Torneo_Swing_Golf_V4    | Holographic foil, Swing Golf mark in ink                |
| `golf_mangrove_community` | Medalla_Comunidad_Swing_Golf_V4 | Grass, white text, mint title, Swing Golf mark in white |
| `coast`                   | Hotel stays                     | Generic crest                                           |

The back prints "Fecha: `event_dates`" when the recipe has dates, otherwise "Obtenida:" with the year (recipes with an event year) or the full date. Mission names and classifications use Sculpin. A bundled ally mark wins over the enterprise `logo_url` on the card, because it is drawn for the card's background.

Medals the person does not hold yet show in grey (locked slots, the medal view on a silver pocket and the card emblem).

Copy rule: without certification the classification is "Misión de impacto positivo", never "compensación".

## Sending an award

From `/manage/enterprise/<id>` → Galardones → "Otorgar un galardón". Who can send: roles with `airs_reports:submit` on the ally (`partner_operator`, `sub_admin`) and Airs global admins (`platform_owner`, `internal_admin`). A `project_moderator` sees "Tu rol no puede otorgar galardones".

- **Award with Airs** (`airs_amount > 0`): the API files an Airs report on the recipe's project, with the recipe's project medal, the amount and the concept "Galardón <title> · <event>". The usual report rules apply: per-recipient daily and monthly limits (testnet 100 / 300), approvers beyond them, self-reports always wait, ledger and audit. When the report is released, `airs_report_award_medal` inserts the user medal and `user_medal_honor_award` creates the pending grant. The recipient email shows the award name and art. People without an account can be sent the award with their name; it waits for them to sign up.
- **Award without Airs**: a direct grant, once per person, or once per reference (for example a hotel reservation).
- The report needs a document number when the project type requires one: the reference typed in the desk, or `GALARDON-<recipe>`.
- A person without an account gets the report in `awaiting_claim`. It is released when they sign in with that email verified: by the sign-in exchange, and also when the app loads their Airs (`POST /v1/airs/onboarding`) or opens Legado (`GET /v1/me/honor-awards`). The exchange alone was not enough: on testnet it fails for Better Auth accounts (`users_email_key`) and the app falls back to its local session without running the claim.
- The email button opens the profile (Legado) when the account exists, and the app root when the person still has to sign up.
- The amount is the recipe's `airs_amount`, edited by Airs admins in the console. Sending an award with Airs needs an active project medal linked to the recipe (`HONOR_AWARD_AIRS_NOT_CONFIGURED` otherwise).

The ally's team needs the ally to be linked to the recipe's project (`enterprise_projects`, for example as `sponsor`), because the report is checked with `airs_report_can_submit`.

## Claim codes

The ally's team creates codes in the same tab ("Códigos para reclamar"): one award, an optional name, how many people can use it (1 to 10,000) and how many days it is valid (1 to 365). People type the code in their profile, Legado → "Reclamar medalla", and get the award and its Airs.

Security model:

- **Codes**: 12 characters of Crockford base32 (60 random bits), shown as `XXXX-XXXX-XXXX`. The API shows the code once; the database keeps only the SHA-256 of the normalized code (upper case, no dashes or spaces, O→0, I/L→1) and the last four characters. Codes never go to logs or the audit trail.
- **Limits**: a window (`starts_at`, `expires_at`, at most 366 days), `max_redemptions`, one redemption per person and code, revocation.
- **Attempts**: after 5 failed attempts in 15 minutes the person gets `HONOR_CODE_RATE_LIMITED`. Malformed codes are refused by the API before reaching the database.
- **One transaction**: `honor_award_redeem_code` (security definer, `service_role` only) takes a per-person advisory lock, locks the code row, checks everything, files the Airs report and records the redemption. Concurrent redemptions cannot pass the maximum.
- **Creator's access is checked at every redemption**: the code acts as its creator (issuer, subject, roles and verified email saved at creation). A global admin must still be active in `platform_admins`; an ally member must still hold `partner_operator` or `sub_admin` on the ally. Otherwise `HONOR_CODE_ISSUER_INACTIVE`. Creating a code requires a verified email.
- **Airs governance stays**: the report goes through the same limits and approvals as any other. Over the limit the redemption is accepted and the medal and Airs wait for an approver; the person is told so.
- Only people with a verified account email can redeem (`HONOR_CODE_ACCOUNT_UNVERIFIED`).

Refusal codes: `HONOR_CODE_INVALID`, `HONOR_CODE_EXPIRED`, `HONOR_CODE_REVOKED`, `HONOR_CODE_NOT_STARTED`, `HONOR_CODE_EXHAUSTED`, `HONOR_CODE_ALREADY_REDEEMED`, `HONOR_CODE_RATE_LIMITED`, `HONOR_CODE_ACCOUNT_UNVERIFIED`, `HONOR_CODE_ISSUER_INACTIVE`, `HONOR_AWARD_NOT_CLAIMABLE`, `HONOR_AWARD_AIRS_NOT_CONFIGURED`.

## API

| Method and path                                                     | Who              | What                                                        |
| ------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------- |
| `GET /v1/me/honor-awards`, `GET …/catalog`, `POST …/:grantId/claim` | Signed-in person | Their awards, the medals still to earn, claim               |
| `POST /v1/me/honor-awards/redeem` `{ code }`                        | Signed-in person | Redeem a claim code                                         |
| `GET /v1/me/enterprises/:id/manage/honor-awards/recipes`            | Ally granters    | Awards the ally can give                                    |
| `POST …/grants` `{ recipeId, email, recipientName?, reference? }`   | Ally granters    | Send an award; returns `grant` or `airs_report` with status |
| `GET …/codes`, `POST …/codes`, `POST …/codes/:codeId/revoke`        | Ally granters    | List, create (code in the response only) and revoke codes   |
| `POST …/guests/lookup`                                              | Ally granters    | How many of the ally's awards a person holds                |
| `/v1/admin/honor-awards/*`                                          | `medals:manage`  | Recipes and grants from the console                         |

## Operations

Testnet data comes from `supabase/seeds/testnet_honor_awards.sql` (not a migration). It creates or updates the two Swing Golf medals and their project medals on Fundación Batis. Pass the medal art URL (a PNG on the `marketplace-media` bucket):

```bash
psql "$DATABASE_URL_DEV" -v medal_image_url='https://…/projects/<batis-id>/medal/<file>.png' \
  -f supabase/seeds/testnet_honor_awards.sql
```

A new award with Airs needs: a recipe linked to the ally and to a project, an active project medal on that project with `honor_recipe_id` set and an https image, and the ally linked to the project in `enterprise_projects`.

Testing new SQL: the local API (nodemon) applies pending migrations to the testnet database when it restarts. Draft migrations outside `supabase/migrations` and test them inside `begin; … rollback;` first.

## Still open

- Confirm with the ally: the +14 Airs of the community medal are fixed for any purchase, and Swing Golf has signed (the card is delivered to clients).
- Swing Golf's testnet team only has a `project_moderator`; give someone `partner_operator` so they can send awards and create codes.
- Codes are managed from the ally's view; the project manage view and the admin console do not list them yet.
