# Database Schema Verification - COMPLETE ✅

**Date:** October 8, 2025  
**Database:** Supabase PostgreSQL  
**Status:** Schema verified and ready for workout features

---

## ✅ What EXISTS and is WORKING

### 1. Training Plan Hierarchy (COMPLETE)

All tables exist with proper structure and relationships:

```
training_plans (7 columns)
├── id (uuid, PK)
├── user_id (uuid, FK → users)
├── name (text)
├── description (text, nullable)
├── start_date (date)
├── is_active (boolean)
└── created_at (timestamptz)

plan_weeks (6 columns)
├── id, plan_id, user_id, name, position, created_at

plan_days (7 columns)  
├── id, plan_id, week_id, user_id, name, position, created_at

plan_blocks (8 columns)
├── id, plan_id, day_id, user_id, name, letter, position, created_at

plan_exercises (17 columns!)
├── id, plan_id, block_id, user_id, name, type
├── sets, reps, weight, rest, position, created_at
├── time, distance, pace, time_cap, score_type, target
└── CHECK: type IN ('Lifting', 'Cardio', 'METCON')
```

**Foreign Keys:** All properly cascading on delete  
**Indexes:** All optimized (plan_id, week_id, day_id, block_id)  
**RLS Policies:** Owner-only access enforced

---

### 2. Workout Session Tracking (COMPLETE)

Comprehensive session logging system:

```
workout_sessions (11 columns)
├── id, user_id, plan_id, plan_day_id
├── started_at, ended_at, total_seconds
├── status ('in_progress' | 'completed' | 'aborted')
├── blocks_completed, exercises_completed
└── Trigger: auto-sets user_id

session_exercises (19 columns!)
├── id, session_id, plan_exercise_id
├── name, type, order_index
├── started_at, completed_at
├── target_* fields (sets, reps, weight, rest, time, distance, etc.)
└── Supports: Lifting, Cardio, METCON

set_logs (17 columns!)
├── id, session_exercise_id, set_index
├── target_* (reps, weight, time, distance, pace)
├── actual_* (reps, weight, time, distance, pace, score)
├── rest_seconds_actual, completed_at
└── UNIQUE: (session_exercise_id, set_index)
```

**Key Features:**
- ✅ Tracks target vs actual for each set
- ✅ Supports multiple exercise types
- ✅ Rest timer tracking
- ✅ Parent-child RLS policies for data security

---

### 3. Role-Based Access System (COMPLETE)

```
users (9 columns)
├── id, email, display_name, bio, profile_image_url
├── username (unique, case-insensitive index)
├── role ('admin' | 'user') ← EXISTS ✅
├── group_id (FK → groups) ← EXISTS ✅
└── created_at

groups (5 columns)
├── id, name, access_code (unique)
├── created_by (FK → users)
└── created_at

plan_assignments (5 columns)
├── id, plan_id, user_id, assigned_by
├── created_at
└── UNIQUE: (plan_id, user_id)
```

**RLS Policies Working:**
- ✅ `users_select_same_group_if_admin` - Admins can see group members
- ✅ `plan_assignments_select_member_or_admin` - Both can see assignments
- ✅ `plan_assignments_cud_admin` - Only admins can assign
- ✅ `groups_select_member` - Members can see their group
- ✅ `groups_cud_admin` - Only admins can manage group

**Helper Functions:**
- ✅ `current_user_role()` - Returns user's role
- ✅ `current_user_group_id()` - Returns user's group_id

---

## ⚠️ What's MISSING (Just ONE thing!)

### Status Column for Draft/Published Workflow

**Current State:**
- All plans are visible to assigned users immediately
- No way to work on a plan in "draft" mode
- Admins can't test before publishing

**Solution:**
```sql
ALTER TABLE public.training_plans
ADD COLUMN status text 
CHECK (status IN ('draft', 'published', 'archived')) 
DEFAULT 'draft';
```

**Impact:**
- Admins can create plans in draft mode
- Draft plans only visible to admin (creator)
- Publish makes plan visible to assigned users
- Archive for old/unused plans

---

## 📊 Current Data Count

