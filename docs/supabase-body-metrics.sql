-- body_metrics table and RLS
create table if not exists public.body_metrics (
  user_id uuid primary key references public.users(id) on delete cascade,
  gender text not null check (gender in ('male','female')),
  age_years int not null check (age_years between 5 and 120),
  height_inches int not null check (height_inches between 36 and 96),
  weight_lbs numeric not null check (weight_lbs > 0 and weight_lbs < 1500),
  est_body_fat_percent numeric not null check (est_body_fat_percent >= 0 and est_body_fat_percent <= 100),
  updated_at timestamptz not null default now()
);

alter table public.body_metrics enable row level security;

drop policy if exists body_metrics_select_own on public.body_metrics;
create policy body_metrics_select_own on public.body_metrics
  for select to authenticated using (user_id = auth.uid());

drop policy if exists body_metrics_upsert_own on public.body_metrics;
create policy body_metrics_upsert_own on public.body_metrics
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());


