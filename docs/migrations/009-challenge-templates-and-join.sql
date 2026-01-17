-- Community / Global Challenge Templates + Opt-in Join
-- Safe to run multiple times (idempotent where possible)
--
-- Summary:
-- - Adds public.challenge_templates (published templates that users can join)
-- - Adds public.global_challenge_publishers allowlist (optional, for curated global publishing)
-- - Adds user_challenges.template_id + uniqueness to prevent double-join
-- - Adds RLS policies for templates
-- - Adds RPC public.join_challenge_template(p_template_id) to clone template into user_challenges

create extension if not exists "pgcrypto";

-- =====================
-- Optional allowlist: who can publish GLOBAL templates
-- (Populate via SQL Editor / service role; clients cannot modify)
-- =====================
create table if not exists public.global_challenge_publishers (
  user_id uuid primary key references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.global_challenge_publishers enable row level security;

drop policy if exists gcp_select_self on public.global_challenge_publishers;
create policy gcp_select_self on public.global_challenge_publishers
  for select to authenticated
  using (user_id = auth.uid());

-- No insert/update/delete policies => client cannot modify allowlist.

-- =====================
-- Challenge templates
-- =====================
create table if not exists public.challenge_templates (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global','group')),
  group_id uuid references public.groups(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  duration_days int not null check (duration_days in (40,70,100)),
  rules text[] not null default '{}',
  start_mode text not null default 'rolling'
    constraint challenge_templates_start_mode_enum_check check (start_mode in ('rolling','fixed')),
  start_date date,
  join_deadline date,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  -- Scope sanity:
  constraint challenge_templates_scope_group_check
    check (
      (scope = 'global' and group_id is null)
      or
      (scope = 'group' and group_id is not null)
    ),
  -- Start sanity:
  constraint challenge_templates_start_date_required_check
    check (
      (start_mode = 'rolling')
      or
      (start_mode = 'fixed' and start_date is not null)
    )
);

create index if not exists challenge_templates_status_idx on public.challenge_templates(status);
create index if not exists challenge_templates_scope_status_idx on public.challenge_templates(scope, status);
create index if not exists challenge_templates_group_status_idx on public.challenge_templates(group_id, status) where group_id is not null;
create index if not exists challenge_templates_created_by_idx on public.challenge_templates(created_by);

alter table public.challenge_templates enable row level security;

-- =====================
-- Link joined templates into user_challenges
-- =====================
alter table public.user_challenges
  add column if not exists template_id uuid references public.challenge_templates(id) on delete set null;

-- Prevent joining the same template twice (NULLs are distinct => personal challenges unaffected)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_challenges_user_template_unique'
      and conrelid = 'public.user_challenges'::regclass
  ) then
    alter table public.user_challenges
      add constraint user_challenges_user_template_unique unique (user_id, template_id);
  end if;
end $$;

create index if not exists user_challenges_template_id_idx on public.user_challenges(template_id);

-- =====================
-- RLS policies: public.challenge_templates
-- Requires helper functions from roles/groups script:
-- - public.current_user_role()
-- - public.current_user_group_id()
-- =====================

-- Everyone authenticated can see published GLOBAL templates
drop policy if exists challenge_templates_select_published_global on public.challenge_templates;
create policy challenge_templates_select_published_global on public.challenge_templates
  for select to authenticated
  using (scope = 'global' and status = 'published');

-- Group members can see published GROUP templates for their group
drop policy if exists challenge_templates_select_published_group on public.challenge_templates;
create policy challenge_templates_select_published_group on public.challenge_templates
  for select to authenticated
  using (scope = 'group' and status = 'published' and group_id = public.current_user_group_id());

-- Creators can see their own templates (including drafts)
drop policy if exists challenge_templates_select_own on public.challenge_templates;
create policy challenge_templates_select_own on public.challenge_templates
  for select to authenticated
  using (created_by = auth.uid());

-- Group admins can manage GROUP templates in their group
drop policy if exists challenge_templates_cud_group_admin on public.challenge_templates;
create policy challenge_templates_cud_group_admin on public.challenge_templates
  for all to authenticated
  using (
    scope = 'group'
    and public.current_user_role() = 'admin'
    and group_id = public.current_user_group_id()
  )
  with check (
    scope = 'group'
    and public.current_user_role() = 'admin'
    and group_id = public.current_user_group_id()
    and created_by = auth.uid()
  );

-- Curated publishing for GLOBAL templates (allowlist)
drop policy if exists challenge_templates_cud_global_publisher on public.challenge_templates;
create policy challenge_templates_cud_global_publisher on public.challenge_templates
  for all to authenticated
  using (
    scope = 'global'
    and (
      public.current_user_role() = 'admin'
      or exists (select 1 from public.global_challenge_publishers p where p.user_id = auth.uid())
    )
  )
  with check (
    scope = 'global'
    and (
      public.current_user_role() = 'admin'
      or exists (select 1 from public.global_challenge_publishers p where p.user_id = auth.uid())
    )
    and created_by = auth.uid()
  );

-- =====================
-- RPC: join_challenge_template(p_template_id uuid)
-- Clones template into user_challenges (so existing mobile challenge UI works unchanged)
-- Returns: challenge_id (uuid)
-- =====================
create or replace function public.join_challenge_template(p_template_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_t public.challenge_templates%rowtype;
  v_start date;
  v_challenge_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select *
    into v_t
  from public.challenge_templates t
  where t.id = p_template_id
    and t.status = 'published'
    and (
      (t.scope = 'global')
      or
      (t.scope = 'group' and t.group_id = public.current_user_group_id())
    );

  if not found then
    raise exception 'Challenge template not found or not accessible' using errcode = '22023';
  end if;

  if v_t.start_mode = 'fixed' then
    v_start := v_t.start_date;
    if v_t.join_deadline is not null and current_date > v_t.join_deadline then
      raise exception 'Join window has closed' using errcode = '22023';
    end if;
  else
    v_start := current_date;
  end if;

  insert into public.user_challenges (
    user_id,
    title,
    description,
    duration_days,
    start_date,
    share_code,
    status,
    rules,
    template_id
  )
  values (
    v_uid,
    v_t.title,
    v_t.description,
    v_t.duration_days,
    v_start,
    null,
    'active',
    v_t.rules,
    v_t.id
  )
  on conflict (user_id, template_id) do nothing
  returning id into v_challenge_id;

  if v_challenge_id is null then
    select c.id into v_challenge_id
    from public.user_challenges c
    where c.user_id = v_uid and c.template_id = v_t.id
    limit 1;
  end if;

  return v_challenge_id;
end $$;

grant execute on function public.join_challenge_template(uuid) to authenticated;

