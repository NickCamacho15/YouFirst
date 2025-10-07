# Registration Fix - Implementation Plan

## High-Level Strategy

Fix the registration flow so that username, role, and group assignment all work correctly by ensuring all database functions properly extract and preserve username from auth.users metadata.

## Changes Required

### 1. Update `handle_new_user()` Trigger
**Purpose:** Ensure username is extracted from metadata when user first registers

**Changes:**
- Add `username` to the INSERT columns
- Extract username from `new.raw_user_meta_data->>'username'`
- Update the conflict clause to preserve username on subsequent calls

**Impact:** New users will have their username set from the start

---

### 2. Update `create_admin_group()` RPC
**Purpose:** Ensure username is preserved when creating admin group

**Changes:**
- Add `v_username` variable declaration
- Fetch username from `auth.users.raw_user_meta_data`
- Include username in the upsert to public.users
- Update conflict clause to preserve username
- Set role='admin' and group_id properly

**Impact:** Admin registration will set username, role, and group_id

---

### 3. Update `redeem_access_code()` RPC
**Purpose:** Ensure username is preserved when user joins group

**Changes:**
- Add `v_username` variable declaration
- Fetch username from `auth.users.raw_user_meta_data`
- Include username in the upsert to public.users
- Update conflict clause to preserve username
- Set role='user' and group_id properly

**Impact:** User registration will set username, role, and group_id

---

## Implementation Steps

1. ✅ Backup current functions (already documented)
2. ⏳ Create comprehensive SQL script with all fixes
3. ⏳ Apply SQL script to database
4. ⏳ Verify all functions are updated correctly
5. ⏳ Clean up test user (plzwork) and test fresh registration
6. ⏳ Test admin registration flow
7. ⏳ Test user registration flow with access code
8. ✅ Document results

---

## Testing Plan

### Test 1: Admin Registration
1. Register new user as admin:
   - Username: "testadmin"
   - Email: "testadmin@test.com"
   - Group Name: "Test Group"
   - Access Code: "TEST123"

2. Verify in database:
   - `public.users.username` = "testadmin" ✓
   - `public.users.role` = "admin" ✓
   - `public.users.group_id` = (uuid) ✓
   - `public.groups` has entry with access_code = "TEST123" ✓

### Test 2: User Registration
1. Register new user:
   - Username: "testuser"
   - Email: "testuser@test.com"
   - Access Code: "TEST123"

2. Verify in database:
   - `public.users.username` = "testuser" ✓
   - `public.users.role` = "user" ✓
   - `public.users.group_id` = (same as admin) ✓

---

## Rollback Plan

If fixes don't work:
1. We have the old function definitions documented
2. Can restore from `docs/supabase-rpc-roles-groups.sql`
3. Database remains in working state (just incomplete user data)

---

## Success Criteria

✅ Username is preserved through entire registration flow
✅ Admin users get role='admin' and group created
✅ Regular users get role='user' and join existing group
✅ No data loss or overwrites during upserts
✅ Both registration flows complete successfully