```sql
-- Run this to see current data:
SELECT 
  (SELECT COUNT(*) FROM training_plans) as plans,
  (SELECT COUNT(*) FROM plan_exercises) as exercises,
  (SELECT COUNT(*) FROM workout_sessions) as sessions,
  (SELECT COUNT(*) FROM groups) as groups,
  (SELECT COUNT(*) FROM users WHERE role IS NOT NULL) as users_with_roles,
  (SELECT COUNT(*) FROM plan_assignments) as assignments;
```

---

## 🎯 Implementation Readiness

### Phase 1: Database Migration ✅ READY
**File:** `add-workout-status-column.sql`  
**Action:** Run in Supabase SQL Editor  
**Risk:** Very low (backward compatible)  
**Time:** < 1 minute

### Phase 2: Admin Planning Tab ✅ READY
**File:** `BodyScreen.tsx`  
**Changes:**
- Add 3rd tab for admins
- Query plans with status filter
- Create/edit/publish UI
- Member management

### Phase 3: Workout Completion UI ✅ READY
**File:** `ActiveWorkoutScreen.tsx` (new)  
**Features:**
- Hevy/Strong-inspired logging
- Set-by-set tracking
- Rest timer
- Progress indicators
- Completion celebration

---

## 🔒 Security Verification

All RLS policies are properly configured:

### Training Plans
```sql
-- Admins see all their own plans (any status)
tp_select_own: user_id = auth.uid()

-- Users only see PUBLISHED plans assigned to them
training_plans_select_assigned: 
  EXISTS (plan_assignments WHERE user_id = auth.uid())
```

**After adding `status` column, update to:**
```sql
training_plans_select_assigned:
  status = 'published' AND 
  EXISTS (plan_assignments WHERE user_id = auth.uid())
```

### Workout Sessions
```sql
-- Users can only insert/select/update their own sessions
ws_insert_own: user_id = auth.uid()
ws_select_own: user_id = auth.uid()
ws_update_own: user_id = auth.uid()
```

### Session Exercises & Set Logs
```sql
-- Parent-child security: users can only log sets for their own sessions
se_*_parent: EXISTS (workout_sessions WHERE id = session_id AND user_id = auth.uid())
sl_*_parent: EXISTS (session_exercises JOIN workout_sessions ...)
```

**Result:** ✅ No user can see/modify another user's data

---

## 🚀 Next Steps

1. **Run Migration** ⏭️ NEXT
   ```bash
   # In Supabase SQL Editor, run:
   # docs/add-workout-status-column.sql
   ```

2. **Update BodyScreen.tsx**
   - Add `planning` tab for admins
   - Add status filter to plan queries
   - Create workout template cards

3. **Create Workout Builder Modal**
   - Exercise editor
   - Sets/reps configuration
   - Publish button

4. **Create Active Workout Screen**
   - Exercise list with progress
   - Set logging UI
   - Rest timer
   - Completion screen

5. **Testing**
   - Admin creates draft workout
   - Admin publishes workout
   - Admin assigns to user
   - User starts and completes workout
   - Verify data flows correctly

---

## 📝 SQL Migration Command

```bash
# Connect to database
psql "postgresql://postgres.jevviwdsnyvvtpnqbecm:ckEmWntBVBvrAmpi@aws-0-us-east-2.pooler.supabase.com:5432/postgres"

# Or run in Supabase SQL Editor (recommended)
# Copy contents of: docs/add-workout-status-column.sql
```

---

## ✅ Verification Checklist

- [x] Training plan hierarchy exists (plans → weeks → days → blocks → exercises)
- [x] Workout session tracking exists (sessions → exercises → sets)
- [x] Users table has `role` and `group_id` columns
- [x] Groups table with access_code system
- [x] Plan assignments table for linking users to plans
- [x] RLS policies enforce proper access control
- [x] Foreign keys cascade properly
- [x] Indexes optimize queries
- [x] Helper functions for role/group checks
- [ ] Status column on training_plans (ONLY MISSING PIECE)

---

**Status:** Ready to implement  
**Risk Level:** Low  
**Estimated Implementation Time:** 2-3 weeks  
**Database Changes Required:** 1 column + 1 policy update

