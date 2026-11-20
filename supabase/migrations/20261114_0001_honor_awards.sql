-- Honor awards ("Galardones de honor"): special medals and trophies that people and allied
-- enterprises earn for reaching a goal in the app or an ally milestone (a golf tour, a race).
--
-- A recipe is the design of one award: its tier (gold, silver, bronze or generic), who can
-- receive it (a person or an enterprise), the mission it belongs to, the project it supports,
-- the ally that backs it and its art. A grant gives one recipe to one recipient; it waits as
-- "pending" until the recipient claims it in the app (the claim plays the award animation),
-- and Super Admins can revoke it.
--
-- Project medals stay as they are and can point to a recipe: when such a medal is awarded with
-- an Airs report, the person also gets the matching honor award to claim, and it is revoked
-- with the medal.

begin;

create table public.honor_award_recipes (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'medal',
  tier text not null default 'generic',
  audience text not null default 'user',
  title text not null,
  classification text,
  purpose text,
  event_name text,
  event_year integer,
  venue_name text,
  venue_location text,
  airs_amount integer not null default 0,
  badge_image_url text,
  front_image_url text,
  back_image_url text,
  project_id uuid references public.projects(id) on delete set null,
  partner_enterprise_id uuid references public.enterprises(id) on delete set null,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_by_issuer text not null,
  created_by_subject text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint honor_award_recipes_kind_chk check (kind in ('medal', 'trophy')),
  constraint honor_award_recipes_tier_chk check (tier in ('generic', 'gold', 'silver', 'bronze')),
  constraint honor_award_recipes_audience_chk check (audience in ('user', 'enterprise')),
  constraint honor_award_recipes_title_chk check (char_length(btrim(title)) between 1 and 80),
  constraint honor_award_recipes_classification_chk check (
    classification is null or char_length(classification) <= 80
  ),
  constraint honor_award_recipes_purpose_chk check (purpose is null or char_length(purpose) <= 500),
  constraint honor_award_recipes_event_chk check (
    (event_name is null or char_length(event_name) <= 120)
    and (event_year is null or event_year between 2000 and 2100)
  ),
  constraint honor_award_recipes_venue_chk check (
    (venue_name is null or char_length(venue_name) <= 120)
    and (venue_location is null or char_length(venue_location) <= 160)
  ),
  constraint honor_award_recipes_airs_chk check (airs_amount between 0 and 1000000),
  constraint honor_award_recipes_images_chk check (
    (badge_image_url is null or (badge_image_url ~ '^https://[^[:space:]]+$' and char_length(badge_image_url) <= 2048))
    and (front_image_url is null or (front_image_url ~ '^https://[^[:space:]]+$' and char_length(front_image_url) <= 2048))
    and (back_image_url is null or (back_image_url ~ '^https://[^[:space:]]+$' and char_length(back_image_url) <= 2048))
  )
);

create index honor_award_recipes_listing_idx
  on public.honor_award_recipes (audience, is_active, sort_order);

alter table public.honor_award_recipes enable row level security;
revoke all on table public.honor_award_recipes from public, anon, authenticated;
grant select, insert, update on table public.honor_award_recipes to service_role;

create table public.honor_award_grants (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.honor_award_recipes(id) on delete restrict,
  recipient_type text not null,
  user_id text,
  enterprise_id uuid references public.enterprises(id) on delete cascade,
  status text not null default 'pending',
  source text not null default 'manual',
  user_medal_id uuid unique references public.user_medals(id) on delete restrict,
  note text,
  awarded_by_issuer text,
  awarded_by_subject text,
  awarded_at timestamptz not null default timezone('utc', now()),
  claimed_at timestamptz,
  revoked_at timestamptz,
  constraint honor_award_grants_recipient_chk check (
    (recipient_type = 'user' and nullif(btrim(coalesce(user_id, '')), '') is not null and enterprise_id is null)
    or (recipient_type = 'enterprise' and enterprise_id is not null and user_id is null)
  ),
  constraint honor_award_grants_status_chk check (
    status in ('pending', 'claimed', 'revoked')
    and (status <> 'claimed' or claimed_at is not null)
    and (status <> 'revoked' or revoked_at is not null)
  ),
  constraint honor_award_grants_source_chk check (
    (source = 'manual' and user_medal_id is null)
    or (source = 'project_medal' and user_medal_id is not null and recipient_type = 'user')
  ),
  constraint honor_award_grants_note_chk check (note is null or char_length(note) <= 300)
);

-- A recipient holds a recipe once at a time when it is granted by hand; project medals can
-- repeat (one per Airs report).
create unique index honor_award_grants_user_recipe_uidx
  on public.honor_award_grants (recipe_id, user_id)
  where recipient_type = 'user' and source = 'manual' and status <> 'revoked';
create unique index honor_award_grants_enterprise_recipe_uidx
  on public.honor_award_grants (recipe_id, enterprise_id)
  where recipient_type = 'enterprise' and status <> 'revoked';

create index honor_award_grants_user_idx
  on public.honor_award_grants (user_id, awarded_at desc) where user_id is not null;
create index honor_award_grants_enterprise_idx
  on public.honor_award_grants (enterprise_id, awarded_at desc) where enterprise_id is not null;
create index honor_award_grants_recipe_idx on public.honor_award_grants (recipe_id, awarded_at desc);

alter table public.honor_award_grants enable row level security;
revoke all on table public.honor_award_grants from public, anon, authenticated;
grant select, insert, update on table public.honor_award_grants to service_role;

-- A project medal can point to the honor award it gives.
alter table public.project_medals
  add column honor_recipe_id uuid references public.honor_award_recipes(id) on delete set null;

create or replace function public.user_medal_honor_award()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_recipe_id uuid;
begin
  if tg_op = 'INSERT' then
    select medal.honor_recipe_id into v_recipe_id
    from public.project_medals medal
    join public.honor_award_recipes recipe on recipe.id = medal.honor_recipe_id
    where medal.id = new.medal_id and recipe.audience = 'user';

    if v_recipe_id is not null and new.revoked_at is null then
      insert into public.honor_award_grants (
        recipe_id, recipient_type, user_id, source, user_medal_id, awarded_at
      )
      values (v_recipe_id, 'user', btrim(new.user_id), 'project_medal', new.id, new.awarded_at)
      on conflict (user_medal_id) do nothing;
    end if;
  elsif new.revoked_at is not null and old.revoked_at is null then
    update public.honor_award_grants
    set status = 'revoked', revoked_at = new.revoked_at
    where user_medal_id = new.id and status <> 'revoked';
  end if;
  return new;
end;
$$;

revoke all on function public.user_medal_honor_award() from public, anon, authenticated;

create trigger user_medals_honor_award
after insert or update of revoked_at on public.user_medals
for each row execute function public.user_medal_honor_award();

commit;
