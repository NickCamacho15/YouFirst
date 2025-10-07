# Fix Guide: User Registration with Roles and Groups

This guide explains how to fix the issue where user roles and groups are not being properly assigned during registration.

## Problem Summary

When users register and choose their role (admin/user), the system is not properly:
1. Assigning the role to the user
2. Creating groups for admins
3. Assigning users to groups when they use an access code

## Root Causes

1. **Timing Issue**: The auth session is not fully established when RPC functions are called
2. **RLS Policy Issue**: Missing or incorrect Row-Level Security policies on the users table
3. **RPC Function Issues**: The functions need better error handling and session verification
4. **Ambiguous Column References**: Functions returning tables with column names like "id" create PL/pgSQL variables that conflict with unqualified column references

## Fix Steps

### Step 1: Apply Database Fixes

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and run the SQL from `docs/fix-roles-groups-registration.sql`
4. This will:
   - Add proper insert policy for the users table
   - Update the update policy to allow self-updates
   - Fix the RPC functions with better error handling
   - Add a verification function to check user setup

### Step 2: Update the Mobile App

The `AuthScreen.tsx` has already been updated with:
- Better session handling after registration
- Retry logic for RPC calls
- Verification of user setup completion
- Better error messages

### Step 3: Test the Registration Flow

#### Test Admin Registration:
1. Create a new account and select "Admin" role
2. Enter a group name (e.g., "Alpha Team")
3. Create an access code (6-12 uppercase letters/numbers, e.g., "ALPHA123")
4. Complete registration
5. Verify the user has role='admin' and a group_id in the database

#### Test User Registration:
1. Create a new account and select "User" role
2. Enter the access code created by an admin (e.g., "ALPHA123")
3. Complete registration
4. Verify the user has role='user' and the same group_id as the admin

### Step 4: Verify in Database

After registration, check the database:

```sql
-- Check users table
select id, email, role, group_id from public.users;

-- Check groups table
select id, name, access_code, created_by from public.groups;

-- Verify user setup (run as the logged-in user)
select * from public.verify_user_setup();
```

## Troubleshooting

### If registration still fails:

1. **Check Supabase Auth Settings**:
   - Ensure email confirmations are disabled for immediate login
   - Check that the auth provider is properly configured

2. **Check RLS Policies**:
   ```sql
   -- List all policies on users table
   select tablename, policyname, permissive, roles, cmd, qual, with_check 
   from pg_policies 
   where tablename = 'users';
   ```

3. **Check Function Permissions**:
   ```sql
   -- Check if functions have proper permissions
   \df+ public.create_admin_group
   \df+ public.redeem_access_code
   ```

4. **Enable Debugging**:
   - Add console.log statements in the app to see exact error messages
   - Check Supabase logs for RPC function errors

### Common Issues and Solutions:

1. **"Not authenticated" error**:
   - The auth session is not established yet
   - Solution: The updated code handles this with retry logic

2. **"Access code already exists"**:
   - An admin is trying to use an existing access code
   - Solution: Use a different access code

3. **"User already belongs to a group"**:
   - A user is trying to join a second group
   - Solution: This is by design - users can only belong to one group

4. **Role/group not updating**:
   - RLS policies might be blocking the update
   - Solution: Run the SQL fix script to update policies

5. **"column reference 'id' is ambiguous"**:
   - RPC functions that return tables with columns like "id" create PL/pgSQL variables that conflict
   - Solution: Use table aliases and qualify ALL column references (e.g., `u.id` instead of just `id`)

## Next Steps

After fixing the registration:

1. Consider adding an admin dashboard to:
   - View all users in the group
   - Manage access codes
   - Assign training plans to users

2. Add proper role-based UI:
   - Show admin features only to admins
   - Show group information in user profiles
   - Add group-based features

3. Enhance security:
   - Add access code expiration
   - Limit access code usage count
   - Add audit logging for group management
