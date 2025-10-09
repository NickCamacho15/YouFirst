# Double-Render Issue - Root Cause Analysis

## The Problem

After logging in or registering, the Calendar and StreakStats components:
1. Load their data and display correctly (colored dots appear)
2. After 1-2 seconds, the data disappears briefly
3. Then reappears quickly

This creates a jarring "flicker" or "glitch" effect that feels unpolished.

---

## Root Cause: Multiple UserProvider Refresh Cycles

### The Flow:

#### 1. Login/Registration Completes
```
AuthScreen → onLogin() → App.handleLogin()
```

#### 2. App.handleLogin() Does Multiple State Updates (App.tsx:34-42)
```typescript
setIsAuthenticated(true)           // State update #1
setAppEpoch((e) => e + 1)          // State update #2 - TRIGGERS USERPROVIDER REMOUNT
warmStartupCaches()                // Async background task
setShowStartupOverlay(false)       // State update #3
```

**CRITICAL**: The `appEpoch` increment causes UserProvider to completely remount with a new key (line 91).

#### 3. UserProvider Remounts (user-context.tsx:24-66)

**Initial Mount Sequence:**
```
A. Load cached user from AsyncStorage (lines 26-39)
   - If cache exists: setUser(cached) + setLoading(false)
   - This is FAST (synchronous from cache)

B. Kick off doRefresh() async (lines 42-45)
   - Fetches fresh user data from database
   - Updates user state if changed
   - Sets initialLoadDoneRef.current = true when complete

C. Setup auth state change listener (lines 48-64)
   - Listens for SIGNED_IN, USER_UPDATED, TOKEN_REFRESHED events
   - Line 60: Only refreshes if initialLoadDoneRef.current === true
```

#### 4. THE RACE CONDITION ⚡

**Problem**: There's a race between steps B and C above:

```
Time 0ms:   UserProvider mounts
Time 5ms:    - Loads cached user (instant)
             - Starts doRefresh() async
             - Registers auth listener
             
Time 100ms:  - Auth listener fires (SIGNED_IN or TOKEN_REFRESHED)
             - Checks: initialLoadDoneRef.current === false ❌
             - Skips refresh (good!)
             
Time 500ms:  - doRefresh() from step B completes
             - Sets initialLoadDoneRef.current = true
             - Updates user state
             
Time 600ms:  - Auth listener fires AGAIN (token refresh)
             - Checks: initialLoadDoneRef.current === true ✅
             - Calls doRefresh() AGAIN! ⚡ DOUBLE REFRESH
```

**Alternative Race (Even More Common):**

When a user logs in, Supabase's auth state change event fires **after** the session is established. The timing is:

```
Time 0ms:   handleLogin() called
Time 5ms:   UserProvider remounts with new epoch
Time 10ms:  - Loads cached user
            - Starts doRefresh() #1
            - Registers auth listener
Time 50ms:  - Supabase fires SIGNED_IN event (from the login that just happened)
            - Checks: initialLoadDoneRef.current === false ❌
            - Skips this refresh (protected)
Time 200ms: - doRefresh() #1 completes
            - Sets initialLoadDoneRef.current = true
            - May update user object (new reference)
Time 300ms: - Supabase fires TOKEN_REFRESHED event
            - Checks: initialLoadDoneRef.current === true ✅
            - Calls doRefresh() #2 ⚡ DOUBLE REFRESH
```

#### 5. Calendar and StreakStats Re-render Cascade

**Calendar.tsx (lines 31-74):**
```typescript
useEffect(() => {
  hasLoadedRef.current = false  // RESET on every effect run
  
  const load = async (force = false) => {
    if (!force && hasLoadedRef.current) return  // Skip if already loaded
    hasLoadedRef.current = true
    // ... fetch data
  }
  
  if (user) {
    load(false)
    unsub = subscribeWins(() => load(true))
  }
  return () => { if (unsub) unsub() }
}, [currentDate, user?.id])  // ⚡ DEPENDS ON user?.id
```

**The Problem:**
1. Component mounts, loads data with cached user → **Data appears** ✅
2. UserProvider's first `doRefresh()` completes → Updates user object
3. Even though user data is the same, the object reference changes
4. Calendar's `useEffect` dependency `user?.id` changes → **Effect re-runs**
5. Line 33: `hasLoadedRef.current = false` → **Reset**
6. Line 38-39: Checks `!force && hasLoadedRef.current` → **False, so loads again**
7. During loading, components may briefly show empty state → **Data disappears** ❌
8. Load completes → **Data reappears** ✅

**StreakStats.tsx has the same pattern** (lines 12-36).

---

## Why This Wasn't Noticed Before

1. **Registration**: The previous fix (glitch-fix-implemented.md) cached user data after registration, so the first render was smooth. But the double-refresh issue persisted, just less noticeable.

2. **Login with existing cache**: If you login with an existing cached user, the first render is instant. The double-refresh still happens but is less visible because the data is already displayed.

3. **Network speed**: On fast networks, the second refresh completes quickly so the flicker is barely noticeable.

4. **Component caching**: The components have AsyncStorage caching (wins.ts), so sometimes the second load hits cache and is fast.

---

## The Core Issues

### Issue #1: UserProvider Double Refresh
The auth state change listener can trigger a second refresh after `initialLoadDoneRef` is set to true.

