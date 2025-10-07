# Registration Issues - Complete Analysis

## Current State for user plzwork@gmail.com

### auth.users (Supabase Auth)
✅ **CORRECT**
- Email: plzwork@gmail.com
- Username in metadata: "plzwork"
- Display name in metadata: "plzwork"

### public.users (Application Database)
❌ **INCORRECT**
- Email: plzwork@gmail.com ✅
- Username: NULL ❌ (should be "plzwork")
- Role: NULL ❌ (should be "admin")
- Group ID: NULL ❌ (should be linked to a group)

### public.groups
❌ **MISSING**
- No group was created with access code "PLZWORK"

## Root Cause Analysis

I've traced through the entire user creation flow and identified **THREE CRITICAL ISSUES** that cause username, role, and group assignment to fail:

### Issue #1: `handle_new_user()` Trigger Doesn't Extract Username

**Location:** Database trigger on `auth.users` table

**Current Code:**
```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1))
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;
```

**Problem:** Only inserts `id`, `email`, and `display_name`. **Username is never extracted from `raw_user_meta_data`.**

**Impact:** When a user registers, their username is lost immediately.

---

### Issue #2: `create_admin_group()` RPC Doesn't Extract or Preserve Username

**Location:** `public.create_admin_group(p_name text, p_access_code text)`

**Current Code:**
```sql
-- Get user info from auth.users with aliases
select au.email, coalesce(au.raw_user_meta_data->>'display_name', split_part(au.email,'@',1))
into v_email, v_display_name
from auth.users au
where au.id = v_uid;

-- Ensure a users row exists
insert into public.users (id, email, display_name)
values (v_uid, v_email, v_display_name)
on conflict (id) do update 
set email = excluded.email,
    display_name = coalesce(excluded.display_name, public.users.display_name);
```

