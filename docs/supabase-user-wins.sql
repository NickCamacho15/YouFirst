-- Create user_wins table used for calendar Win Today + streaks
-- Safe to run multiple times

create extension if not exists "pgcrypto";

create table if not exists public.user_wins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  win_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, win_date)
);

alter table public.user_wins enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_wins' and policyname = 'Allow select own wins'
  ) then
    create policy "Allow select own wins"
      on public.user_wins for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_wins' and policyname = 'Allow insert own wins'
  ) then
    create policy "Allow insert own wins"
      on public.user_wins for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_wins' and policyname = 'Allow delete own wins'
  ) then
    create policy "Allow delete own wins"
      on public.user_wins for delete
      using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists user_wins_win_date_idx on public.user_wins (win_date);


