# Workout Creator & Assignment - Implementation Plan

## Executive Summary

This document outlines the implementation plan for adding admin workout creation/publishing and user workout completion features to the YouFirst app, inspired by UI/UX patterns from Hevy and Strong fitness apps.

---

## 1. Current State Verification ✅

### What's Already Working

The role-based access system is **fully functional**:

1. **User Registration & Roles**
   - Admins can create groups with unique access codes
   - Regular users can join groups using access codes
   - Users are properly assigned roles (`admin` or `user`) and `group_id`

2. **Access Control (RLS Policies)**
   - ✅ Admins can see all users in their group (`users_select_same_group_if_admin`)
   - ✅ Users can see training plans assigned to them (`training_plans_select_assigned`)
   - ✅ Admins can assign plans to group members (`assign_plan_to_user` RPC)
   - ✅ Users can view assigned plans via `plan_assignments` join

3. **Database Schema**
   - `groups` table with access codes
   - `users.role` and `users.group_id` columns
   - `plan_assignments` table for linking plans to users
   - Complete training plan hierarchy: `training_plans` → `plan_weeks` → `plan_days` → `plan_blocks` → `plan_exercises`
   - Workout session tracking: `workout_sessions` → `session_exercises` → `set_logs`

### What's Missing

1. **Draft/Published Status**: Training plans need a `status` field to differentiate between drafts (admin-only) and published (visible to assigned users)
2. **Admin UI**: No interface for admins to create/edit workouts
3. **User UI**: No interface for users to browse assigned workouts and complete them
4. **Exercise Library**: No shared exercise database
5. **Workout Templates**: No way to duplicate or template workouts

---

## 2. UI/UX Patterns (Hevy & Strong Inspiration)

### Hevy & Strong Key Features

Both apps follow similar patterns for workout creation and completion:

#### Admin/Coach View (Workout Builder)
- **Template Library**: List of all created workout templates with draft/published status
- **Exercise Library**: Searchable database of exercises organized by muscle group
- **Workout Editor**: 
  - Drag-and-drop interface for reordering exercises
  - Quick add from exercise library
  - Inline editing of sets/reps/weight/rest
  - Support for supersets (blocks)
  - Notes per exercise
- **Publishing Flow**: Draft → Review → Publish → Assign to users

#### User View (Workout Completion)
- **Assigned Workouts**: Card-based list showing assigned workouts
- **Start Workout Button**: Large, prominent CTA
- **Active Workout View**:
  - Exercise list with current exercise highlighted
  - Set-by-set logging with checkboxes
  - Quick tap to log: weight, reps, rest timer
  - Auto-fill from previous session
  - Skip/swap exercises
  - Notes per set
- **Rest Timer**: Auto-starts after completing a set
- **Completion**: Summary screen with confetti, stats, share option

#### Common UI Elements
- **Progressive Disclosure**: Don't show all fields at once
- **Smart Defaults**: Auto-fill based on history
- **Quick Actions**: Swipe gestures, long-press menus
- **Visual Feedback**: Checkmarks, progress rings, animations
- **Optimistic Updates**: Instant UI feedback before API response

---

## 3. Database Schema Updates

### 3.1 Add Status Field to Training Plans

```sql
-- Add status column to training_plans
alter table public.training_plans
  add column if not exists status text check (status in ('draft','published','archived')) default 'draft';

-- Add index for filtering
create index if not exists training_plans_status_idx on public.training_plans(status);

-- Update RLS policy to hide drafts from regular users
drop policy if exists training_plans_select_assigned on public.training_plans;
create policy training_plans_select_assigned on public.training_plans
  for select to authenticated using (
    status = 'published' and exists (
      select 1 from public.plan_assignments pa
      where pa.plan_id = public.training_plans.id
        and pa.user_id = auth.uid()
    )
  );
```

### 3.2 Exercise Library (Optional - Phase 2)

