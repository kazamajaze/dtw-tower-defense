-- DTW Tower Defense: secure Admin / Player foundation
-- Run this whole file once in Supabase Dashboard -> SQL Editor -> New query.
-- This assigns Admin to the exact email below via trusted database metadata.
-- Never put a service-role key in the website.

begin;

-- 1) Assign the Admin claim in server-controlled app_metadata.
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin')
where lower(email) = lower('nhatphongnguyenbui@gmail.com');

do $$
begin
  if not exists (
    select 1 from auth.users
    where lower(email) = lower('nhatphongnguyenbui@gmail.com')
  ) then
    raise exception 'Admin email was not found in Supabase Auth. No Admin was assigned.';
  end if;
end $$;

-- 2) One shared published game-content document, separate from player_saves.
create table if not exists public.game_content (
  id text primary key,
  content jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.game_content enable row level security;

drop policy if exists "Authenticated users can read published game content" on public.game_content;
create policy "Authenticated users can read published game content"
on public.game_content for select
to authenticated
using (true);

drop policy if exists "Only admins can insert published game content" on public.game_content;
create policy "Only admins can insert published game content"
on public.game_content for insert
to authenticated
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and updated_by = auth.uid()
);

drop policy if exists "Only admins can update published game content" on public.game_content;
create policy "Only admins can update published game content"
on public.game_content for update
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and updated_by = auth.uid()
);

drop policy if exists "Only admins can delete published game content" on public.game_content;
create policy "Only admins can delete published game content"
on public.game_content for delete
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select, insert, update, delete on public.game_content to authenticated;
revoke all on public.game_content from anon;

commit;

-- After running: sign out of the game and sign back in so the JWT refreshes.
-- Verify in SQL Editor:
-- select email, raw_app_meta_data ->> 'role' as role
-- from auth.users where lower(email)=lower('nhatphongnguyenbui@gmail.com');
