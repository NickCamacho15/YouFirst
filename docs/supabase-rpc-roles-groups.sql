-- RPCs for roles, groups, and plan assignments
-- Safe to run multiple times (create or replace)

-- =====================
-- create_admin_group(p_name, p_access_code)
-- Creates a group and promotes caller to admin in that group
-- Returns: id, name, access_code
-- =====================
create or replace function public.create_admin_group(p_name text, p_access_code text)
returns table (id uuid, name text, access_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(p_access_code));
  v_group_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Ensure a users row exists for this auth user (handles race conditions)
  insert into public.users (id, email, display_name)
  select v_uid,
         (select email from auth.users where id = v_uid),
         (select coalesce((select raw_user_meta_data->>'display_name' from auth.users where id = v_uid), split_part((select email from auth.users where id = v_uid),'@',1)))
  on conflict (id) do nothing;

  if v_code is null or length(v_code) = 0 then
    raise exception 'Access code required';
  end if;

  -- Enforce case-insensitive uniqueness
  if exists (select 1 from public.groups g where upper(g.access_code) = v_code) then
    raise exception 'Access code already exists' using errcode = '23505';
  end if;

  insert into public.groups (name, access_code, created_by)
  values (p_name, v_code, v_uid)
  returning groups.id into v_group_id;

  update public.users
    set role = 'admin', group_id = v_group_id
    where id = v_uid;

  return query
    select g.id, g.name, g.access_code from public.groups g where g.id = v_group_id;
end $$;

-- =====================
-- redeem_access_code(p_access_code)
-- Joins caller into a group by access code (case-insensitive)
-- Returns: id, name (no access_code exposure)
-- =====================
create or replace function public.redeem_access_code(p_access_code text)
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(p_access_code));
  v_group_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Ensure a users row exists for this auth user
  insert into public.users (id, email, display_name)
  select v_uid,
         (select email from auth.users where id = v_uid),
         (select coalesce((select raw_user_meta_data->>'display_name' from auth.users where id = v_uid), split_part((select email from auth.users where id = v_uid),'@',1)))
  on conflict (id) do nothing;

  if v_code is null or length(v_code) = 0 then
    raise exception 'Access code required';
  end if;

  select g.id into v_group_id from public.groups g where upper(g.access_code) = v_code;

  if v_group_id is null then
    raise exception 'Invalid access code' using errcode = '22023';
  end if;

  -- Prevent switching groups once set
  if exists (select 1 from public.users u where u.id = v_uid and u.group_id is not null) then
    raise exception 'User already belongs to a group' using errcode = '22023';
  end if;

  update public.users set role = 'user', group_id = v_group_id where id = v_uid;

  return query select g.id, g.name from public.groups g where g.id = v_group_id;
end $$;

-- =====================
-- assign_plan_to_user(p_plan_id, p_user_id)
-- Admin in same group as target user assigns a plan
-- Returns: id (uuid) of plan_assignments row (existing or inserted)
-- =====================
create or replace function public.assign_plan_to_user(p_plan_id uuid, p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_assignment_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Verify caller is admin and in same group as target user
  if not exists (
    select 1
    from public.users me
    join public.users target on target.id = p_user_id
    where me.id = v_uid
      and me.role = 'admin'
      and me.group_id is not null
      and me.group_id = target.group_id
  ) then
    raise exception 'Not authorized to assign plan to this user' using errcode = '28000';
  end if;

  insert into public.plan_assignments (plan_id, user_id, assigned_by)
  values (p_plan_id, p_user_id, v_uid)
  on conflict (plan_id, user_id) do nothing
  returning id into v_assignment_id;

  if v_assignment_id is null then
    select id into v_assignment_id from public.plan_assignments where plan_id = p_plan_id and user_id = p_user_id;
  end if;

  return v_assignment_id;
end $$;


