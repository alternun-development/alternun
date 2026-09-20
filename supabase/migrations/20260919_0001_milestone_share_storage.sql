-- Public celebration artwork only; writes use the API service role.
-- No client INSERT/UPDATE/DELETE policies are granted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('milestone-shares', 'milestone-shares', true, 2097152, array['image/png', 'application/json'])
on conflict (id) do nothing;
