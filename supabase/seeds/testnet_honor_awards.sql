-- Testnet honor awards: the two "Manglar Verde" medals of Swing Golf Colombia (designs
-- Medalla_Torneo_Swing_Golf_V4 and Medalla_Comunidad_Swing_Golf_V4), supporting the Fundación
-- Batis mangrove project. The ally's team gives them from its manage view
-- (/manage/enterprise/<id> → Galardones → Otorgar un galardón).
--
--   Medalla Torneo     art "golf_mangrove": holographic front, Tour Callaway Colombia 2026,
--                      Pueblo Viejo Country Club (Cota), 21 y 22 de noviembre de 2026, +5 Airs.
--   Medalla Comunidad  art "golf_mangrove_community": grass front, Comunidad Swing Golf 2026,
--                      no venue, the back shows the year it was obtained, +14 Airs.
--
-- Without certification the classification is "Misión de impacto positivo" (not compensation).
--
-- Each medal also gets the project medal that gives it through an Airs report (sending it from
-- the ally desk or redeeming a claim code credits its Airs that way). Its image is the medal art
-- used in the email; pass it as a variable (an https URL on the media bucket):
--
--   psql "$DATABASE_URL" -v medal_image_url='https://…/manglar-verde-badge.png' \
--     -f supabase/seeds/testnet_honor_awards.sql
--
-- Not a migration: run it by hand on testnet after the honor award migrations (up to
-- 20261119_0002_honor_award_claim_codes.sql). Safe to run more than once: each medal is found by
-- its art preset and updated in place. The ally and the project are looked up by slug; if one is
-- missing the link stays empty.

begin;

create temporary table seed_honor_medals on commit drop as
select *
from (
  values
    (
      'golf_mangrove',
      'Como participante del torneo, sumaste a la conservación del bosque de manglar en el Caribe colombiano, junto a la Fundación Batis.',
      'Tour Callaway Colombia',
      'Noviembre 21 y 22 - 2026',
      'Pueblo Viejo Country Club',
      'Cota, Cundinamarca – CO.',
      5,
      10
    ),
    (
      'golf_mangrove_community',
      'Como parte de la comunidad Swing Golf Colombia, sumaste a la conservación del bosque de manglar en el Caribe colombiano, junto a la Fundación Batis.',
      'Comunidad Swing Golf',
      null,
      null,
      null,
      14,
      11
    )
) as medal (art_preset, purpose, event_name, event_dates, venue_name, venue_location, airs_amount, sort_order);

with links as (
  select
    (select id from public.projects where slug = 'fundacion-batis') as project_id,
    (select id from public.enterprises where slug = 'swing-golf-colombia') as partner_id
)
update public.honor_award_recipes recipe
set
  title = 'Manglar Verde',
  classification = 'Misión de impacto positivo',
  purpose = medal.purpose,
  event_name = medal.event_name,
  event_year = 2026,
  event_dates = medal.event_dates,
  venue_name = medal.venue_name,
  venue_location = medal.venue_location,
  airs_amount = medal.airs_amount,
  sort_order = medal.sort_order,
  project_id = links.project_id,
  partner_enterprise_id = links.partner_id,
  is_active = true,
  updated_at = timezone('utc', now())
from seed_honor_medals medal cross join links
where recipe.created_by_subject = 'testnet-honor-awards'
  and recipe.audience = 'user'
  and recipe.tier = 'generic'
  and recipe.art_preset = medal.art_preset;

with links as (
  select
    (select id from public.projects where slug = 'fundacion-batis') as project_id,
    (select id from public.enterprises where slug = 'swing-golf-colombia') as partner_id
)
insert into public.honor_award_recipes (
  kind, tier, audience, title, classification, purpose, event_name, event_year, event_dates,
  venue_name, venue_location, airs_amount, project_id, partner_enterprise_id, sort_order,
  art_preset, created_by_issuer, created_by_subject
)
select
  'medal',
  'generic',
  'user',
  'Manglar Verde',
  'Misión de impacto positivo',
  medal.purpose,
  medal.event_name,
  2026,
  medal.event_dates,
  medal.venue_name,
  medal.venue_location,
  medal.airs_amount,
  links.project_id,
  links.partner_id,
  medal.sort_order,
  medal.art_preset,
  'seed',
  'testnet-honor-awards'
from seed_honor_medals medal cross join links
where not exists (
  select 1 from public.honor_award_recipes existing
  where existing.created_by_subject = 'testnet-honor-awards'
    and existing.audience = 'user'
    and existing.tier = 'generic'
    and existing.art_preset = medal.art_preset
);

-- The project medal behind each award (one per recipe, on the recipe's project).
update public.project_medals medal
set name = left('Manglar Verde · ' || recipe.event_name, 80),
    image_url = :'medal_image_url',
    is_active = true,
    updated_at = timezone('utc', now())
from public.honor_award_recipes recipe
where medal.honor_recipe_id = recipe.id
  and medal.project_id = recipe.project_id
  and recipe.created_by_subject = 'testnet-honor-awards'
  and recipe.art_preset in ('golf_mangrove', 'golf_mangrove_community');

insert into public.project_medals (
  project_id, name, description, image_url, honor_recipe_id, sort_order,
  created_by_issuer, created_by_subject
)
select
  recipe.project_id,
  left('Manglar Verde · ' || recipe.event_name, 80),
  'Galardón de Swing Golf Colombia con la Fundación Batis.',
  :'medal_image_url',
  recipe.id,
  recipe.sort_order,
  'seed',
  'testnet-honor-awards'
from public.honor_award_recipes recipe
where recipe.created_by_subject = 'testnet-honor-awards'
  and recipe.art_preset in ('golf_mangrove', 'golf_mangrove_community')
  and recipe.project_id is not null
  and not exists (
    select 1 from public.project_medals medal
    where medal.honor_recipe_id = recipe.id and medal.project_id = recipe.project_id
  );

commit;