```sql
-- Shared exercise library
create table if not exists public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null check (category in ('Chest','Back','Legs','Shoulders','Arms','Core','Cardio','Other')),
  equipment text[], -- e.g., ['Barbell', 'Bench']
  video_url text,
  thumbnail_url text,
  is_custom boolean not null default false,
  created_by uuid references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists exercise_library_category_idx on public.exercise_library(category);
create index if not exists exercise_library_name_idx on public.exercise_library(name);

alter table public.exercise_library enable row level security;

-- Everyone can read, only admins/creators can write
create policy exercise_library_select_all on public.exercise_library
  for select to authenticated using (true);

create policy exercise_library_cud_own on public.exercise_library
  for all to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
```

### 3.3 Plan Templates (Optional - Phase 3)

```sql
-- Allow plans to be templates that can be cloned
alter table public.training_plans
  add column if not exists is_template boolean not null default false,
  add column if not exists template_description text,
  add column if not exists cloned_from uuid references public.training_plans(id) on delete set null;

-- RPC to clone a plan
create or replace function public.clone_training_plan(p_plan_id uuid, p_new_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_new_plan_id uuid;
  v_week record;
  v_day record;
  v_block record;
  v_ex record;
  v_new_week_id uuid;
  v_new_day_id uuid;
  v_new_block_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Copy plan
  insert into public.training_plans (user_id, name, description, start_date, is_active, status, cloned_from)
  select v_uid, p_new_name, description, current_date, false, 'draft', id
  from public.training_plans where id = p_plan_id
  returning id into v_new_plan_id;

  -- Copy weeks
  for v_week in select * from public.plan_weeks where plan_id = p_plan_id order by position loop
    insert into public.plan_weeks (plan_id, user_id, name, position)
    values (v_new_plan_id, v_uid, v_week.name, v_week.position)
    returning id into v_new_week_id;

    -- Copy days
    for v_day in select * from public.plan_days where plan_id = p_plan_id and week_id = v_week.id order by position loop
      insert into public.plan_days (plan_id, week_id, user_id, name, position)
      values (v_new_plan_id, v_new_week_id, v_uid, v_day.name, v_day.position)
      returning id into v_new_day_id;

      -- Copy blocks
      for v_block in select * from public.plan_blocks where plan_id = p_plan_id and day_id = v_day.id order by position loop
        insert into public.plan_blocks (plan_id, day_id, user_id, name, letter, position)
        values (v_new_plan_id, v_new_day_id, v_uid, v_block.name, v_block.letter, v_block.position)
        returning id into v_new_block_id;

        -- Copy exercises
        for v_ex in select * from public.plan_exercises where plan_id = p_plan_id and block_id = v_block.id order by position loop
          insert into public.plan_exercises (plan_id, block_id, user_id, name, type, sets, reps, weight, rest, time, distance, pace, time_cap, score_type, target, position)
          values (v_new_plan_id, v_new_block_id, v_uid, v_ex.name, v_ex.type, v_ex.sets, v_ex.reps, v_ex.weight, v_ex.rest, v_ex.time, v_ex.distance, v_ex.pace, v_ex.time_cap, v_ex.score_type, v_ex.target, v_ex.position);
        end loop;
      end loop;
    end loop;
  end loop;

  return v_new_plan_id;
end $$;

grant execute on function public.clone_training_plan(uuid, text) to authenticated;
```

---

## 4. Admin UI Implementation

### 4.1 Admin Body Screen Tab Structure

Update `BodyScreen.tsx` to show different tabs for admins:

```typescript
// Tabs for admins:
const adminTabs = [
  "profile",    // Body metrics & PRs
  "workouts",   // Own workouts / active plans
  "library",    // Create & manage workout templates (NEW)
  "members"     // View group members & assign workouts (NEW)
]

// Tabs for regular users:
const userTabs = [
  "profile",    // Body metrics & PRs
  "workouts"    // Assigned workouts
]
```

### 4.2 Library Tab (Admin Only)

