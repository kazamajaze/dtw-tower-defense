-- DTW Tower Defense: RLS hardening
-- Run in Supabase SQL Editor after the existing setup migrations.
-- IMPORTANT: player_saves.save_data is a client-writable JSON document.
-- Owner-only RLS prevents cross-account access, but cannot protect individual
-- JSON keys (shards/wins/collection) from that same owner. See notes below.

begin;

alter table public.game_content enable row level security;
alter table public.redeem_codes enable row level security;
alter table public.player_saves enable row level security;

-- Remove older policies first: permissive policies combine with OR.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename in ('game_content','redeem_codes','player_saves')
  loop
    execute format('drop policy if exists %I on %I.%I',
      p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Shared content: authenticated players may read; only app_metadata admins write.
create policy game_content_read_authenticated
on public.game_content for select to authenticated using (true);
create policy game_content_insert_admin
on public.game_content for insert to authenticated
with check (
  (auth.jwt()->'app_metadata'->>'role')='admin'
  and updated_by=auth.uid()
);
create policy game_content_update_admin
on public.game_content for update to authenticated
using ((auth.jwt()->'app_metadata'->>'role')='admin')
with check (
  (auth.jwt()->'app_metadata'->>'role')='admin'
  and updated_by=auth.uid()
);

-- Redeem-code rows are managed only by admins. Players redeem via RPC.
create policy redeem_codes_admin_all
on public.redeem_codes for all to authenticated
using ((auth.jwt()->'app_metadata'->>'role')='admin')
with check (
  (auth.jwt()->'app_metadata'->>'role')='admin'
  and (created_by is null or created_by=auth.uid())
);

-- Each signed-in user may access only their own save row.
create policy player_saves_select_own
on public.player_saves for select to authenticated
using (user_id=auth.uid());
create policy player_saves_insert_own
on public.player_saves for insert to authenticated
with check (user_id=auth.uid());
create policy player_saves_update_own
on public.player_saves for update to authenticated
using (user_id=auth.uid())
with check (user_id=auth.uid());

grant select on public.game_content to authenticated;
grant insert,update,select on public.game_content to authenticated;
grant select,insert,update,delete on public.redeem_codes to authenticated;
grant select,insert,update on public.player_saves to authenticated;
revoke all on public.game_content,public.redeem_codes,public.player_saves from anon;

-- Keep RPC execution explicit; their bodies must validate auth.uid(), role,
-- and enforce one-use with UNIQUE(code,user_id) / PRIMARY KEY(message_id,user_id).
revoke all on function public.send_broadcast_mail(text,text,text) from public,anon;
revoke all on function public.redeem_game_code(text) from public,anon;
revoke all on function public.claim_inbox_character(uuid) from public,anon;
grant execute on function public.send_broadcast_mail(text,text,text) to authenticated;
grant execute on function public.redeem_game_code(text) to authenticated;
grant execute on function public.claim_inbox_character(uuid) to authenticated;

commit;

-- SECURITY LIMITATION / REQUIRED NEXT STEP:
-- save_data is JSON owned by the player. A user can still change their own
-- shards/wins/collection by calling player_saves.upsert from DevTools.
-- For real anti-cheat, move balances and character ownership into separate
-- server-managed tables, revoke client INSERT/UPDATE on those tables, and
-- mutate them only inside SECURITY DEFINER RPCs after server-side validation.
-- Do not treat the current client-side match result as authoritative.
