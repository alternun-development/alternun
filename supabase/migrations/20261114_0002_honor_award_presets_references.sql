-- Honor awards, part 2: art presets and per-stay grants (Hoteles Taybo).
--
-- art_preset picks the built-in art the app draws when a recipe has no image of its own
-- (for example "golf_mangrove" for the Manglar Verde golf medals, "coast" for hotel medals).
-- Unknown presets fall back to the generic crest, so new presets need no migration.
--
-- A grant can carry a reference, such as a hotel reservation number. Hotel medals are given
-- once per stay: the same person can hold the same hotel medal several times, one per
-- reservation, and a reservation is used only once per medal. Without a reference a recipe
-- is still given once per person.

begin;

alter table public.honor_award_recipes
  add column art_preset text,
  add constraint honor_award_recipes_art_preset_chk check (
    art_preset is null or art_preset ~ '^[a-z0-9_]{1,40}$'
  );

alter table public.honor_award_grants
  add column reference text,
  add constraint honor_award_grants_reference_chk check (
    reference is null or char_length(btrim(reference)) between 1 and 80
  );

drop index public.honor_award_grants_user_recipe_uidx;

create unique index honor_award_grants_user_recipe_uidx
  on public.honor_award_grants (recipe_id, user_id, coalesce(lower(reference), ''))
  where recipient_type = 'user' and source = 'manual' and status <> 'revoked';

create unique index honor_award_grants_recipe_reference_uidx
  on public.honor_award_grants (recipe_id, lower(reference))
  where reference is not null and status <> 'revoked';

commit;