**Layout**:
```
┌─────────────────────────────────────┐
│ 📚 Workout Library                  │
│ ┌─────────┬─────────┬─────────┐    │
│ │  All    │ Draft   │Published│    │
│ └─────────┴─────────┴─────────┘    │
│                                     │
│ [+ Create New Workout]              │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ 🏋️ Upper Body Strength       │    │
│ │ 5 exercises • 45 min        │    │
│ │ Status: Published           │    │
│ │ Assigned to: 12 users       │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ 🏃 Full Body HIIT [DRAFT]   │    │
│ │ 8 exercises • 30 min        │    │
│ │ Status: Draft               │    │
│ │ [Continue Editing]          │    │
│ └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Features**:
- Filter by status (All, Draft, Published, Archived)
- Create new workout button
- Card-based list with workout preview
- Quick actions: Edit, Duplicate, Archive, Assign
- Shows assignment count

### 4.3 Workout Builder/Editor

**Modal/Screen for creating/editing**:

```
┌─────────────────────────────────────┐
│ ← Back                      [Save]  │
│                                     │
│ Workout Name                        │
│ ┌─────────────────────────────┐    │
│ │ Upper Body Strength         │    │
│ └─────────────────────────────┘    │
│                                     │
│ Description (optional)              │
│ ┌─────────────────────────────┐    │
│ │ Push-focused upper body...  │    │
│ └─────────────────────────────┘    │
│                                     │
│ Exercises                           │
│ ┌─────────────────────────────┐    │
│ │ A1 • Bench Press            │    │
│ │     5 sets × 5 reps @ 185lb │    │
│ │     Rest: 2:00              │    │
│ └─────────────────────────────┘    │
│ ┌─────────────────────────────┐    │
│ │ A2 • Incline DB Press       │    │
│ │     3 sets × 10 reps @ 60lb │    │
│ │     Rest: 1:30              │    │
│ └─────────────────────────────┘    │
│                                     │
│ [+ Add Exercise]                    │
│                                     │
│ ┌────────────┬────────────────┐    │
│ │ Save Draft │ Publish Workout│    │
│ └────────────┴────────────────┘    │
└─────────────────────────────────────┘
```

**Features**:
- Inline editing of name/description
- Exercise cards with drag handles for reordering
- Tap to edit exercise details
- Add Exercise opens modal with:
  - Exercise name input
  - Type selector (Lifting, Cardio, METCON)
  - Sets/Reps/Weight/Rest fields
  - Quick templates (e.g., "3×10", "5×5")
- Save as Draft (only admin can see)
- Publish (makes visible to assigned users)

### 4.4 Members Tab (Admin Only)

**Layout**:
```
┌─────────────────────────────────────┐
│ 👥 Group Members                    │
│                                     │
│ Group: Alpha Cohort                 │
│ Access Code: ALPHA2024              │
│ [Copy Code]                         │
│                                     │
│ Members (12)                        │
│ ┌─────────────────────────────┐    │
│ │ 👤 John Doe                  │    │
│ │    john@email.com           │    │
│ │    Assigned: 3 workouts     │    │
│ │    [Assign Workout]         │    │
│ └─────────────────────────────┘    │
│ ┌─────────────────────────────┐    │
│ │ 👤 Jane Smith               │    │
│ │    jane@email.com           │    │
│ │    Assigned: 2 workouts     │    │
│ │    [Assign Workout]         │    │
│ └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Features**:
- Display group info and access code
- List all group members
- Show how many workouts assigned to each
- [Assign Workout] button opens modal:
  - List of published workouts
  - Multi-select to assign multiple
  - Confirmation with success message

### 4.5 Assign Workout Modal

