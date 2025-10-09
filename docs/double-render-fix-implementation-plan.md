# Double-Render Fix - Implementation Plan

## Overview

This document provides step-by-step implementation instructions to eliminate the double-render issue in the mobile app.

**Estimated Time**: 2-3 hours
**Risk Level**: Medium (core auth/state management changes)
**Testing Required**: Extensive (all auth flows)

---

## Phase 1: Quick Wins (30 minutes)

### Fix 1.1: Stabilize Calendar hasLoadedRef

**File**: `mobile/components/Calendar.tsx`

**Current Code (lines 31-39):**
```typescript
useEffect(() => {
  // Reset ref for new month or user
  hasLoadedRef.current = false  // ❌ RESETS ON EVERY EFFECT RUN
  
  let unsub: (() => void) | undefined
  const load = async (force = false) => {
    // Prevent double-loading on initial mount
    if (!force && hasLoadedRef.current) return
    hasLoadedRef.current = true
```

**New Code:**
```typescript
useEffect(() => {
  // Only reset if user or month actually changed
  // Don't reset on every effect run
  
  let unsub: (() => void) | undefined
  const load = async (force = false) => {
    // Prevent double-loading on initial mount
    if (!force && hasLoadedRef.current) return
    hasLoadedRef.current = true
```

**Why This Works:**
- `hasLoadedRef` persists across renders (it's a ref)
- We only want to reset it when the user ID or month truly changes
- By removing the reset, we prevent the second load from happening
- The effect will still re-run when dependencies change, but won't reload data if already loaded

**Alternative (more explicit):**
```typescript
const prevUserIdRef = useRef<string>()
const prevMonthRef = useRef<string>()

useEffect(() => {
  const currentMonth = format(currentDate, 'yyyy-MM')
  const currentUserId = user?.id
  
  // Only reset if user or month actually changed
  if (prevUserIdRef.current !== currentUserId || prevMonthRef.current !== currentMonth) {
    hasLoadedRef.current = false
    prevUserIdRef.current = currentUserId
    prevMonthRef.current = currentMonth
  }
  
  let unsub: (() => void) | undefined
  const load = async (force = false) => {
    if (!force && hasLoadedRef.current) return
    hasLoadedRef.current = true
    // ... rest of load logic
```

### Fix 1.2: Stabilize StreakStats hasLoadedRef

**File**: `mobile/components/StreakStats.tsx`

**Current Code (lines 12-18):**
```typescript
useEffect(() => {
  let isActive = true

  async function load(force = false) {
    // Prevent double-loading on initial mount
    if (!force && hasLoadedRef.current) return
    hasLoadedRef.current = true
```

**Issue**: The effect only runs once (empty dependency array), so it's not causing re-loads. However, the pattern should match Calendar for consistency.

**New Code:**
```typescript
useEffect(() => {
  let isActive = true

  async function load(force = false) {
    // Prevent double-loading on initial mount
    if (!force && hasLoadedRef.current) return
    hasLoadedRef.current = true
```

**No change needed** - StreakStats is already correct since it doesn't depend on `user?.id` in the dependency array.

---

## Phase 2: Core Auth State Management (1 hour)

### Fix 2.1: Debounce UserProvider Refresh

**File**: `mobile/lib/user-context.tsx`

**Current Code (lines 48-64):**
```typescript
const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
  try {
    if (event === 'SIGNED_OUT') {
      try { await forceClearAuthStorage() } catch {}
      if (mountedRef.current) { 
        setUser(null)
        setLoading(true)
        try { await AsyncStorage.removeItem(CACHE_KEY) } catch {} 
      }
      initialLoadDoneRef.current = false
    }
    // Only refresh on auth events if initial load is done to prevent double refresh on mount
    if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && initialLoadDoneRef.current) {
      await doRefresh()
    }
  } catch {}
})
```

**Problem**: 
- Line 60: Only checks `initialLoadDoneRef.current`, but multiple events can fire in quick succession
- `TOKEN_REFRESHED` can fire right after `SIGNED_IN`
- Each triggers a full refresh

**New Code:**
```typescript
const lastRefreshRef = useRef<number>(0)
const REFRESH_DEBOUNCE_MS = 1000 // Only allow one refresh per second

const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
  try {
    if (event === 'SIGNED_OUT') {
      try { await forceClearAuthStorage() } catch {}
      if (mountedRef.current) { 
        setUser(null)
        setLoading(true)
        try { await AsyncStorage.removeItem(CACHE_KEY) } catch {} 
      }
      initialLoadDoneRef.current = false
      lastRefreshRef.current = 0
    }
    
    // Only refresh on auth events if initial load is done AND enough time has passed
    if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && initialLoadDoneRef.current) {
      const now = Date.now()
      const timeSinceLastRefresh = now - lastRefreshRef.current
      
      if (timeSinceLastRefresh >= REFRESH_DEBOUNCE_MS) {
        lastRefreshRef.current = now
        await doRefresh()
      } else {
        console.log(`[UserProvider] Skipping refresh - only ${timeSinceLastRefresh}ms since last refresh`)
      }
    }
  } catch {}
})
```

**Why This Works:**
- Prevents multiple refreshes within 1 second
- The first refresh goes through immediately
- Subsequent refreshes within the debounce window are skipped
- Normal token refreshes (which happen every 60 min) will still work fine

### Fix 2.2: More Robust User Comparison

**File**: `mobile/lib/user-context.tsx`

**Current Code (lines 74-89):**
```typescript
// Only update state if user data actually changed to prevent unnecessary re-renders
setUser(prevUser => {
  // If both are null or both are undefined, no change
  if (!u && !prevUser) return prevUser
  // If one is null/undefined and the other isn't, update
  if (!u || !prevUser) return u
  // Compare key fields to detect actual changes
  const unchanged = 
    prevUser.id === u.id &&
    prevUser.email === u.email &&
    prevUser.username === u.username &&
    prevUser.displayName === u.displayName &&
    prevUser.role === u.role &&
    prevUser.groupId === u.groupId &&
    prevUser.profileImageUrl === u.profileImageUrl
  // Return previous reference if nothing changed to avoid triggering effects
  return unchanged ? prevUser : u
})
```

**Issue**: This is actually already well-implemented! It returns the same reference when data hasn't changed.

**Verification Needed**: Check that this is actually working. Add logging to confirm:

```typescript
setUser(prevUser => {
  if (!u && !prevUser) return prevUser
  if (!u || !prevUser) return u
  
  const unchanged = 
    prevUser.id === u.id &&
    prevUser.email === u.email &&
    prevUser.username === u.username &&
    prevUser.displayName === u.displayName &&
    prevUser.role === u.role &&
    prevUser.groupId === u.groupId &&
    prevUser.profileImageUrl === u.profileImageUrl
  
  if (unchanged) {
    console.log('[UserProvider] User data unchanged, keeping same reference')
    return prevUser
  } else {
    console.log('[UserProvider] User data changed:', {
      idChanged: prevUser.id !== u.id,
      emailChanged: prevUser.email !== u.email,
      usernameChanged: prevUser.username !== u.username,
      displayNameChanged: prevUser.displayName !== u.displayName,
      roleChanged: prevUser.role !== u.role,
      groupIdChanged: prevUser.groupId !== u.groupId,
      profileImageUrlChanged: prevUser.profileImageUrl !== u.profileImageUrl,
    })
    return u
  }
})
```

**Keep this logging temporarily for debugging, remove after confirming fix works.**

---

## Phase 3: Optimize App-Level State Management (45 minutes)

### Fix 3.1: Only Remount UserProvider on Logout

**File**: `mobile/App.tsx`

**Current Code (lines 34-42):**
```typescript
const handleLogin = () => {
  setIsAuthenticated(true)
  // On a successful login, reset the epoch to establish a clean app context
  setAppEpoch((e) => e + 1)  // ❌ REMOUNTS ENTIRE USERPROVIDER
  // Warm critical caches in the background to make the home screen snappy
  setTimeout(() => { try { warmStartupCaches({ timeoutMs: 1800 }) } catch {} }, 0)
  // Ensure any startup overlay is dismissed immediately after a successful login
  setShowStartupOverlay(false)
}
```

**Issue**: 
- Incrementing `appEpoch` causes UserProvider to remount completely
- This clears all state, re-establishes listeners, and triggers the initialization flow
- On login, this is unnecessary - the UserProvider can handle session changes internally

**New Code:**
```typescript
const handleLogin = () => {
  setIsAuthenticated(true)
  // Don't remount UserProvider on login - it handles auth changes internally
  // Only remount on logout for a clean slate
  // Warm critical caches in the background to make the home screen snappy
  setTimeout(() => { try { warmStartupCaches({ timeoutMs: 1800 }) } catch {} }, 0)
  // Ensure any startup overlay is dismissed immediately after a successful login
  setShowStartupOverlay(false)
}
```

**And update handleLogout (lines 44-48):**
```typescript
const handleLogout = () => {
  setIsAuthenticated(false)
  setCurrentScreen("home")
  setAppEpoch((e) => e + 1)  // Remount UserProvider for clean slate on logout
}
```

**Why This Works:**
- UserProvider already has auth state change listeners
- It will detect the login and refresh automatically
- No need to force a remount, which causes all the state to reset
- On logout, we still remount to ensure a truly clean state

**Risk**: 
- If there's some edge case where login needs a full remount, we'll discover it in testing
- Mitigation: Keep the epoch increment as an option we can restore if needed

### Fix 3.2: Pre-cache Data in warmStartupCaches

**File**: `mobile/lib/warm-start.ts`

**Current Code:**
```typescript
export async function warmStartupCaches(options?: WarmOptions): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 1800

  const jobs: Promise<unknown>[] = []
  try { jobs.push(getActivityGoals().catch(() => {})) } catch {}
  try { jobs.push(getTodaySummary().catch(() => {})) } catch {}
  // Note: Wins and streaks are now cached by their respective components
  // No need to warm them here as they load instantly from AsyncStorage

  if (jobs.length === 0) return

  try {
    await withTimeout(Promise.allSettled(jobs), timeoutMs)
  } catch {
  }
}
```

**Enhancement**: Actually pre-cache the wins and streaks data

**New Code:**
```typescript
import { getWinsForMonth, getStreaks } from './wins'

export async function warmStartupCaches(options?: WarmOptions): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 1800

  const jobs: Promise<unknown>[] = []
  try { jobs.push(getActivityGoals().catch(() => {})) } catch {}
  try { jobs.push(getTodaySummary().catch(() => {})) } catch {}
  
  // Pre-cache calendar and streak data for instant component rendering
  try { jobs.push(getWinsForMonth(new Date()).catch(() => {})) } catch {}
  try { jobs.push(getStreaks().catch(() => {})) } catch {}

  if (jobs.length === 0) return

  try {
    await withTimeout(Promise.allSettled(jobs), timeoutMs)
  } catch {
  }
}
```

**Why This Works:**
- These functions already cache their results in AsyncStorage
- By calling them during warmup, we ensure the cache is fresh
- When components mount, they hit the cache instantly
- This is especially helpful after login when cache might be stale

---

## Phase 4: Add Monitoring (15 minutes)

### Fix 4.1: Add Refresh Counters for Debugging

**File**: `mobile/lib/user-context.tsx`

Add at the top of the file:
```typescript
// Debug counters (remove after confirming fix works)
let refreshCounter = 0
let authEventCounter = 0
```

In the `doRefresh` function (line 68):
```typescript
const doRefresh = async () => {
  refreshCounter++
  console.log(`[UserProvider] doRefresh #${refreshCounter}`)
  
  try {
    const u = await getCurrentUser()
    // ... rest of function
```

In the auth state change listener (line 48):
```typescript
const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
  authEventCounter++
  console.log(`[UserProvider] Auth event #${authEventCounter}: ${event}`)
  
  try {
    // ... rest of handler
```

**Why This Helps:**
- We can see exactly how many times refresh is called
- We can see which auth events are firing
- Makes it easy to verify the fix is working

**Remove these logs** once the fix is confirmed working in production.

---

## Testing Checklist

### Test 1: Fresh Registration
- [ ] Clear app data (uninstall/reinstall)
- [ ] Register as new user (admin)
- [ ] Observe home screen load
- [ ] Verify: No flicker in Calendar or StreakStats
- [ ] Check logs: Should see exactly 1 doRefresh call

### Test 2: Fresh Registration (Regular User)
- [ ] Clear app data
- [ ] Register as regular user (with access code)
- [ ] Observe home screen load
- [ ] Verify: No flicker
- [ ] Check logs: Should see exactly 1 doRefresh call

### Test 3: Login (With Cache)
- [ ] Login as existing user
- [ ] Should see data instantly from cache
- [ ] Verify: No flicker during token refresh
- [ ] Check logs: Should see 1-2 doRefresh calls max (initial + background refresh if stale)

### Test 4: Login (No Cache)
- [ ] Clear app data but don't uninstall (keeps auth)
- [ ] Open app
- [ ] Should see startup overlay briefly
- [ ] Then home screen with data
- [ ] Verify: No flicker
- [ ] Check logs: Should see 1 doRefresh call

### Test 5: Token Refresh During Session
- [ ] Login and leave app open for 60+ minutes
- [ ] Token refresh will happen automatically
- [ ] Verify: No visible UI changes
- [ ] Check logs: Debounce should prevent duplicate refreshes

### Test 6: Network Interruption
- [ ] Login with good network
- [ ] Turn off network
- [ ] App should still show cached data
- [ ] Turn on network
- [ ] Should refresh in background without flicker

---

## Rollback Plan

If issues arise:

1. **Quick Rollback**: Revert `mobile/lib/user-context.tsx` changes first
2. **Partial Rollback**: Keep Phase 1 fixes, revert Phase 2/3
3. **Emergency**: Revert all changes and return to previous behavior

---

## Success Metrics

### Before (Current State):
- Multiple doRefresh calls on login (2-3)
- Visible flicker in Calendar/StreakStats (1-2 seconds)
- Components reload data multiple times
- User experience feels unpolished

### After (Expected):
- Single doRefresh call on login (1)
- No visible flicker in any component
- Components load data once from cache
- Instant perceived load time
- Production-grade smooth UX

---

## Implementation Order

**Day 1:**
1. Phase 1 fixes (Calendar hasLoadedRef) - 30 min
2. Test Phase 1 thoroughly - 30 min
3. Phase 2.1 (UserProvider debounce) - 30 min
4. Test Phase 2.1 - 30 min

**Day 2:**
1. Phase 3.1 (Remove appEpoch on login) - 20 min
2. Test Phase 3.1 - 40 min
3. Phase 3.2 (Enhance warm-start) - 15 min
4. Full regression testing - 45 min

**Day 3:**
1. Phase 4 (Add monitoring) - 15 min
2. Full E2E testing all scenarios - 60 min
3. User acceptance testing - 30 min
4. Remove debug logs - 15 min

---

**Ready for approval**: @nickcamacho please review and approve before implementation.

