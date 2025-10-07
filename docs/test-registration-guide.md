# Testing Guide - Registration Fix Verification

## Overview

This guide will help you verify that the registration fixes are working correctly for both admin and user registration flows.

---

## Prerequisites

✅ All database functions have been updated
✅ Test user (plzwork) has been cleaned up
✅ Mobile app is running

---

## Test 1: Admin Registration

### Steps

1. **Open the mobile app and go to the Register tab**

2. **Fill in the registration form:**
   - Username: `admintest`
   - Email: `admintest@test.com`
   - Password: (your choice, e.g., `Password123!`)
   - Confirm Password: (same as above)
   - Role: **Admin** (select this tab)
   - Group Name: `Test Team`
   - Access Code: `TEAM123`

3. **Click "Create Account"**

4. **Expected Result:**
   - Registration should complete successfully
   - You should be logged in
   - No errors in console

### Verification

Run this SQL query to verify the admin user was created correctly:

```sql
SELECT 
  u.id, 
  u.email, 
  u.username, 
  u.role, 
  g.name as group_name,
  g.access_code
FROM public.users u
LEFT JOIN public.groups g ON u.group_id = g.id
WHERE u.email = 'admintest@test.com';
```

**Expected Output:**
```
email               | admintest@test.com
username            | admintest
role                | admin
group_name          | Test Team
access_code         | TEAM123
```

✅ All fields should have values (none should be NULL)

---

## Test 2: User Registration (Joining Group)

### Steps

1. **Log out from the admin account**

2. **Go to the Register tab again**

3. **Fill in the registration form:**
   - Username: `usertest`
   - Email: `usertest@test.com`
   - Password: (your choice, e.g., `Password123!`)
   - Confirm Password: (same as above)
   - Role: **User** (select this tab)
   - Access Code: `TEAM123` (same code the admin created)

4. **Click "Create Account"**

5. **Expected Result:**
   - Registration should complete successfully
   - You should be logged in
   - No errors in console

### Verification

Run this SQL query to verify both users are in the same group:

```sql
SELECT 
  u.id, 
  u.email, 
  u.username, 
  u.role, 
  g.name as group_name,
  g.access_code
FROM public.users u
LEFT JOIN public.groups g ON u.group_id = g.id
WHERE u.email IN ('admintest@test.com', 'usertest@test.com')
ORDER BY u.role DESC;
```

**Expected Output:**
```
Row 1:
  email: admintest@test.com
  username: admintest
  role: admin
  group_name: Test Team
  access_code: TEAM123

Row 2:
  email: usertest@test.com
  username: usertest
  role: user
  group_name: Test Team
  access_code: TEAM123
```

✅ Both users should be in the same group
✅ Admin should have role='admin'
✅ User should have role='user'
✅ Both should have usernames filled in

---

## Test 3: Verify in Mobile App

### For Admin User (admintest@test.com)

After logging in, the admin should be able to:
- See their username displayed correctly
- Access admin-specific features (if any)
- View group information

### For Regular User (usertest@test.com)

After logging in, the user should be able to:
- See their username displayed correctly
- Be part of the "Test Team" group
- See admin-assigned plans (if implemented)

---

## Troubleshooting

### If username is still NULL:

1. Check that `handle_new_user()` trigger is correctly updated:
```sql
\sf public.handle_new_user
```
Should include: `new.raw_user_meta_data->>'username'`

2. Check auth.users metadata:
```sql
SELECT email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'admintest@test.com';
```

### If role or group_id is NULL:

1. Check for RPC errors in mobile console
2. Verify RPC functions:
```sql
\sf public.create_admin_group
\sf public.redeem_access_code
```

3. Check that functions extract username:
Should include: `au.raw_user_meta_data->>'username'`

### If group is not created:

1. Check groups table:
```sql
SELECT * FROM public.groups WHERE access_code = 'TEAM123';
```

2. Check for errors in mobile console during registration

### If user can't join group:

1. Verify the group exists with correct access code
2. Check that access code is uppercase in database
3. Verify user doesn't already belong to another group

---

## Success Criteria

✅ Admin registration creates user with username, role='admin', and group
✅ Group is created with correct name and access code
✅ User registration creates user with username and role='user'
✅ User is added to the correct group using access code
✅ Both users can log in and out successfully
✅ No console errors during registration
✅ All data persists correctly in database

---

## Cleanup (Optional)

After testing, you can clean up the test data:

```sql
-- Delete test users
DELETE FROM auth.users WHERE email IN ('admintest@test.com', 'usertest@test.com');

-- This will cascade delete from public.users due to foreign key

-- Delete test group
DELETE FROM public.groups WHERE access_code = 'TEAM123';
```

---

## Next Steps

Once both tests pass:
1. Test with your actual credentials
2. Consider additional edge cases:
   - Duplicate username handling
   - Invalid access codes
   - User trying to join non-existent group
   - User trying to join multiple groups
   - Access code case sensitivity