```
┌─────────────────────────────────────┐
│ Assign Workouts to John Doe     ✕  │
│                                     │
│ Select Workouts:                    │
│ ┌─────────────────────────────┐    │
│ │ ☑ Upper Body Strength       │    │
│ └─────────────────────────────┘    │
│ ┌─────────────────────────────┐    │
│ │ ☐ Lower Body Power          │    │
│ └─────────────────────────────┘    │
│ ┌─────────────────────────────┐    │
│ │ ☑ Full Body Conditioning    │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌───────────────────────────────┐  │
│ │      Assign Selected (2)      │  │
│ └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 5. User UI Implementation

### 5.1 Workouts Tab (Regular Users)

**Layout**:
```
┌─────────────────────────────────────┐
│ 💪 My Workouts                      │
│                                     │
│ Assigned by Coach                   │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ 🏋️ Upper Body Strength       │    │
│ │ 5 exercises • 45 min        │    │
│ │ Last: 3 days ago            │    │
│ │                             │    │
│ │ [START WORKOUT]             │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ 🦵 Lower Body Power          │    │
│ │ 6 exercises • 50 min        │    │
│ │ Last: 1 week ago            │    │
│ │                             │    │
│ │ [START WORKOUT]             │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ 🔥 Full Body Conditioning    │    │
│ │ 8 exercises • 35 min        │    │
│ │ Never completed             │    │
│ │                             │    │
│ │ [START WORKOUT]             │    │
│ └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Features**:
- List all assigned workouts (published only)
- Show last completion date
- Estimated duration
- Large START WORKOUT button
- Tap card to see workout preview

### 5.2 Workout Preview Modal

