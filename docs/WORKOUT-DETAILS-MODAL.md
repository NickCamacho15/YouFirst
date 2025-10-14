# Workout Details Modal Feature

## Overview
Clicking on workouts in the Upcoming and Past Workouts sections now shows a detailed modal instead of immediately starting a workout session.

## Implementation

### New Component: WorkoutDetailsModal
**Location:** `mobile/components/workout/WorkoutDetailsModal.tsx`

A comprehensive modal that shows:
- **Workout name and description**
- **Scheduled date** (formatted nicely)
- **Schedule type** (one-time or weekly recurring)
- **Assigned by** (coach/admin)
- **Duration** (for completed past workouts)
- **Program length** (number of weeks)
- **Status badge** (for past workouts: Completed ✅ or Incomplete ❌)

### Modal Behavior

#### For Upcoming Workouts:
- Shows workout details
- Displays scheduled date
- Shows recurring schedule (e.g., "Weekly: Mon, Wed, Fri")
- **Action Button**: "Start Workout" (green button with play icon)
  - Clicking this closes modal and starts the workout

#### For Past Workouts:
- Shows all workout details
- Displays completion status badge at top
- **If Completed** ✅:
  - Shows duration of workout session
  - **Action Button**: "View Workout Session" (blue button with eye icon)
  - Clicking this shows the full workout session details
  
- **If Incomplete** ❌:
  - Shows red incomplete badge
  - **Action Button**: "Start Workout Now" (green button with play icon)
  - Allows user to still complete a missed workout

### User Flow

**Before:**
```
Tap Workout → Immediately Start Session ⚠️
```

**After:**
```
Tap Upcoming Workout → Modal with Details → "Start Workout" button → Session

Tap Past Workout (Completed) → Modal with Details + Duration → "View Session" button

Tap Past Workout (Incomplete) → Modal with Details → "Start Workout Now" button → Session
```

### Visual Design

**Modal Structure:**
```
┌─────────────────────────────┐
│  [X]  Workout Details       │ ← Header
├─────────────────────────────┤
│  ✅ Completed Badge          │ ← Status (past only)
│                             │
│  Workout Name (Large)       │
│  Description text...        │
│                             │
│  📅 Date                     │
│     Wednesday, Oct 15, 2025 │
│                             │
│  🔄 Schedule                 │
│     Weekly: Mon, Wed, Fri   │
│                             │
│  👤 Assigned By              │
│     adminn                  │
│                             │
│  ⏱️  Duration                │
│     45m (completed only)    │
│                             │
├─────────────────────────────┤
│  [Start Workout Button]     │ ← Footer
└─────────────────────────────┘
```

### Code Changes

**1. Created WorkoutDetailsModal.tsx**
- Full-featured modal component
- Handles both upcoming and past workout states
- Fetches workout duration from database for completed workouts
- Conditional action buttons based on status

**2. Updated AssignedWorkoutsList.tsx**
- Added modal state management
- Created `handleWorkoutPress()` function
- Fetches workout session duration for completed workouts
- Different handlers for upcoming vs past workouts:
  - `onPress={() => handleWorkoutPress(workout, false)}` for upcoming
  - `onPress={() => handleWorkoutPress(workout, true)}` for past

**3. Database Query**
Fetches completed workout duration:
```typescript
supabase
  .from('workout_sessions')
  .select('total_seconds')
  .eq('plan_id', workout.plan_id)
  .eq('status', 'completed')
  .gte('started_at', `${displayDate}T00:00:00`)
  .lt('started_at', `${displayDate}T23:59:59`)
```

### Benefits

✅ **Better UX**: Users can review workout details before committing to start
✅ **Information Rich**: See schedule, assignments, and completion status
✅ **Flexibility**: Can still start incomplete past workouts
✅ **Session Details**: View completed workout duration and details
✅ **Professional Feel**: Polished modal interaction instead of instant action

## Date: October 14, 2025

