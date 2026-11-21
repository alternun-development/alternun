-- Enterprise mini-pages: photo gallery and translations.
--
-- enterprises.gallery: up to 12 photos for the public enterprise page, in display order:
--   [{ "url": "https://...", "altText": "..." }]
--   The API only accepts https URLs on the project media hosts allowed for gallery_image.
-- enterprises.translations / enterprise_products.translations: the public text in other
--   languages, keyed by locale ("en", "th"). Spanish (the default language) stays in the base
--   columns, and each missing field falls back to it.
--   enterprises:         { "en": { "sector": "...", "description": "..." } }
--   enterprise_products: { "en": { "name": "...", "description": "...", "airsNote": "..." } }
-- Schema only: no partner data.

begin;

alter table public.enterprises
  add column if not exists gallery jsonb not null default '[]'::jsonb,
  add column if not exists translations jsonb not null default '{}'::jsonb;

alter table public.enterprises
  add constraint enterprises_gallery_chk check (
    case when jsonb_typeof(gallery) = 'array' then jsonb_array_length(gallery) <= 12 else false end
  ),
  add constraint enterprises_translations_chk check (jsonb_typeof(translations) = 'object');

alter table public.enterprise_products
  add column if not exists translations jsonb not null default '{}'::jsonb;

alter table public.enterprise_products
  add constraint enterprise_products_translations_chk check (
    jsonb_typeof(translations) = 'object'
  );

notify pgrst, 'reload schema';

commit;
