# Registration Issues - Root Causes Summary

## TL;DR

**Username, role, and group are NOT being saved because:**

1. The database trigger `handle_new_user()` doesn't extract username from auth metadata
2. The RPC functions `create_admin_group()` and `redeem_access_code()` don't extract username from auth metadata
3. All three places that create/update users overwrite each other's data
4. The RPC likely failed due to errors, so role and group were never set

---

## The Core Problem

**Username is stored in two places:**
- ✅ `auth.users.raw_user_meta_data->>'username'` (Supabase Auth) 
- ❌ `public.users.username` (Application DB) - **This is NULL!**

**Three different code paths try to create/update public.users:**

### Path 1: Database Trigger (runs automatically on signup)
```sql
-- handle_new_user() trigger
-- ONLY copies: id, email, display_name
-- MISSING: username ❌
```

### Path 2: Client Upsert (mobile/lib/auth.ts)
```typescript
// upsertUserRow() tries to set username
// But may fail silently or get overwritten
```

### Path 3: RPC Functions (create_admin_group, redeem_access_code)
```sql
-- Fetches from auth.users: email, display_name
-- MISSING: username ❌
-- Upserts into public.users WITHOUT username
-- This OVERWRITES anything Path 2 set
```

---

## What Happens During Registration

1. **User registers with username "plzwork"**
   - Saved to auth.users metadata ✅

2. **Trigger fires and creates public.users row**
   - id, email, display_name ✅
   - username: NULL ❌

3. **Client tries to upsert username**
   - May or may not succeed (silently fails)
   
4. **RPC create_admin_group is called**
   - Fetches email and display_name (no username)
   - Upserts to public.users (overwrites/leaves username as NULL)
   - Should create group and set role
   - **But RPC fails due to "ambiguous column" error**
   - Transaction rolls back
   - No group created, no role set

5. **Final result:**
   - username: NULL ❌
   - role: NULL ❌
   - group_id: NULL ❌

---

## Why the Group and Role Failed

Looking at the logs, the RPC `create_admin_group` encountered this error:
```
ERROR  RPC Error: {"code": "42702", "message": "column reference \"id\" is ambiguous"}
```

This caused the entire RPC transaction to fail, so:
- Group was never created
- Role was never set
- User was left in an incomplete state

We already fixed this ambiguous column error, but now we need to fix the username issue.

---

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  User Registers: username="plzwork"                         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase Auth: Creates auth.users                          │
│  - Stores username in raw_user_meta_data ✅                 │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Trigger: handle_new_user()                                 │
│  - Creates public.users row                                 │
│  - Extracts: id, email, display_name ✅                     │
│  - MISSING: username ❌                                     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Client: upsertUserRow()                                    │
│  - Tries to update username                                 │
│  - May fail silently                                        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  RPC: create_admin_group()                                  │
│  - Fetches: email, display_name (NO USERNAME) ❌            │
│  - Upserts to public.users (overwrites without username)    │
│  - Should create group... BUT FAILS with error ❌           │
│  - Transaction rolls back                                   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  RESULT: User exists but incomplete                         │
│  - username: NULL ❌                                        │
│  - role: NULL ❌                                            │
│  - group_id: NULL ❌                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Files Involved

### Database Functions
1. **`handle_new_user()` trigger** - Needs to extract username
2. **`create_admin_group()` RPC** - Needs to extract and preserve username
3. **`redeem_access_code()` RPC** - Needs to extract and preserve username

### Application Code
4. **`mobile/lib/auth.ts`** - `upsertUserRow()` function
5. **`mobile/screens/AuthScreen.tsx`** - Registration flow

---

## Next Steps

To fix this, we need to update:

1. ✅ Fix ambiguous column errors (DONE)
2. ❌ Update `handle_new_user()` to extract username from metadata (TODO)
3. ❌ Update `create_admin_group()` to extract and preserve username (TODO)
4. ❌ Update `redeem_access_code()` to extract and preserve username (TODO)
5. ❌ Test with a new user registration (TODO)

---

## Quick Test to Verify Current State

```sql
-- Check what's in auth.users
SELECT id, email, raw_user_meta_data->>'username' as username_in_metadata
FROM auth.users 
WHERE email = 'plzwork@gmail.com';

-- Check what's in public.users
SELECT id, email, username, role, group_id
FROM public.users
WHERE email = 'plzwork@gmail.com';

-- Expected mismatch:
-- auth.users: username_in_metadata = "plzwork" ✅
-- public.users: username = NULL ❌
```
