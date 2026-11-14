-- Testnet sample honor awards: the "Manglar Verde" mission of the Swing Golf Colombia tour
-- (Tour Colombia FCG Callaway 2026), supporting the Fundación Batis mangrove project.
--
-- Not a migration: run it by hand on testnet after 20261114_0001_honor_awards.sql. It is safe
-- to run more than once (a recipe with the same title, tier and audience is not duplicated).
-- The ally and the project are looked up by slug; if one is missing the link stays empty.

begin;

with links as (
  select
    (select id from public.projects where slug = 'fundacion-batis') as project_id,
    (select id from public.enterprises where slug = 'torneo-swing-golf-rincon-cajica') as partner_id
),
recipes (kind, tier, audience, title, airs_amount, sort_order) as (
  values
    ('medal', 'generic', 'user', 'Manglar Verde', 5, 10),
    ('medal', 'gold', 'user', 'Manglar Verde', 15, 11),
    ('medal', 'silver', 'user', 'Manglar Verde', 10, 12),
    ('medal', 'bronze', 'user', 'Manglar Verde', 5, 13),
    ('trophy', 'gold', 'enterprise', 'Aliado Manglar Verde', 0, 20)
)
insert into public.honor_award_recipes (
  kind, tier, audience, title, classification, purpose, event_name, event_year,
  venue_name, venue_location, airs_amount, project_id, partner_enterprise_id, sort_order,
  created_by_issuer, created_by_subject
)
select
  recipes.kind,
  recipes.tier,
  recipes.audience,
  recipes.title,
  'Misión de compensación',
  case recipes.audience
    when 'user' then 'Como participante del torneo, sumaste a la conservación del bosque de manglar en el Caribe colombiano, junto a la Fundación Batis.'
    else 'Por impulsar la conservación del bosque de manglar en el Caribe colombiano con la comunidad del torneo, junto a la Fundación Batis.'
  end,
  'Tour Colombia FCG Callaway',
  2026,
  'Club El Rincón de Cajicá',
  'Cajicá, Cundinamarca – CO.',
  recipes.airs_amount,
  links.project_id,
  links.partner_id,
  recipes.sort_order,
  'seed',
  'testnet-honor-awards'
from recipes cross join links
where not exists (
  select 1 from public.honor_award_recipes existing
  where existing.title = recipes.title
    and existing.tier = recipes.tier
    and existing.audience = recipes.audience
);

commit;
