# Workout Scheduling System - High-Level Plan

## 🎯 Goal
Allow admins to assign workouts to users with flexible scheduling:
1. **One-time assignment** - Assign for a specific date
2. **Weekly recurring** - Assign for specific days of the week (e.g., MWF every week)

---

## 🔄 User Flow (Admin)

### Current Flow (Simple Assignment):
1. Click "Assign" on a workout
2. Select users
3. Click "Assign to X members"
4. ✅ Done

### New Flow (Scheduled Assignment):

```
┌─────────────────────────────────────┐
│  Admin clicks "Assign"              │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Step 1: Select Members             │
│  ☐ user1                            │
│  ☐ user2                            │
│  ☐ user3                            │
│  [Select All]                       │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Step 2: Choose Schedule Type       │
│  ⦿ One-time (specific date)         │
│  ○ Weekly recurring                 │
└────────────┬────────────────────────┘
             │
        ┌────┴────┐
        │         │
        ▼         ▼
    ┌───────┐ ┌───────────────────┐
    │ Date  │ │ Days of Week      │
    │ Picker│ │ ☐ Mon ☐ Tue ☐ Wed│
    └───┬───┘ │ ☐ Thu ☐ Fri ☐ Sat│
        │     │ ☐ Sun             │
        │     │ Start: [Date]     │
        │     │ End: [Optional]   │
        │     └─────────┬─────────┘
        │               │
        └───────┬───────┘
                │
                ▼
    ┌───────────────────────┐
    │  Step 3: Review       │
    │  Preview schedule     │
    │  [Assign]             │
    └───────────────────────┘
```

---

## 📊 Database Schema Changes

### Extend `plan_assignments` Table:

