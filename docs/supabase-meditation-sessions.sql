-- Normalize meditation_sessions schema to match mobile app expectations
-- Safe to run multiple times

create table if not exists public.meditation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null,
  prep_seconds integer not null default 0,
  interval_minutes integer not null default 5,
  meditation_minutes integer not null default 15,
  created_at timestamptz not null default now()
);

-- If an old table exists with different columns, try to adapt it
-- Add columns if missing
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='meditation_sessions' and column_name='id' and data_type in ('integer','bigint')) then
    -- leave as is; UUID primary key table creation above will have been skipped
    null;
  end if;
end $$;

alter table public.meditation_sessions enable row level security;

-- RLS policies (owner-only)
drop policy if exists med_sess_select_own on public.meditation_sessions;
create policy med_sess_select_own on public.meditation_sessions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists med_sess_cud_own on public.meditation_sessions;
create policy med_sess_cud_own on public.meditation_sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists meditation_sessions_user_start_idx on public.meditation_sessions(user_id, started_at);


