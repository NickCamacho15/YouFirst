# 📅 Workout Schedule & Publish Workflow

## **Major Workflow Change - Implemented**

The workout publishing system has been updated with a new scheduling-first approach.

---

## 🔄 **NEW Workflow**

### **Step 1: Create Workout (Draft)**
- Admin creates workout template
- Status: `draft`
- No schedule yet

### **Step 2: Publish with Schedule** ⭐ NEW
- Admin clicks **"Publish"** button
- Opens **PublishWorkoutModal**
- Admin selects schedule type:
  - **Once**: Specific date (e.g., "December 25, 2024")
  - **Weekly**: Recurring days (e.g., "Every Mon, Wed, Fri")
- Schedule is saved on the workout template itself
- Status changes to: `published`

### **Step 3: Admin Sees Own Workouts**
- Published workouts appear in admin's **Workouts tab**
- Shows on calendar based on schedule
- Admin can test/complete their own workouts

### **Step 4: Assign to Members** (Optional)
- Click **"Assign"** on published workout
- Select group members
- Schedule is already set (from Step 2)
- Members inherit the same schedule

---

## 🗄️ **Database Changes**

### New Columns on `training_plans`:
```sql
schedule_type       text        -- 'once', 'weekly'
scheduled_date      date        -- For 'once' type
recurrence_days     integer[]   -- [1,3,5] for Mon/Wed/Fri
start_date          date        -- For 'weekly' type
end_date            date        -- Optional end date
```

### Migration Applied:
✅ `003-add-workout-schedule-to-plans.sql`

---

## 📱 **User Experience**

### For Admins:

**Planning Tab:**
1. Create workout → Set exercises → Save as **Draft**
2. Click **Publish** → Set schedule in modal
3. Workout now shows as **Published** ✅

**Workouts Tab:**
- See their own published workouts
- Calendar shows scheduled workouts
- Can start and complete them like any user

### For Regular Users:

**Workouts Tab:**
- See workouts assigned to them
- Inherit schedule from the published workout
- Calendar shows when workouts are available

---

## 💻 **Technical Implementation**

### New Components:
```typescript
PublishWorkoutModal
├── Schedule Type Selector (Once/Weekly)
├── Date Picker (for 'once')
├── Weekly Days Selector (for 'weekly')
└── Schedule Summary
```

### Updated Functions:
```typescript
// New signature with schedule parameter
publishWorkoutTemplate(planId, schedule)

// Fetches admin's own published workouts
getAdminScheduledWorkouts()
```

### Updated Components:
```typescript
BodyScreen.tsx
├── Added PublishWorkoutModal
├── handlePublishWorkout() opens modal
└── handleConfirmPublish() saves with schedule

AssignedWorkoutsList.tsx
├── Fetches admin's own scheduled workouts
├── Merges with assigned workouts
└── Filters by schedule (date/recurrence)
```

---

## 🎯 **Key Benefits**

1. **Schedule Once, Use Everywhere**
   - Set schedule when publishing
   - All assignments inherit the schedule
   - No need to set schedule per user

2. **Admin Testing**
   - Admins see their published workouts
   - Can test before assigning to users
   - Same experience as regular users

3. **Calendar Integration**
   - Workouts appear on correct dates
   - Recurring workouts show every week
   - Clear visual schedule

4. **Simplified Assignment**
   - Just pick members
   - Schedule already set
   - Faster assignment process

---

## 📊 **Schedule Types Explained**

### **Once** 
```typescript
{
  scheduleType: 'once',
  scheduledDate: '2024-12-25'
}
```
- Specific date only
- Shows on that date in calendar
- Example: Holiday workout

### **Weekly**
```typescript
{
  scheduleType: 'weekly',
  recurrenceDays: [1, 3, 5],  // Mon, Wed, Fri
  startDate: '2024-01-01',
  endDate: '2024-12-31'        // Optional
}
```
- Repeats on selected days
- Shows every week on those days
- Example: Regular training program

---

## 🔍 **How It Works**

### Publishing Flow:
```
Admin clicks "Publish" 
  → PublishWorkoutModal opens
  → Admin selects schedule type
  → Admin confirms settings
  → Updates training_plans table:
      - status = 'published'
      - schedule_type = selected type
      - + schedule fields
  → Workout visible in admin's Workouts tab
```

### Calendar Display:
```
AssignedWorkoutsList loads
  → Fetches user's assigned workouts
  → If admin: Also fetches own published workouts
  → Filters by schedule:
      - Once: Match date
      - Weekly: Match day of week
  → Merges and displays
```

---

## 📝 **Example Scenarios**

### **Scenario 1: Weekly Training Program**
```
Admin creates "Upper Body Day"
  → Publish with Weekly schedule (Mon, Thu)
  → Admin sees it on their calendar Mon/Thu
  → Assigns to team members
  → Everyone sees it on Mon/Thu
```

### **Scenario 2: Special Event Workout**
```
Admin creates "New Year Challenge"
  → Publish with Once schedule (Jan 1, 2025)
  → Admin sees it on January 1st
  → Assigns to all members
  → Everyone sees it on January 1st only
```

---

## ✅ **Testing Checklist**

- [x] Admin can publish with once schedule
- [x] Admin can publish with weekly schedule
- [x] Published workouts appear in admin's Workouts tab
- [x] Calendar shows scheduled workouts correctly
- [x] Weekly recurring workouts show on correct days
- [x] Assignment modal still works (schedule pre-set)
- [x] Regular users see assigned workouts
- [x] Database migration applied successfully

---

## 📦 **Files Changed**

### Created:
- `mobile/components/workout/PublishWorkoutModal.tsx`
- `docs/migrations/003-add-workout-schedule-to-plans.sql`
- `docs/WORKOUT-SCHEDULE-PUBLISH-WORKFLOW.md` (this file)

### Modified:
- `mobile/screens/BodyScreen.tsx`
- `mobile/lib/workout-templates.ts`
- `mobile/lib/workout-assignments.ts`
- `mobile/components/workout/AssignedWorkoutsList.tsx`

---

## 🚀 **Result**

The new workflow provides a better experience by:
- ✅ Centralizing schedule management
- ✅ Allowing admins to test their own workouts
- ✅ Simplifying the assignment process
- ✅ Providing clear calendar visualization
- ✅ Supporting one-time and recurring schedules

**Status: COMPLETE & READY TO USE** 🎉

---

*Last Updated: 2024-10-10*
*Migration: 003-add-workout-schedule-to-plans.sql*

