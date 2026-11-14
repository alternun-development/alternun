-- Profile avatars: the avatar read also returns the social photo stored at sign-in.
--
-- The app showed initials in the top bar for people who signed in with Google because the
-- photo did not always reach the client session. users.picture (or users.image, written by
-- Better Auth) keeps it, so the person's own avatar read returns it as socialUrl. Only https
-- photos are returned, and only to the person themselves: the leaderboard is unchanged and
-- never shows photos.

begin;

create or replace function public.airs_get_user_avatar(p_user_id text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'kind', u.avatar_kind,
    'ref', u.avatar_ref,
    'art', public.airs_avatar_art(u.avatar_kind, u.avatar_ref),
    'socialUrl', case
      when btrim(coalesce(photo.picture, '')) ~* '^https://' then btrim(photo.picture)
      when btrim(coalesce(photo.image, '')) ~* '^https://' then btrim(photo.image)
    end
  )
  from public.users u
  -- to_jsonb keeps this working on databases where users has no image column.
  cross join lateral (
    select to_jsonb(u) ->> 'picture' as picture, to_jsonb(u) ->> 'image' as image
  ) photo
  where u.id::text = btrim(coalesce(p_user_id, ''));
$$;

revoke all on function public.airs_get_user_avatar(text) from public, anon, authenticated;
grant execute on function public.airs_get_user_avatar(text) to service_role;

commit;