```sql
ALTER TABLE plan_assignments ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'immediate' CHECK (schedule_type IN ('immediate', 'once', 'weekly'));
ALTER TABLE plan_assignments ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE plan_assignments ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[];  -- [1,3,5] for MWF
ALTER TABLE plan_assignments ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE plan_assignments ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE plan_assignments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

**Field Definitions:**
- `schedule_type`: 
  - `'immediate'` - Assigned now, available immediately (current behavior)
  - `'once'` - One-time on a specific date
  - `'weekly'` - Recurring weekly on specific days
- `scheduled_date`: For one-time assignments
- `recurrence_days`: Array of day numbers (0=Sun, 1=Mon, ..., 6=Sat)
- `start_date`: When recurring schedule starts
- `end_date`: When recurring schedule ends (null = ongoing)
- `is_active`: Allow admin to pause/unpause assignments

---

## 🎨 UI Components to Create

### 1. **ScheduleTypeSelector**
Radio buttons to choose:
- ⦿ Assign Now (immediate)
- ○ Specific Date (once)
- ○ Weekly Recurring (weekly)

### 2. **DatePicker** (for one-time)
- Calendar picker to select date
- Validation: Can't select past dates

### 3. **WeeklyScheduleSelector** (for recurring)
- 7 day checkboxes (Sun-Sat)
- Start date picker
- Optional end date picker
- Preview: "Every Mon, Wed, Fri starting Jan 15, 2025"

### 4. **SchedulePreview**
Shows what the schedule looks like:
- One-time: "Scheduled for Monday, January 15"
- Weekly: "Every Mon, Wed, Fri starting January 15"

---

## 👤 User Experience (Regular Users)

### Workouts Tab - New Sections:

```
┌────────────────────────────────────┐
│ 📅 Today's Workouts                │
│ ─────────────────────────────      │
│ • Upper Body Strength              │
│   Assigned by coach                │
│   [Start Workout]                  │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ 📆 This Week                       │
│ ─────────────────────────────      │
│ Mon • Upper Body (Today)           │
│ Wed • Legs & Core                  │
│ Fri • Full Body HIIT               │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ 📚 All My Workouts                 │
│ ─────────────────────────────      │
│ • Upper Body Strength              │
│   Every Mon, Wed, Fri              │
│ • Cardio & Core                    │
│   Every Tue, Thu                   │
└────────────────────────────────────┘
```

**Key Features:**
1. **Today's Workouts** - What's scheduled for today
2. **This Week** - Week view with scheduled workouts
3. **All Workouts** - See entire schedule

---

## 🔧 Implementation Steps

### Phase 1: Database & Schema ✅
1. Create migration SQL file
2. Add new columns to plan_assignments
3. Update RLS policies if needed

### Phase 2: Backend Functions
1. Update `assignWorkoutToUser()` to accept schedule params
2. Create `getScheduledWorkoutsForDate(date)` function
3. Create `getWorkoutsForWeek(startDate)` function
4. Create `getTodaysWorkouts()` function

### Phase 3: UI Components
1. Create `ScheduleTypeSelector.tsx`
2. Create `DatePickerInput.tsx` (or use existing RN datepicker)
3. Create `WeeklyScheduleSelector.tsx`
4. Create `SchedulePreview.tsx`

### Phase 4: Update Assignment Modal
1. Add scheduling step to `WorkoutAssignmentModal`
2. Multi-step flow: Members → Schedule → Review
3. Pass schedule data to assignment function

### Phase 5: Update User Workouts Display
1. Refactor `AssignedWorkoutsList` to show schedules
2. Add "Today's Workouts" section
3. Add "This Week" calendar view
4. Show schedule info on workout cards

### Phase 6: Testing
1. Test immediate assignments (current behavior)
2. Test one-time scheduled assignments
3. Test weekly recurring assignments
4. Test edge cases (past dates, end dates, etc.)

---

## 📋 Schedule Display Logic

### For Users Viewing Workouts:

```typescript
function getWorkoutsForDisplay(assignments: PlanAssignment[]) {
  const today = new Date()
  const todayWorkouts = []
  const weekWorkouts = []
  const allWorkouts = []

  for (const assignment of assignments) {
    if (assignment.schedule_type === 'immediate') {
      // Show in "All Workouts"
      allWorkouts.push(assignment)
    }
    else if (assignment.schedule_type === 'once') {
      // Check if scheduled_date is today
      if (isSameDay(assignment.scheduled_date, today)) {
        todayWorkouts.push(assignment)
      }
      // Check if in this week
      if (isThisWeek(assignment.scheduled_date)) {
        weekWorkouts.push(assignment)
      }
      allWorkouts.push(assignment)
    }
    else if (assignment.schedule_type === 'weekly') {
      // Check if today matches a recurrence day
      const dayOfWeek = today.getDay()
      if (assignment.recurrence_days.includes(dayOfWeek)) {
        todayWorkouts.push(assignment)
      }
      // Generate this week's schedule
      for (let day of assignment.recurrence_days) {
        if (isThisWeek(getDateForDayOfWeek(day))) {
          weekWorkouts.push({ ...assignment, displayDate: getDateForDayOfWeek(day) })
        }
      }
      allWorkouts.push(assignment)
    }
  }

  return { todayWorkouts, weekWorkouts, allWorkouts }
}
```

---

## 🎯 Success Metrics

### What "Done" Looks Like:

✅ Admin can assign workouts immediately (current behavior preserved)  
✅ Admin can schedule workout for specific date  
✅ Admin can schedule recurring workouts (weekly)  
✅ Users see "Today's Workouts" section  
✅ Users see weekly calendar of scheduled workouts  
✅ Schedule preview shows clear information  
✅ Past dates are disabled/validated  
✅ Recurring schedules show "Every Mon, Wed, Fri"  
✅ Users only see workouts on their scheduled days  

---

## 💡 Future Enhancements (V2)

- [ ] Edit/modify existing schedules
- [ ] Pause/unpause recurring assignments
- [ ] Custom recurrence (every 2 weeks, monthly, etc.)
- [ ] Push notifications for scheduled workouts
- [ ] "Skip this week" functionality
- [ ] Workout completion tracking affects next occurrence
- [ ] Auto-archive completed one-time workouts

---

## 🚀 Let's Build It!

This plan provides a solid foundation for a flexible, user-friendly scheduling system while maintaining the simplicity of immediate assignments for users who don't need scheduling.

