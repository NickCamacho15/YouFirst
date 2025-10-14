-- ============================================================================
-- CUSTOM PERSONAL RECORDS (ARBITRARY EXERCISES)
-- Created: 2025-10-14
-- Purpose: Allow users to save PRs for any exercise name and keep history
-- ============================================================================

create table if not exists public.personal_records_custom (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  exercise_name text not null,
  pr_lbs numeric not null check (pr_lbs >= 0),
  exercise_library_id uuid references public.exercise_library(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(user_id, exercise_name)
);

create table if not exists public.personal_record_history_custom (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  exercise_name text not null,
  value numeric not null check (value >= 0),
  recorded_at timestamptz not null default now()
);

-- RLS
alter table public.personal_records_custom enable row level security;
alter table public.personal_record_history_custom enable row level security;

create policy prc_select_own on public.personal_records_custom for select to authenticated using (user_id = auth.uid());
create policy prc_cud_own on public.personal_records_custom for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy prhc_select_own on public.personal_record_history_custom for select to authenticated using (user_id = auth.uid());
create policy prhc_insert_own on public.personal_record_history_custom for insert to authenticated with check (user_id = auth.uid());

-- Trigger to set user id automatically if null
create or replace function public.set_user_id_default()
returns trigger language plpgsql security definer as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;$$;

-- Attach trigger
create trigger trg_set_user_id_prc before insert on public.personal_records_custom
for each row execute function public.set_user_id_default();

create trigger trg_set_user_id_prhc before insert on public.personal_record_history_custom
for each row execute function public.set_user_id_default();

-- Helpful indexes
create index if not exists prc_user_exercise_idx on public.personal_records_custom(user_id, exercise_name);
create index if not exists prhc_user_exercise_idx on public.personal_record_history_custom(user_id, exercise_name, recorded_at);
