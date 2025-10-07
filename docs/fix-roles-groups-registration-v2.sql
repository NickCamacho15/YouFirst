-- Fix for roles and groups registration issue (v2 - all ambiguous references fixed)
-- Run this SQL in your Supabase SQL editor

-- 1. First, ensure the users table has proper insert policy for new registrations
drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
  for insert to authenticated 
  with check (id = auth.uid());

-- 2. Update the users table update policy to be more permissive for self-updates
drop policy if exists users_update_self_non_admin_fields on public.users;
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated 
  using (id = auth.uid()) 
  with check (id = auth.uid());

-- 3. Grant necessary permissions to the RPC functions
grant all on public.users to authenticated;
grant all on public.groups to authenticated;

-- 4. Update the RPC functions with ALL column references qualified
create or replace function public.create_admin_group(p_name text, p_access_code text)
returns table (id uuid, name text, access_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_code text := upper(trim(p_access_code));
  v_group_id uuid;
  v_email text;
  v_display_name text;
begin
  -- Get auth user ID with proper error handling
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Get user info from auth.users (FIXED: qualified auth.users.id)
  select auth.users.email, coalesce(auth.users.raw_user_meta_data->>'display_name', split_part(auth.users.email,'@',1))
  into v_email, v_display_name
  from auth.users
  where auth.users.id = v_uid;

  -- Ensure a users row exists (with proper error handling)
  insert into public.users (id, email, display_name)
  values (v_uid, v_email, v_display_name)
  on conflict (id) do update 
  set email = excluded.email,
      display_name = coalesce(excluded.display_name, public.users.display_name);

  -- Validate access code
  if v_code is null or length(v_code) = 0 then
    raise exception 'Access code required';
  end if;

  -- Check for existing access code (case-insensitive)
  if exists (select 1 from public.groups g where upper(g.access_code) = v_code) then
    raise exception 'Access code already exists' using errcode = '23505';
  end if;

  -- Create the group
  insert into public.groups (name, access_code, created_by)
  values (p_name, v_code, v_uid)
  returning public.groups.id into v_group_id;

  -- Update user with admin role and group (qualified column to avoid ambiguity)
  update public.users
  set role = 'admin', group_id = v_group_id
  where public.users.id = v_uid;

  -- Verify the update succeeded
  if not found then
    raise exception 'Failed to update user role and group';
  end if;

  -- Return the created group (qualified all columns)
  return query
  select g.id, g.name, g.access_code 
  from public.groups g 
  where g.id = v_group_id;
end $$;

-- 5. Update redeem_access_code with similar improvements
create or replace function public.redeem_access_code(p_access_code text)
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_code text := upper(trim(p_access_code));
  v_group_id uuid;
  v_email text;
  v_display_name text;
begin
  -- Get auth user ID
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Get user info from auth.users (FIXED: qualified auth.users.id)
  select auth.users.email, coalesce(auth.users.raw_user_meta_data->>'display_name', split_part(auth.users.email,'@',1))
  into v_email, v_display_name
  from auth.users
  where auth.users.id = v_uid;

  -- Ensure a users row exists
  insert into public.users (id, email, display_name)
  values (v_uid, v_email, v_display_name)
  on conflict (id) do update 
  set email = excluded.email,
      display_name = coalesce(excluded.display_name, public.users.display_name);

  -- Validate access code
  if v_code is null or length(v_code) = 0 then
    raise exception 'Access code required';
  end if;

  -- Find the group by access code
  select g.id into v_group_id 
  from public.groups g 
  where upper(g.access_code) = v_code;

  if v_group_id is null then
    raise exception 'Invalid access code' using errcode = '22023';
  end if;

  -- Check if user already belongs to a group
  if exists (select 1 from public.users u where u.id = v_uid and u.group_id is not null) then
    raise exception 'User already belongs to a group' using errcode = '22023';
  end if;

  -- Update user with role and group (qualified column to avoid ambiguity)
  update public.users 
  set role = 'user', group_id = v_group_id 
  where public.users.id = v_uid;

  -- Verify the update succeeded
  if not found then
    raise exception 'Failed to update user role and group';
  end if;

  -- Return the group info (qualified all columns)
  return query 
  select g.id, g.name 
  from public.groups g 
  where g.id = v_group_id;
end $$;

-- 6. Add a helper function to verify user setup
create or replace function public.verify_user_setup()
returns table (
  user_id uuid,
  email text,
  role text,
  group_id uuid,
  group_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    u.id,
    u.email,
    u.role,
    u.group_id,
    g.name
  from public.users u
  left join public.groups g on g.id = u.group_id
  where u.id = auth.uid();
end $$;

-- Grant execute permissions
grant execute on function public.create_admin_group(text, text) to authenticated, anon;
grant execute on function public.redeem_access_code(text) to authenticated, anon;
grant execute on function public.verify_user_setup() to authenticated, anon;


