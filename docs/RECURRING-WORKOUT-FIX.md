# Recurring Workout Schedule Fix

## Problem
When setting up a recurring weekly workout schedule in the Planning tab (e.g., workouts on Monday, Wednesday, Friday), the workouts were not appearing in the "Today's Workouts" section on the scheduled days.

## Root Cause
The system had two separate tables for workout scheduling:
1. **training_plans** - Contains the workout template with schedule information (set in Planning tab)
2. **plan_assignments** - Contains user-specific workout assignments

When a workout with a recurring schedule was assigned to users, the schedule information from `training_plans` was **not being copied** to `plan_assignments`. This meant:
- The schedule was correctly stored in `training_plans` ✅
- But when assigned to users, `plan_assignments` had no schedule info ❌
- The UI queries `plan_assignments` to show user workouts, so recurring schedules didn't show up

### Example from Database
**Before Fix:**
```sql
-- training_plans (correct)
schedule_type: 'weekly'
recurrence_days: {1,3,5}  -- Monday, Wednesday, Friday
start_date: '2025-10-10'

-- plan_assignments (broken)
schedule_type: 'once'
recurrence_days: NULL  -- Missing!
```

## Solution
### 1. Code Fix (mobile/lib/workout-assignments.ts)
Updated `assignWorkoutToUser()` to automatically inherit schedule from `training_plans` if no explicit schedule is provided:

```typescript
// If no scheduleParams provided, check if the training_plan has a schedule and copy it
let effectiveScheduleParams = scheduleParams
if (!effectiveScheduleParams) {
  const { data: planData, error: planError } = await supabase
    .from("training_plans")
    .select("schedule_type, scheduled_date, recurrence_days, start_date, end_date")
    .eq("id", planId)
    .single()
  
  if (!planError && planData && planData.schedule_type) {
    effectiveScheduleParams = {
      scheduleType: planData.schedule_type as ScheduleType,
      scheduledDate: planData.scheduled_date || undefined,
      recurrenceDays: planData.recurrence_days || undefined,
      startDate: planData.start_date || undefined,
      endDate: planData.end_date || undefined,
    }
  }
}
```

### 2. Database Fix
Updated existing `plan_assignments` to copy schedule from their parent `training_plans`:

```sql
UPDATE plan_assignments 
SET 
  schedule_type = tp.schedule_type,
  scheduled_date = tp.scheduled_date,
  recurrence_days = tp.recurrence_days,
  start_date = tp.start_date,
  end_date = tp.end_date
FROM training_plans tp
WHERE plan_assignments.plan_id = tp.id
  AND tp.schedule_type IS NOT NULL
```

See: `docs/migrations/008-fix-plan-assignments-schedule-copy.sql`

## Verification
After the fix:
- Recurring workouts scheduled for Monday, Wednesday, Friday now appear in "Today's Workouts" on those days ✅
- The schedule logic correctly checks:
  - Day of week matches `recurrence_days`
  - Current date is within `start_date` and `end_date` range
  - Workout is marked as active

## Impact
- **New assignments**: Will automatically inherit schedule from training_plans
- **Existing assignments**: Have been updated via database migration
- **User experience**: Recurring workouts now show up correctly in the Workouts tab

## Date: October 14, 2025