```
┌─────────────────────────────────────┐
│ ← Back                              │
│                                     │
│ Upper Body Strength                 │
│ 5 exercises • ~45 minutes           │
│                                     │
│ Exercises:                          │
│ • Bench Press - 5×5 @ 185lb         │
│ • Incline DB Press - 3×10 @ 60lb    │
│ • Overhead Press - 3×8 @ 95lb       │
│ • Cable Fly - 3×12 @ 40lb           │
│ • Tricep Pushdown - 3×15 @ 50lb     │
│                                     │
│ Last Completed: 3 days ago          │
│ Personal Best: 185lb bench          │
│                                     │
│ ┌───────────────────────────────┐  │
│ │      START WORKOUT            │  │
│ └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 5.3 Active Workout Screen

**Layout** (Hevy/Strong style):
```
┌─────────────────────────────────────┐
│ ⏱️ 12:34              ⏸️ Pause  ✓   │
│                                     │
│ Upper Body Strength                 │
│ ●●●○○ (3 of 5 complete)            │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ ✓ Bench Press [DONE]        │    │
│ │   5 sets complete           │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ → INCLINE DB PRESS          │    │
│ │   3 sets × 10 reps @ 60lb   │    │
│ │                             │    │
│ │   Set 1  ☑  10 reps  60lb   │    │
│ │   Set 2  ☑  10 reps  60lb   │    │
│ │   Set 3  ☐  10 reps  60lb   │    │
│ │             [LOG SET]        │    │
│ │                             │    │
│ │   Rest Timer: 1:30          │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ Overhead Press              │    │
│ │ 3 sets × 8 reps @ 95lb      │    │
│ └─────────────────────────────┘    │
│                                     │
│ [FINISH WORKOUT]                    │
└─────────────────────────────────────┘
```

**Features**:
- Timer at top showing workout duration
- Progress indicator (dots or bar)
- Current exercise highlighted/expanded
- Quick tap to log sets with checkboxes
- Auto-fill previous weight/reps
- Rest timer auto-starts after completing a set
- Collapse completed exercises
- [FINISH WORKOUT] button at bottom

### 5.4 Log Set Modal

```
┌─────────────────────────────────────┐
│ Log Set 3 - Incline DB Press    ✕  │
│                                     │
│ Target: 10 reps @ 60lb              │
│                                     │
│ Reps Completed                      │
│ ┌─────────────────────────────┐    │
│ │           10                │    │
│ └─────────────────────────────┘    │
│ [- 8  9  10  11  12 +]              │
│                                     │
│ Weight (lb)                         │
│ ┌─────────────────────────────┐    │
│ │           60                │    │
│ └─────────────────────────────┘    │
│ [-5  -2.5  60  +2.5  +5]            │
│                                     │
│ ┌───────────────────────────────┐  │
│ │         LOG SET ✓             │  │
│ └───────────────────────────────┘  │
│                                     │
│ Rest Timer will start: 1:30         │
└─────────────────────────────────────┘
```

**Features**:
- Large number inputs
- Quick adjustment buttons
- Shows target vs actual
- Auto-starts rest timer after logging

### 5.5 Rest Timer

**Overlay/Banner**:
```
┌─────────────────────────────────────┐
│ 🧘 Rest Timer                       │
│                                     │
│        1:15                         │
│     ●●●●●●●○○○                      │
│                                     │
│ [+30s]  [Skip Rest]  [-30s]         │
└─────────────────────────────────────┘
```

**Features**:
- Visual countdown
- Add/subtract time
- Skip rest to move to next set
- Plays gentle sound when complete

### 5.6 Workout Complete Screen

```
┌─────────────────────────────────────┐
│             🎉                      │
│      WORKOUT COMPLETE!              │
│                                     │
│ Upper Body Strength                 │
│                                     │
│ ⏱️  42 minutes                       │
│ 🏋️  15 sets completed                │
│ 💪  12,500 lbs volume                │
│                                     │
│ 🔥 3 day streak!                    │
│                                     │
│ ┌───────────────────────────────┐  │
│ │          DONE                 │  │
│ └───────────────────────────────┘  │
│                                     │
│ [View History]                      │
└─────────────────────────────────────┘
```

**Features**:
- Confetti animation
- Workout stats
- Streak tracker
- Done button returns to workout list

---

## 6. Implementation Phases

### Phase 1: Core Admin Functionality (Week 1-2)
1. ✅ Add `status` column to `training_plans` (SQL migration)
2. ✅ Update RLS policies to hide drafts from users
3. Create Library Tab UI for admins
4. Create Workout Builder/Editor UI
5. Implement save draft and publish actions
6. Create Members Tab UI
7. Implement assign workout functionality

**Deliverable**: Admins can create workout templates, save as drafts, publish them, and assign to group members.

### Phase 2: Core User Functionality (Week 3-4)
1. Update user Workouts Tab to show assigned workouts
2. Create Workout Preview Modal
3. Create Active Workout Screen
4. Implement set logging UI
5. Add rest timer functionality
6. Create workout completion screen
7. Test end-to-end: admin creates → publishes → assigns → user completes

**Deliverable**: Users can view assigned workouts and complete them with full tracking.

### Phase 3: Polish & Enhancement (Week 5-6)
1. Add exercise library (optional)
2. Add workout templates/cloning
3. Add workout history view
4. Add progress charts for exercises
5. Add workout notes/comments
6. Improve animations and transitions
7. Add haptic feedback
8. Performance optimization

**Deliverable**: Polished, production-ready workout system.

### Phase 4: Advanced Features (Future)
- Program builder (multi-week periodization)
- Exercise video library
- Form check reminders
- Social features (share workouts)
- AI-powered recommendations
- Integration with wearables

---

## 7. Technical Considerations

### 7.1 Performance
- Cache workout data locally to avoid refetching
- Use optimistic updates for set logging
- Lazy load exercise details
- Preload next exercise while resting

### 7.2 Offline Support
- Queue workout session data for sync
- Allow completing workouts offline
- Sync when connection restored
- Show sync status indicator

### 7.3 State Management
- Use React Context for active workout state
- Persist active workout to AsyncStorage
- Resume workout if app closed mid-session

### 7.4 Animations
- Use `react-native-reanimated` for smooth transitions
- Confetti with `react-native-confetti-cannon`
- Progress indicators with `react-native-svg`
- Rest timer with circular progress

### 7.5 Testing Strategy
- Unit tests for workout logic
- Integration tests for RLS policies
- E2E tests for full flow:
  - Admin creates workout
  - Admin assigns to user
  - User completes workout
- Test offline scenarios

---

## 8. Success Metrics

### User Engagement
- % of assigned workouts completed
- Average time to complete workout
- Workout completion streak
- Weekly active users

### Admin Adoption
- Number of workouts created per admin
- Number of workouts assigned
- Number of group members per admin

### System Performance
- API response times < 200ms
- Workout start time < 1s
- Set logging response < 100ms
- Zero data loss in offline scenarios

---

## 9. Open Questions

1. **Exercise Library**: Build custom or integrate with existing API (e.g., ExerciseDB)?
2. **Video Support**: Host videos ourselves or link to YouTube?
3. **Bulk Assignment**: Assign same workout to multiple users at once?
4. **Program Templates**: Pre-built programs users can choose from?
5. **Workout Calendar**: Schedule specific workouts for specific days?
6. **Progress Photos**: Allow users to upload progress photos?

---

## 10. Next Steps

1. ✅ Create this implementation plan
2. Get user approval on UI/UX direction
3. Create SQL migration file for schema updates
4. Create component wireframes/designs
5. Begin Phase 1 implementation
6. Set up regular demo/review cadence

---

## Appendix A: Database Tables Overview

```
groups
├── id (PK)
├── name
├── access_code (unique)
└── created_by → users(id)