### Issue #2: Component Dependencies on user?.id
Calendar and StreakStats reset their `hasLoadedRef` every time `user?.id` changes, even if the actual ID value is the same (just a different object reference).

### Issue #3: UserProvider's setUser Comparison
Lines 74-89 in user-context.tsx attempt to prevent unnecessary re-renders by comparing user fields. However:
- The comparison is shallow (checks individual fields)
- If `getCurrentUser()` returns a new object (which it always does), even with identical values, the comparison logic creates a new reference
- This new reference triggers effects in consuming components

### Issue #4: AppEpoch Remount on Every Login
The `appEpoch` increment causes a full UserProvider remount, which:
- Clears all in-memory state
- Re-establishes auth listeners
- Triggers the entire initialization flow from scratch

This is intended to create a "clean slate" but it also creates the conditions for the race condition.

---

## Production-Grade Fix Plan

### Strategy: Eliminate unnecessary refreshes and stabilize user identity

### Fix #1: Stabilize UserProvider Refresh Logic
**File**: `mobile/lib/user-context.tsx`

**Changes:**
1. Remove the `initialLoadDoneRef` guard - it's creating a race condition
2. Instead, use a simpler approach: only respond to auth events that actually change the user
3. Add a `sessionIdRef` to track if we're in the same auth session
4. Only refresh on auth events if the session ID changed

### Fix #2: Stabilize user?.id Reference
**File**: `mobile/lib/user-context.tsx`

**Changes:**
1. The `setUser` comparison logic (lines 74-89) needs to return the **same object reference** when data hasn't changed
2. This prevents unnecessary effect re-runs in consuming components
3. Already implemented, but needs verification it's working correctly

### Fix #3: Remove Unnecessary hasLoadedRef Resets
**File**: `mobile/components/Calendar.tsx` and `mobile/components/StreakStats.tsx`

**Changes:**
1. Don't reset `hasLoadedRef.current = false` on every effect run
2. Only reset when truly necessary (user changes, month changes)
3. Or better: remove the reset entirely and rely on proper dependency management

### Fix #4: Optimize AppEpoch Usage
**File**: `mobile/App.tsx`

**Changes:**
1. Consider if we really need to remount UserProvider on every login
2. Alternative: UserProvider can detect auth changes and refresh itself without remounting
3. Or: Only increment appEpoch on logout, not on login

### Fix #5: Batch Async Storage Operations
**File**: `mobile/screens/AuthScreen.tsx`

**Changes:**
1. The registration flow caches user data (lines 238-255)
2. Ensure this completes BEFORE calling `onLogin()`
3. This ensures UserProvider has cache immediately available

---

## Recommended Implementation Order

### Phase 1: Quick Wins (Fixes the symptoms)
1. **Remove hasLoadedRef reset** in Calendar and StreakStats
   - Change line 33 in Calendar.tsx: Remove `hasLoadedRef.current = false`
   - Change line 17 in StreakStats.tsx: Remove reset logic
   - Only set to false when `user?.id` actually changes (not just reference)

2. **Debounce auth state changes** in UserProvider
   - Add a small debounce to auth listener to avoid rapid-fire refreshes
   - Use a timestamp to prevent refreshes within 1 second of each other

### Phase 2: Structural Fixes (Fixes the root cause)
1. **Simplify UserProvider refresh logic**
   - Remove `initialLoadDoneRef` complexity
   - Use session ID tracking instead
   - Only refresh when session actually changes

2. **Remove appEpoch remount on login**
   - Only increment on logout/auth errors
   - Let UserProvider handle login refreshes internally

### Phase 3: Optimization
1. **Add warmStartupCaches integration**
   - Pre-fetch Calendar/StreakStats data during warmup
   - Store in cache before components mount
   - Components load from cache instantly

---

## Testing Strategy

### Test Cases:
1. **Fresh Registration**
   - Register → Should show home screen instantly with data
   - No flicker or disappearing data

2. **Login with Existing Account**
   - Login → Should load cached data instantly
   - No flicker during token refresh

3. **Login After App Termination**
   - Force quit app → Reopen → Should show startup overlay briefly
   - Then load with cached data, no flicker

4. **Token Refresh During Session**
   - Stay logged in for 1 hour (token refresh happens)
   - Should not cause any visible re-renders

5. **Network Interruption**
   - Login with cached data
   - Disconnect network → Should still show cached data
   - Reconnect → Should refresh in background without flicker

---

## Expected Outcome

After implementing these fixes:

✅ **Single data load per component per mount**
✅ **No visible flickers or disappearing data**
✅ **Instant perceived load time** (cache-first rendering)
✅ **Smooth auth state transitions**
✅ **Production-grade UX** that feels polished and responsive

---

## Files to Modify

1. `mobile/lib/user-context.tsx` - Core auth/user state management
2. `mobile/components/Calendar.tsx` - Remove hasLoadedRef reset
3. `mobile/components/StreakStats.tsx` - Remove hasLoadedRef reset
4. `mobile/App.tsx` - Optimize appEpoch usage
5. `mobile/lib/warm-start.ts` - Add Calendar/StreakStats data preloading

---

## Metrics to Track

Before/After measurements:
- Time from login to first data render
- Number of Supabase queries on login
- Number of component re-renders on login
- User experience smoothness (subjective but important)

---

**Analysis Complete**: Ready for implementation approval from @nickcamacho



