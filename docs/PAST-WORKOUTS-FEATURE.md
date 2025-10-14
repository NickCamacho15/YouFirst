# Past Workouts Feature

## Overview
Replaced the "This Week" section with a "Past Workouts" section that shows the user's workouts from the last 14 days with completion status badges.

## Implementation Details

### New Function: `getPastWorkouts()`
**Location:** `mobile/lib/workout-assignments.ts`

Returns workouts from the past 14 days (excluding today):
- Generates instances for recurring weekly workouts
- Includes one-time scheduled workouts
- Respects start_date and end_date ranges
- Sorts by date descending (most recent first)

```typescript
export async function getPastWorkouts(): Promise<Array<AssignedWorkout & { displayDate: string }>>
```

### UI Changes
**Location:** `mobile/components/workout/AssignedWorkoutsList.tsx`

**Replaced:**
- "This Week" section (showed current week with all statuses)
- "Completed Workouts" section (showed only completed from current week)

**Added:**
- "Past Workouts" section with:
  - Header: "Past Workouts" with "Last 14 days" subtitle
  - Gray calendar icon
  - Gray day indicator badges (muted color)
  - Completion status badges:
    - ✅ Green "Completed" badge
    - ❌ Red "Incomplete" badge

### Status Logic
Each past workout shows:
- **Completed**: User has a completed `workout_session` for that plan_id on that date
- **Incomplete**: The workout was scheduled but not completed

### Visual Design
- **Section Header**: Calendar icon + "Past Workouts" + "Last 14 days" subtitle
- **Day Indicator**: Gray background (#6B7280) instead of blue
- **Status Badges**: 
  - Completed: Green background with checkmark icon
  - Incomplete: Red background with X icon
- **Sorting**: Most recent dates at the top

## User Flow
1. User opens Body tab → Workouts section
2. Sees "Today's Workouts" (if any scheduled for today)
3. Sees "Upcoming Workouts" (next 7 days)
4. Scrolls down to "Past Workouts" (last 14 days)
5. Can tap any past workout to view details

## Benefits
- **14-day history**: See workout adherence over 2 weeks
- **Clear status**: Immediately see which workouts were completed vs missed
- **Accountability**: Visual feedback on workout consistency
- **Better organization**: Separates past from upcoming, removing confusion

## Example
For a Mon/Wed/Fri recurring workout:
- Oct 13 (Mon) - Incomplete ❌
- Oct 11 (Sat) - Test 2 - Completed ✅
- Oct 10 (Fri) - Incomplete ❌
- Oct 8 (Wed) - Incomplete ❌
- Oct 6 (Mon) - Incomplete ❌
- ... and so on for 14 days

## Date: October 14, 2025

