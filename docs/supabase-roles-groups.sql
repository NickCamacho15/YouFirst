-- Roles, Groups, and Plan Assignments schema
-- Safe to run multiple times (idempotent)

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- =====================
-- Groups
-- =====================
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  access_code text not null,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (access_code)
);

create index if not exists groups_created_by_idx on public.groups(created_by);

-- Enable RLS
alter table public.groups enable row level security;

-- =====================
-- Users: role and group membership
-- =====================
alter table public.users
  add column if not exists role text check (role in ('admin','user'));

do $$
begin
  -- Add group_id column if missing
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'group_id'
  ) then
    alter table public.users add column group_id uuid;
  end if;

  -- Add FK constraint if missing
  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.users'::regclass
      and c.conname = 'users_group_id_fkey'
  ) then
    alter table public.users
      add constraint users_group_id_fkey
      foreign key (group_id) references public.groups(id) on delete set null;
  end if;
end $$;

-- Ensure RLS is enabled on users
alter table public.users enable row level security;

-- =====================
-- Plan Assignments
-- =====================
create table if not exists public.plan_assignments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.training_plans(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  assigned_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  unique (plan_id, user_id)
);

-- Helpful indexes
create index if not exists plan_assignments_user_id_idx on public.plan_assignments(user_id);
create index if not exists plan_assignments_plan_id_idx on public.plan_assignments(plan_id);
create index if not exists plan_assignments_assigned_by_idx on public.plan_assignments(assigned_by);

-- Enable RLS
alter table public.plan_assignments enable row level security;


