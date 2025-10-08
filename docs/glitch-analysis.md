# Registration Glitch - Root Cause Analysis

## The Glitch You're Seeing

After successful registration, the app briefly shows incomplete/loading state, then "glitches" as the data suddenly appears.

## Root Cause

The issue is a **data loading race condition** between registration verification and the UserProvider initialization.

---

## Timeline of What Happens

### Registration Flow:

1. **User registers** → Creates auth account
2. **Waits for session** (up to 4 seconds polling)
3. **Calls RPC** to create group and set role
4. **Verifies setup** with `verify_user_setup()` RPC (up to 3 seconds, 10 attempts)
   - ✅ Confirms role and group_id exist in database
5. **Calls `onLogin()`**
6. **App.tsx `handleLogin()` executes:**
   - Sets `isAuthenticated = true`
   - Increments `appEpoch` → **Remounts UserProvider with NEW KEY**
   - Starts `warmStartupCaches()` async
   - Main app renders

7. **UserProvider mounts (with new key):**
   - Tries to load cached user from AsyncStorage
   - ❌ **NO CACHED DATA** (this is a brand new registration!)
   - Sets `user = null`, `loading = true`
   - Renders children with no user data
   - Kicks off `doRefresh()` async

8. **`doRefresh()` calls `getCurrentUser()`:**
   - Fetches from `public.users` table
   - Gets username, role, group_id, etc.
   - Updates user state
   - Sets `loading = false`

9. **⚡ State update triggers re-render** → **THIS IS THE GLITCH**

---

## Why Login Doesn't Glitch

**Login Flow:**
1. User signs in with existing account
2. UserProvider mounts
3. **Loads CACHED user data from AsyncStorage** ✅
4. Renders immediately with cached data
5. Refreshes in background (less noticeable)

**Registration has no cache**, so there's a visible loading → data flash.

---

## The Problem

```
Registration:     [Verify data exists] → [onLogin] → [UserProvider: user=null] → [Fetch data] → [Re-render with data] ⚡ GLITCH

Login:            [onLogin] → [UserProvider: user=CACHED_DATA ✅] → [Fetch fresh data] → [Update if changed] (smooth)
```

Even though registration **already verified** the user data exists in the database, the UserProvider doesn't know about it because:
1. It remounts with a new key (appEpoch)
2. There's no cached data for a brand new user
3. It has to fetch the data again from scratch

---

## Solution

After registration verification succeeds (line 216-227 in AuthScreen.tsx), we should **cache the verified user data** before calling `onLogin()`.

This way, when UserProvider mounts, it will immediately have the user data available and won't need to show a loading state.

---

## Proposed Fix

In `AuthScreen.tsx`, after the verification succeeds:

```typescript
// After verification succeeds (line 227)
if (setupVerified) {
  // Cache the user data so UserProvider can load it immediately
  const userToCache = {
    id: userVerify[0].user_id,
    email: userVerify[0].email,
    username: userVerify[0].username,
    displayName: userVerify[0].email.split('@')[0],
    role: userVerify[0].role,
    groupId: userVerify[0].group_id,
    profileImageUrl: null,
  }
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(userToCache))
}
```

This will make registration as smooth as login!

---

## Alternative Solutions

1. **Skip verification loop** - Trust that RPC succeeded (risky)
2. **Pre-populate user context** - Pass user data to onLogin (more refactoring)
3. **Show loading screen** - Keep loading overlay until UserProvider ready (UX band-aid)

Option 1 (caching) is the cleanest and matches the existing pattern.