**Problems:**
1. Only fetches `email` and `display_name` from auth.users, **doesn't fetch username**
2. Upserts into public.users with ONLY `id`, `email`, `display_name`
3. The `on conflict` clause means if a row already exists, **it OVERWRITES display_name but leaves username as whatever it was**
4. Since username was never set (due to Issue #1), it remains NULL

**Impact:** Even if the client successfully sets username via `upsertUserRow()`, this RPC wipes it out or leaves it NULL.

---

### Issue #3: `redeem_access_code()` RPC Has Same Username Problem

**Location:** `public.redeem_access_code(p_access_code text)`

**Same Problem:** Also doesn't extract or preserve username from auth.users metadata.

---

### Issue #4: Client `upsertUserRow()` May Be Blocked by RLS or Timing

**Location:** `mobile/lib/auth.ts` line 36-63

**Code:**
```typescript
async function upsertUserRow(user: { id: string; email: string; displayName?: string; username?: string }) {
  try {
    const { error } = await supabase
      .from("users")
      .upsert([{
        id: user.id,
        email: user.email,
        display_name: user.displayName ?? null,
        username: user.username ?? null,
      }], { onConflict: "id" })
    if (error) {
      console.warn("Failed to upsert users row:", error.message)
    }
  } catch (err: any) {
    console.warn("Upsert users row exception:", err?.message || String(err))
  }
}
```

**Problems:**
1. This runs right after `signUp()` but before the session is fully established
2. Even if it succeeds, the RPC calls later will overwrite it
3. Errors are only logged as warnings, not thrown

**Impact:** Username might be set temporarily but gets wiped out by RPC upserts.

---

## The Complete Flow (What Actually Happens)

### Step 1: User clicks "Create Account"
- Username: "plzwork"
- Email: "plzwork@gmail.com"
- Role: "admin"
- Group Name: "Plz Work"
- Access Code: "PLZWORK"

### Step 2: `register()` function is called
```typescript
await register({ 
  email: "plzwork@gmail.com", 
  username: "plzwork", 
  displayName: "plzwork", 
  password: "..." 
})
```

### Step 3: Supabase Auth creates user
- Creates row in `auth.users`
- Stores in metadata: `{ username: "plzwork", display_name: "plzwork" }`

### Step 4: Trigger fires immediately
- `handle_new_user()` trigger executes
- Creates row in `public.users`:
  - id: ✅
  - email: ✅
  - display_name: ✅
  - username: ❌ NULL (not extracted from metadata)

### Step 5: Client tries `upsertUserRow()`
- Tries to update username to "plzwork"
- May succeed or fail (silently logged)
- If succeeds: username = "plzwork" temporarily

### Step 6: Client calls `create_admin_group()` RPC
```typescript
await supabase.rpc('create_admin_group', { 
  p_name: "Plz Work", 
  p_access_code: "PLZWORK" 
})
```

### Step 7: RPC executes
- Fetches email and display_name from auth.users (NO USERNAME)
- Upserts into public.users:
  - id: ✅
  - email: ✅
  - display_name: ✅
  - username: ❌ NULL (overwrites any previous value)
- Creates group... **BUT WAIT**
- If there was an error (like the ambiguous column error), the entire transaction fails
- Group is NOT created
- Role is NOT set
- Username remains NULL

### Final Result
- Username: NULL ❌
- Role: NULL ❌
- Group: Not created ❌

---

## Why Role and Group Are NULL

The `create_admin_group()` RPC failed due to the "column reference 'id' is ambiguous" error we saw in the logs. This means:

1. The RPC started executing
2. It created the user row (without username)
3. It hit the error before creating the group
4. The entire transaction rolled back
5. Only the initial trigger-created row remains (no role, no group, no username)

---

## The Fundamental Design Issue

The current architecture has a **race condition and data inconsistency problem**:

1. **Three different places try to create/update the users row:**
   - `handle_new_user()` trigger (runs first, incomplete data)
   - `upsertUserRow()` client call (may fail or be overwritten)
   - RPC functions (overwrite previous values with incomplete data)

2. **None of the database functions read username from metadata:**
   - They only read email and display_name
   - Username is supposed to be set by the client
   - But RPCs overwrite whatever the client set

3. **No atomic operation:**
   - User creation and role/group assignment happen in separate transactions
   - If RPC fails, user exists but is incomplete

---

## What Needs to Be Fixed

### Fix 1: Update `handle_new_user()` trigger to extract username
```sql
insert into public.users (id, email, display_name, username)
values (
  new.id, 
  new.email, 
  coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
  new.raw_user_meta_data->>'username'  -- ADD THIS
)
on conflict (id) do update 
set email = excluded.email,
    display_name = coalesce(excluded.display_name, users.display_name),
    username = coalesce(excluded.username, users.username);  -- ADD THIS
```

### Fix 2: Update `create_admin_group()` to extract and preserve username
```sql
-- Get user info from auth.users INCLUDING username
select 
  au.email, 
  coalesce(au.raw_user_meta_data->>'display_name', split_part(au.email,'@',1)),
  au.raw_user_meta_data->>'username'  -- ADD THIS
into v_email, v_display_name, v_username  -- ADD v_username
from auth.users au
where au.id = v_uid;

-- Ensure a users row exists WITH username
insert into public.users (id, email, display_name, username)
values (v_uid, v_email, v_display_name, v_username)  -- ADD v_username
on conflict (id) do update 
set email = excluded.email,
    display_name = coalesce(excluded.display_name, public.users.display_name),
    username = coalesce(excluded.username, public.users.username);  -- ADD THIS
```

### Fix 3: Same changes for `redeem_access_code()`

### Fix 4: Consider consolidating user creation logic
Instead of having three places that create/update users, consider:
- Let the trigger create the basic row with username
- Have RPCs only UPDATE role and group_id (not upsert everything)
- Or, disable the trigger and have RPCs handle everything

---

## Verification

After fixes are applied, verify:

```sql
-- Check trigger
\sf public.handle_new_user

-- Check RPC
\sf public.create_admin_group

-- Test registration and verify:
SELECT u.id, u.email, u.username, u.role, u.group_id, g.name as group_name
FROM public.users u
LEFT JOIN public.groups g ON u.group_id = g.id
WHERE u.email = 'test@test.com';
```

Expected result after successful admin registration:
- username: "testuser" ✅
- role: "admin" ✅
- group_id: (uuid) ✅
- group_name: "Test Group" ✅
