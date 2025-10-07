-- Final fix for ambiguous "id" column reference
-- Changes RETURNS TABLE to use non-conflicting column names

-- =====================================================================
-- Fix create_admin_group() - Use explicit aliases to avoid ambiguity
-- =====================================================================
drop function if exists public.create_admin_group(text, text);
create function public.create_admin_group(p_name text, p_access_code text)
returns table (group_id uuid, group_name text, group_access_code text)
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
  v_username text;
begin
  -- Get auth user ID with proper error handling
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Get user info from auth.users INCLUDING username
  select 
    au.email, 
    coalesce(au.raw_user_meta_data->>'display_name', split_part(au.email,'@',1)),
    au.raw_user_meta_data->>'username'
  into v_email, v_display_name, v_username
  from auth.users au
  where au.id = v_uid;

  -- Ensure a users row exists WITH username
  insert into public.users (id, email, display_name, username)
  values (v_uid, v_email, v_display_name, v_username)
  on conflict (id) do update 
  set 
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.users.display_name),
    username = coalesce(excluded.username, public.users.username);

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

  -- Update user with admin role and group
  update public.users
  set role = 'admin', group_id = v_group_id
  where public.users.id = v_uid;

  -- Verify the update succeeded
  if not found then
    raise exception 'Failed to update user role and group';
  end if;

  -- Return the created group with explicit aliases
  return query
  select g.id as group_id, g.name as group_name, g.access_code as group_access_code
  from public.groups g 
  where g.id = v_group_id;
end $$;

-- =====================================================================
-- Fix redeem_access_code() - Use explicit aliases to avoid ambiguity
-- =====================================================================
drop function if exists public.redeem_access_code(text);
create function public.redeem_access_code(p_access_code text)
returns table (group_id uuid, group_name text)
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
  v_username text;
begin
  -- Get auth user ID
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Get user info from auth.users INCLUDING username
  select 
    au.email, 
    coalesce(au.raw_user_meta_data->>'display_name', split_part(au.email,'@',1)),
    au.raw_user_meta_data->>'username'
  into v_email, v_display_name, v_username
  from auth.users au
  where au.id = v_uid;

  -- Ensure a users row exists WITH username
  insert into public.users (id, email, display_name, username)
  values (v_uid, v_email, v_display_name, v_username)
  on conflict (id) do update 
  set 
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.users.display_name),
    username = coalesce(excluded.username, public.users.username);

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

  -- Update user with role and group
  update public.users
  set role = 'user', group_id = v_group_id 
  where public.users.id = v_uid;

  -- Verify the update succeeded
  if not found then
    raise exception 'Failed to update user role and group';
  end if;

  -- Return the group info with explicit aliases
  return query 
  select g.id as group_id, g.name as group_name
  from public.groups g 
  where g.id = v_group_id;
end $$;

-- Grant execute permissions
grant execute on function public.create_admin_group(text, text) to authenticated, anon;
grant execute on function public.redeem_access_code(text) to authenticated, anon;
