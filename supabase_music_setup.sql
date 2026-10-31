-- DTW Tower Defense: music player (CD widget)
-- Everyone (signed in or not) can list and play tracks.
-- Only accounts with app_metadata.role = 'admin' can upload, edit or delete.

-- 1) Public storage bucket for audio files and cover images (20 MB per file).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('music', 'music', true, 20971520,
        array['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg','audio/aac','audio/mp4','audio/x-m4a','audio/webm','audio/flac',
              'image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists music_objects_admin_insert on storage.objects;
create policy music_objects_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'music' and (auth.jwt()->'app_metadata'->>'role') = 'admin');

drop policy if exists music_objects_admin_update on storage.objects;
create policy music_objects_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'music' and (auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check (bucket_id = 'music' and (auth.jwt()->'app_metadata'->>'role') = 'admin');

drop policy if exists music_objects_admin_delete on storage.objects;
create policy music_objects_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'music' and (auth.jwt()->'app_metadata'->>'role') = 'admin');

-- 2) Track list.
create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  artist text check (artist is null or char_length(artist) <= 120),
  audio_path text not null,
  cover_path text,
  sort_order integer not null default 0,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.music_tracks enable row level security;

drop policy if exists music_tracks_read_all on public.music_tracks;
create policy music_tracks_read_all on public.music_tracks
  for select to anon, authenticated using (true);

drop policy if exists music_tracks_admin_insert on public.music_tracks;
create policy music_tracks_admin_insert on public.music_tracks
  for insert to authenticated
  with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

drop policy if exists music_tracks_admin_update on public.music_tracks;
create policy music_tracks_admin_update on public.music_tracks
  for update to authenticated
  using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

drop policy if exists music_tracks_admin_delete on public.music_tracks;
create policy music_tracks_admin_delete on public.music_tracks
  for delete to authenticated
  using ((auth.jwt()->'app_metadata'->>'role') = 'admin');

grant select on public.music_tracks to anon, authenticated;
grant insert, update, delete on public.music_tracks to authenticated;
