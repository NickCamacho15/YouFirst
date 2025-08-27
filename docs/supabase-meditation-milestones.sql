-- Meditation milestones schema and seed
-- Safe to run multiple times (idempotent where possible)

create table if not exists public.meditation_milestones (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  criteria_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_meditation_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  milestone_code text not null references public.meditation_milestones(code) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique(user_id, milestone_code)
);

create index if not exists user_meditation_milestones_user_idx on public.user_meditation_milestones(user_id);
create index if not exists meditation_milestones_code_idx on public.meditation_milestones(code);

alter table public.user_meditation_milestones enable row level security;
alter table public.meditation_milestones enable row level security;

drop policy if exists meditation_milestones_read on public.meditation_milestones;
create policy meditation_milestones_read on public.meditation_milestones
  for select to authenticated using (true);

drop policy if exists user_med_ms_select on public.user_meditation_milestones;
create policy user_med_ms_select on public.user_meditation_milestones
  for select to authenticated using (user_id = auth.uid());

drop policy if exists user_med_ms_cud on public.user_meditation_milestones;
create policy user_med_ms_cud on public.user_meditation_milestones
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Seed (upsert by code)
insert into public.meditation_milestones (code, title, description, criteria_json)
values
  ('first_session', 'First Session', 'Complete your first meditation session', '{"type":"minSessions","value":1}'),
  ('week_warrior', 'Week Warrior', 'Meditate 7 days in a row', '{"type":"dayStreak","value":7}'),
  ('mindful_month', 'Mindful Month', 'Meditate on 30 distinct days', '{"type":"distinctDays","value":30}'),
  ('sacred_40', 'Sacred 40', 'Meditate on 40 distinct days', '{"type":"distinctDays","value":40}'),
  ('quarter_master', 'Quarter Master', 'Meditate on 90 distinct days', '{"type":"distinctDays","value":90}'),
  ('ten_hour_club', '10 Hour Club', 'Accumulate 10 hours of meditation', '{"type":"totalSeconds","value":36000}'),
  ('fifty_sessions', '50 Sessions', 'Complete 50 meditation sessions', '{"type":"minSessions","value":50}'),
  ('hundred_sessions', '100 Sessions', 'Complete 100 meditation sessions', '{"type":"minSessions","value":100}')
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  criteria_json = excluded.criteria_json;