users
├── id (PK)
├── role ('admin' | 'user')
└── group_id → groups(id)

training_plans
├── id (PK)
├── user_id → users(id)
├── name
├── description
├── status ('draft' | 'published' | 'archived') [NEW]
├── is_active
└── start_date

plan_weeks
├── id (PK)
├── plan_id → training_plans(id)
├── name
└── position

plan_days
├── id (PK)
├── plan_id → training_plans(id)
├── week_id → plan_weeks(id)
├── name
└── position

plan_blocks
├── id (PK)
├── plan_id → training_plans(id)
├── day_id → plan_days(id)
├── name
├── letter
└── position

plan_exercises
├── id (PK)
├── plan_id → training_plans(id)
├── block_id → plan_blocks(id)
├── name
├── type
├── sets/reps/weight/rest
└── position

plan_assignments
├── id (PK)
├── plan_id → training_plans(id)
├── user_id → users(id)
└── assigned_by → users(id)

workout_sessions
├── id (PK)
├── user_id → users(id)
├── plan_id → training_plans(id)
├── plan_day_id → plan_days(id)
├── started_at
├── ended_at
├── total_seconds
└── status ('in_progress' | 'completed' | 'aborted')

session_exercises
├── id (PK)
├── session_id → workout_sessions(id)
├── plan_exercise_id → plan_exercises(id)
├── name
├── type
├── target_* (sets, reps, weight, etc.)
└── order_index

set_logs
├── id (PK)
├── session_exercise_id → session_exercises(id)
├── set_index
├── target_* (reps, weight, etc.)
├── actual_* (reps, weight, etc.)
├── rest_seconds_actual
└── completed_at
```

---

## Appendix B: File Structure

```
mobile/
├── screens/
│   ├── BodyScreen.tsx (update with tabs)
│   └── WorkoutActiveScreen.tsx (new)
├── components/
│   ├── workout/
│   │   ├── WorkoutLibraryCard.tsx
│   │   ├── WorkoutBuilder.tsx
│   │   ├── ExerciseEditor.tsx
│   │   ├── MembersList.tsx
│   │   ├── AssignWorkoutModal.tsx
│   │   ├── WorkoutPreviewModal.tsx
│   │   ├── ActiveExerciseCard.tsx
│   │   ├── LogSetModal.tsx
│   │   ├── RestTimer.tsx
│   │   └── WorkoutCompleteModal.tsx
│   └── ...
├── lib/
│   ├── workout-templates.ts (new)
│   ├── workout-assignments.ts (new)
│   ├── active-workout-context.tsx (new)
│   └── ...
└── docs/
    ├── workout-creator-implementation-plan.md (this file)
    └── workout-schema-migration.sql (to be created)
```

---

**Document Version**: 1.0  
**Last Updated**: October 8, 2025  
**Status**: Awaiting Approval

