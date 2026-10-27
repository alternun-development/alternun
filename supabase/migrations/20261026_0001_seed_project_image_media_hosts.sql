-- Image media kinds had no allowed hosts, so every logo, cover and gallery image
-- was rejected with MEDIA_HOST_NOT_ALLOWED. Seed the hosts shared by every
-- environment. Environment-specific storage hosts are added by the deploy
-- pipeline from INFRA_PROJECT_MEDIA_IMAGE_HOSTS (scripts/seed-project-media-hosts.mjs).

insert into public.project_media_allowed_hosts (media_kind, host)
values
  ('logo', 'images.unsplash.com'),
  ('cover', 'images.unsplash.com'),
  ('gallery_image', 'images.unsplash.com')
on conflict (media_kind, host) do nothing;
