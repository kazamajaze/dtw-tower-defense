-- DTW Tower Defense: Inbox + Redeem Code
begin;
create table if not exists public.inbox_messages(
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 body text not null,
 created_at timestamptz not null default now()
);
alter table public.inbox_messages enable row level security;
drop policy if exists "Players read own inbox" on public.inbox_messages;
create policy "Players read own inbox" on public.inbox_messages for select to authenticated using(recipient_id=auth.uid());
grant select on public.inbox_messages to authenticated;
revoke all on public.inbox_messages from anon;

alter table public.inbox_messages add column if not exists reward_character_id text;

create table if not exists public.inbox_message_claims(
 message_id uuid not null references public.inbox_messages(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 claimed_at timestamptz not null default now(),
 primary key(message_id,user_id)
);
alter table public.inbox_message_claims enable row level security;
grant select on public.inbox_message_claims to authenticated;
drop policy if exists "Players read own inbox claims" on public.inbox_message_claims;
create policy "Players read own inbox claims" on public.inbox_message_claims for select to authenticated using(user_id=auth.uid());
revoke insert,update,delete on public.inbox_message_claims from anon,authenticated;

create table if not exists public.redeem_codes(
 code text primary key,
 reward_shards integer not null check(reward_shards>0),
 max_uses integer not null check(max_uses>0),
 uses integer not null default 0 check(uses>=0),
 active boolean not null default true,
 expires_at timestamptz,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.redeem_codes enable row level security;
drop policy if exists "Admin manages redeem codes" on public.redeem_codes;
create policy "Admin manages redeem codes" on public.redeem_codes for all to authenticated
using((auth.jwt()->'app_metadata'->>'role')='admin')
with check((auth.jwt()->'app_metadata'->>'role')='admin' and created_by=auth.uid());
grant select,insert,update,delete on public.redeem_codes to authenticated;
revoke all on public.redeem_codes from anon;

create table if not exists public.redeem_code_claims(
 code text not null references public.redeem_codes(code) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 claimed_at timestamptz not null default now(),
 primary key(code,user_id)
);
alter table public.redeem_code_claims enable row level security;
revoke all on public.redeem_code_claims from anon, authenticated;

create or replace function public.send_broadcast_mail(p_title text,p_body text,p_character_id text default null)
returns integer language plpgsql security definer set search_path=public,auth as $$
declare n integer;
begin
 if auth.uid() is null or (auth.jwt()->'app_metadata'->>'role')<>'admin' then raise exception 'Admin only'; end if;
 if length(trim(p_title)) not between 1 and 100 or length(trim(p_body)) not between 1 and 2000 then raise exception 'Invalid title or message'; end if;
 insert into public.inbox_messages(recipient_id,title,body,reward_character_id)
 select id,trim(p_title),trim(p_body),p_character_id from auth.users where id<>auth.uid();
 get diagnostics n=row_count;
 return n;
end $$;

create or replace function public.redeem_game_code(p_code text)
returns integer language plpgsql security definer set search_path=public,auth as $$
declare c public.redeem_codes%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select * into c from public.redeem_codes where code=upper(trim(p_code)) for update;
 if not found or not c.active then raise exception 'Invalid code'; end if;
 if c.expires_at is not null and c.expires_at<=now() then raise exception 'Code expired'; end if;
 if c.uses>=c.max_uses then raise exception 'Code usage limit reached'; end if;
 insert into public.redeem_code_claims(code,user_id) values(c.code,auth.uid());
 update public.redeem_codes set uses=uses+1 where code=c.code;
 return c.reward_shards;
exception when unique_violation then raise exception 'You already redeemed this code'; end $$;
revoke all on function public.send_broadcast_mail(text,text) from public,anon;
revoke all on function public.send_broadcast_mail(text,text,text) from public,anon;
grant execute on function public.send_broadcast_mail(text,text,text) to authenticated;

create or replace function public.claim_inbox_character(p_message_id uuid)
returns text language plpgsql security definer set search_path=public,auth as $
declare character_id text;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select reward_character_id into character_id from public.inbox_messages where id=p_message_id and recipient_id=auth.uid();
 if not found or character_id is null then raise exception 'No character gift in this message'; end if;
 insert into public.inbox_message_claims(message_id,user_id) values(p_message_id,auth.uid());
 return character_id;
exception when unique_violation then raise exception 'You already claimed this character'; end $;
revoke all on function public.claim_inbox_character(uuid) from public,anon;
grant execute on function public.claim_inbox_character(uuid) to authenticated;
revoke all on function public.redeem_game_code(text) from public,anon;
grant execute on function public.send_broadcast_mail(text,text) to authenticated;
grant execute on function public.redeem_game_code(text) to authenticated;
commit;
