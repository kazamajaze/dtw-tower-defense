-- DTW Game: add cloud-save payload without deleting existing player data or RLS policies
alter table public.player_saves
  add column if not exists save_data jsonb,
  add column if not exists updated_at timestamptz not null default now();

-- Required for one save row per authenticated user (table is currently empty per screenshot).
create unique index if not exists player_saves_user_id_uidx
  on public.player_saves (user_id);
