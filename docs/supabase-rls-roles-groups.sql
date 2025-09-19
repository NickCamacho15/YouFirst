-- RLS Policies for roles, groups, plan assignments, and training plans
-- Safe to run multiple times

-- Ensure RLS enabled on relevant tables (DDL script should already do this)
alter table if exists public.users enable row level security;
alter table if exists public.groups enable row level security;
alter table if exists public.plan_assignments enable row level security;
alter table if exists public.training_plans enable row level security;

-- =====================
-- Helper functions to avoid recursive policy evaluation on users
-- =====================
create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select u.role from public.users u where u.id = auth.uid()
$$;

create or replace function public.current_user_group_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select u.group_id from public.users u where u.id = auth.uid()
$$;

-- =====================
-- public.users
-- =====================
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select to authenticated using (id = auth.uid());

drop policy if exists users_update_self_non_admin_fields on public.users;
create policy users_update_self_non_admin_fields on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists users_select_same_group_if_admin on public.users;
create policy users_select_same_group_if_admin on public.users
  for select to authenticated using (
    public.current_user_role() = 'admin' and public.current_user_group_id() is not null and public.current_user_group_id() = public.users.group_id
  );

-- =====================
-- public.groups
-- =====================
drop policy if exists groups_select_member on public.groups;
create policy groups_select_member on public.groups
  for select to authenticated using (
    public.current_user_group_id() = public.groups.id
  );

drop policy if exists groups_cud_admin on public.groups;
create policy groups_cud_admin on public.groups
  for all to authenticated using (
    public.current_user_role() = 'admin' and public.current_user_group_id() = public.groups.id
  ) with check (
    public.current_user_role() = 'admin' and public.current_user_group_id() = public.groups.id
  );

-- Allow initial group creation by the creator (used during admin signup)
drop policy if exists groups_insert_creator on public.groups;
create policy groups_insert_creator on public.groups
  for insert to authenticated
  with check (created_by = auth.uid());

-- =====================
-- public.plan_assignments
-- =====================
drop policy if exists plan_assignments_select_member_or_admin on public.plan_assignments;
create policy plan_assignments_select_member_or_admin on public.plan_assignments
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.users t
      where t.id = public.plan_assignments.user_id
        and public.current_user_role() = 'admin'
        and public.current_user_group_id() = t.group_id
    )
  );

drop policy if exists plan_assignments_cud_admin on public.plan_assignments;
create policy plan_assignments_cud_admin on public.plan_assignments
  for all to authenticated using (
    exists (
      select 1 from public.users t
      where t.id = public.plan_assignments.user_id
        and public.current_user_role() = 'admin'
        and public.current_user_group_id() = t.group_id
    )
  ) with check (
    exists (
      select 1 from public.users t
      where t.id = public.plan_assignments.user_id
        and public.current_user_role() = 'admin'
        and public.current_user_group_id() = t.group_id
    )
  );

-- =====================
-- public.training_plans (assumes owner-only policies exist; add assigned read)
-- =====================
drop policy if exists training_plans_select_owner on public.training_plans;
create policy training_plans_select_owner on public.training_plans
  for select to authenticated using (user_id = auth.uid());

drop policy if exists training_plans_select_assigned on public.training_plans;
create policy training_plans_select_assigned on public.training_plans
  for select to authenticated using (
    exists (
      select 1 from public.plan_assignments pa
      where pa.plan_id = public.training_plans.id
        and pa.user_id = auth.uid()
    )
  );


