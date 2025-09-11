create extension if not exists pgcrypto;

create table if not exists public.user_daily_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  component text not null check (component in ('intention_morning','intention_evening','tasks','workout','reading','prayer_meditation')),
  completed boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (user_id, day, component)
);

alter table public.user_daily_overrides enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_daily_overrides' and policyname='select_own'
  ) then
    create policy select_own on public.user_daily_overrides for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_daily_overrides' and policyname='insert_own'
  ) then
    create policy insert_own on public.user_daily_overrides for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_daily_overrides' and policyname='update_own'
  ) then
    create policy update_own on public.user_daily_overrides for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists user_daily_overrides_day_idx on public.user_daily_overrides (day);
create index if not exists user_daily_overrides_component_idx on public.user_daily_overrides (component);


