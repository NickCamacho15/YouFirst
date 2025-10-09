# Implementation Flow Diagram

**Visual guide to the Hevy-style workout system**

---

## 🎨 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      HABIT TRACKER APP                           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     BODY SCREEN                          │   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │   │
│  │  │   Profile   │  │  Workouts   │  │  (Admin)     │   │   │
│  │  │   Tab       │  │   Tab       │  │   Tab        │   │   │
│  │  └─────────────┘  └─────────────┘  └──────────────┘   │   │
│  │         │                │                  │           │   │
│  └─────────┼────────────────┼──────────────────┼───────────┘   │
│            │                │                  │               │
│            ▼                ▼                  ▼               │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   Personal      │  │  User        │  │  Admin           │ │
│  │   Records       │  │  Workouts    │  │  Template        │ │
│  │   Body Metrics  │  │  List        │  │  Management      │ │
│  └─────────────────┘  └──────────────┘  └──────────────────┘ │
│                              │                    │            │
└──────────────────────────────┼────────────────────┼────────────┘
                               │                    │
                               │                    │
          ┌────────────────────┴──────────┐         │
          │                               │         │
          ▼                               ▼         ▼
┌─────────────────┐         ┌─────────────────────────────────┐
│ START WORKOUT   │         │   TEMPLATE BUILDER              │
│ (User Action)   │         │   (Admin Action)                │
└─────────────────┘         └─────────────────────────────────┘
          │                               │
          │                               │
          ▼                               ▼
┌─────────────────────────────┐  ┌──────────────────────────────┐
│  ACTIVE WORKOUT SCREEN      │  │  EXERCISE LIBRARY MODAL       │
│                             │  │                               │
│  - Live Timer               │  │  - Search Bar                 │
│  - Exercise List            │  │  - Category Filters           │
│  - Set Checkboxes           │  │  - Exercise Cards             │
│  - Rest Timer               │  │  - Multi-Select               │
│  - Finish Button            │  │  - Quick Index (A-Z)          │
└─────────────────────────────┘  └──────────────────────────────┘
          │                               │
          ▼                               ▼
┌─────────────────────────────┐  ┌──────────────────────────────┐
│  WORKOUT COMPLETE           │  │  EXERCISES ADDED TO TEMPLATE │
│  - Save to History          │  │  - Configure Sets/Reps       │
│  - Update Stats             │  │  - Set Rest Time             │
│  - Mark as Win              │  │  - Reorder (Drag & Drop)     │
└─────────────────────────────┘  └──────────────────────────────┘
```

---

## 🔄 Admin Workout Creation Flow

```
START (Admin opens Body Screen)
  │
  ▼
┌────────────────────────────────┐
│  Workouts Tab (Admin View)     │
│  - List of Templates           │
│  - [+ Template] Button         │
└────────────────────────────────┘
  │
  │ Click "+ Template"
  ▼
┌────────────────────────────────┐
│  EnhancedWorkoutBuilderModal   │
│  ┌──────────────────────────┐  │
│  │ Template Name Input      │  │
│  │ "Strong 5x5 - Workout A" │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ [Add Exercises] Button   │◀─┼─── Initially Empty
│  └──────────────────────────┘  │
└────────────────────────────────┘
  │
  │ Click "Add Exercises"
  ▼
┌────────────────────────────────────────────────────┐
│  ExerciseLibraryModal (FULL SCREEN)                │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🔍 Search: "squat"                           │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ [All] [Chest] [Back] [Legs*] [Arms] [Core]  │◀─┼─ Filters
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ ─ S ─────────────────────────────────────    │  │
│  │ ✓ Squat (Barbell)            Legs        🛈  │◀─┼─ Selected
│  │ □ Squat (Dumbbell)            Legs        🛈  │  │
│  │ ✓ Squat (Smith Machine)       Legs        🛈  │◀─┼─ Selected
│  │ ─ F ─────────────────────────────────────    │  │
│  │ □ Front Squat                 Legs        🛈  │  │
│  └──────────────────────────────────────────────┘  │
│  [X] Close              [Add (2)] ◀────────────────┼─ Counter
└────────────────────────────────────────────────────┘
  │
  │ Click "Add (2)"
  ▼
┌────────────────────────────────────────────────────┐
│  EnhancedWorkoutBuilderModal (Back)                │
│  ┌──────────────────────────────────────────────┐  │
│  │ Strong 5x5 - Workout A         ⋮             │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🏋 Squat (Barbell)                           │  │
│  │ Legs                                         │  │
│  │ 5 sets × 5 reps @ 225 lbs · 3:00 rest       │◀─┼─ From defaults
│  │                            [Edit] [Remove]   │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🏋 Squat (Smith Machine)                     │  │
│  │ Legs                                         │  │
│  │ 3 sets × 10 reps @ 135 lbs · 2:00 rest      │  │
│  │                            [Edit] [Remove]   │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │          [+ Add Exercises]                   │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
  │
  │ Click "Edit" on first exercise
  ▼
┌────────────────────────────────────────────────────┐
│  ExerciseConfigModal                               │
│  ┌──────────────────────────────────────────────┐  │
│  │ Squat (Barbell)                              │  │
│  └──────────────────────────────────────────────┘  │
│  Sets:              [5]  ⊖ ⊕                      │
│  Reps per Set:      [5]  ⊖ ⊕                      │
│  Weight (lbs):      [225] ⊖ ⊕                     │
│  Rest Between Sets:                               │
│  [1:00] [1:30] [2:00] [2:30] [3:00*] [Custom]    │◀─┼─ Chips
│  Notes (Optional):                                │
│  ┌──────────────────────────────────────────────┐  │
│  │ Focus on depth and form                      │  │
│  └──────────────────────────────────────────────┘  │
│                           [Cancel] [Save]         │
└────────────────────────────────────────────────────┘
  │
  │ Click "Save" (on modal)
  ▼
┌────────────────────────────────────────────────────┐
│  Template Updated                                  │
│  - Exercises saved to plan_exercises table         │
│  - exercise_library_id linked                      │
│  - block_id = NULL (simplified mode)               │
│  - position set for ordering                       │
└────────────────────────────────────────────────────┘
  │
  │ Click "Save" (on builder modal)
  ▼
┌────────────────────────────────────────────────────┐
│  Template Saved as DRAFT                           │
│  - training_plans.status = 'draft'                 │
│  - Visible only to creator                         │
│  - Ready to publish                                │
└────────────────────────────────────────────────────┘
  │
  │ Click "Publish"
  ▼
┌────────────────────────────────────────────────────┐
│  Template PUBLISHED                                │
│  - training_plans.status = 'published'             │
│  - Now available for assignment                    │
│  - Users can see if assigned                       │
└────────────────────────────────────────────────────┘
  │
  │ Click "Assign"
  ▼
┌────────────────────────────────────────────────────┐
│  WorkoutAssignmentModal (3-step wizard)            │
│  Step 1: Select Members (✓)                        │
│  Step 2: Choose Schedule (►)                       │
│  Step 3: Review & Confirm                          │
└────────────────────────────────────────────────────┘
  │
  │ Complete assignment
  ▼
┌────────────────────────────────────────────────────┐
│  Assigned to Users                                 │
│  - plan_assignments records created                │
│  - Users notified (optional)                       │
│  - Appears in their Workouts tab                   │
└────────────────────────────────────────────────────┘
  │
  ▼
END (Template ready for user execution)
```

---

## 👤 User Workout Execution Flow

```
START (User opens Body Screen)
  │
  ▼
┌────────────────────────────────┐
│  Workouts Tab (User View)      │
│  - Assigned Workouts List      │
│  - Recent History              │
│  - Stats Widget                │
└────────────────────────────────┘
  │
  │ User sees assigned workout
  ▼
┌────────────────────────────────────────────────────┐
│  Workout Card: "Strong 5x5 - Workout A"            │
│  ┌──────────────────────────────────────────────┐  │
│  │ • Squat (Barbell)                            │  │
│  │ • Bench Press (Barbell)                      │  │
│  │ • Bent Over Row (Barbell)                    │  │
│  ├──────────────────────────────────────────────┤  │
│  │ 🕐 Last: 3 days ago                          │  │
│  ├──────────────────────────────────────────────┤  │
│  │ ┌──────────────────────────────────────────┐ │  │
│  │ │      ▶️  START WORKOUT                    │◀┼──┼─ Big button!
│  │ └──────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
  │
  │ Click "START WORKOUT"
  ▼
┌────────────────────────────────────────────────────┐
│  Creating Workout Session...                       │
│  1. Create workout_sessions row (status='in_prog') │
│  2. Snapshot exercises → session_exercises         │
│  3. Create set_logs placeholders                   │
│  4. Start timer                                    │
└────────────────────────────────────────────────────┘
  │
  │ Session created
  ▼
┌────────────────────────────────────────────────────┐
│  ACTIVE WORKOUT SCREEN (Full Screen)               │
│  ┌──────────────────────────────────────────────┐  │
│  │ ⏸  Strong 5x5 - Workout A                    │◀─┼─ Header
│  │    Oct 9, 2025                               │  │
│  │    ⏱ 00:00:03 ◀──────────────────────────────┼──┼─ Live timer
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 💪 Squat (Barbell)                           │◀─┼─ First exercise
│  │ Legs                                         │  │
│  │ ┌────────────────────────────────────────┐   │  │
│  │ │ Set │ Prev   │ lbs │ Reps │ ✓       │   │  │
│  │ ├─────┼────────┼─────┼──────┼─────────┤   │  │
│  │ │  1  │ 225×5  │ 225 │  5   │ □      │   │◀─┼─ Tap to complete
│  │ ├─────┼────────┼─────┼──────┼─────────┤   │  │
│  │ │  2  │ 225×5  │ 225 │  5   │ □      │   │  │
│  │ ├─────┼────────┼─────┼──────┼─────────┤   │  │
│  │ │  3  │ 225×5  │ 225 │  5   │ □      │   │  │
│  │ └────────────────────────────────────────┘   │  │
│  │ [+ Add Set]                                  │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 💪 Bench Press (Barbell)                     │  │
│  │ ...                                          │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │         ✓ FINISH WORKOUT                     │◀─┼─ Bottom button
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
  │
  │ User completes Set 1
  ▼
┌────────────────────────────────────────────────────┐
│  Set Completion Flow                               │
│  1. User taps checkbox                             │
│  2. completeSet() API call                         │
│  3. Save to set_logs table                         │
│  4. Update UI (checkbox → checkmark)               │
│  5. Haptic feedback (vibration)                    │
│  6. Start rest timer                               │
└────────────────────────────────────────────────────┘
  │
  │ Rest timer starts
  ▼
┌────────────────────────────────────────────────────┐
│  REST TIMER MODAL (Overlay)                        │
│  ┌──────────────────────────────────────────────┐  │
│  │           🧘 Rest Timer                       │  │
│  │                                              │  │
│  │              02:45 ◀─────────────────────────┼──┼─ Countdown
│  │                                              │  │
│  │  ██████████████████░░░░░░░                   │◀─┼─ Progress bar
│  │                                              │  │
│  │      [Skip Rest]    [Add 30s]                │◀─┼─ Actions
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
  │
  │ Timer complete OR user skips
  ▼
┌────────────────────────────────────────────────────┐
│  Rest Complete                                     │
│  - Sound/haptic feedback                           │
│  - Modal dismisses                                 │
│  - User proceeds to Set 2                          │
└────────────────────────────────────────────────────┘
  │
  │ User completes all sets, all exercises
  ▼
┌────────────────────────────────────────────────────┐
│  All Exercises Complete                            │
│  - All checkmarks filled                           │
│  - "FINISH WORKOUT" button enabled & green         │
└────────────────────────────────────────────────────┘
  │
  │ Click "FINISH WORKOUT"
  ▼
┌────────────────────────────────────────────────────┐
│  Saving Workout...                                 │
│  1. Calculate total_seconds                        │
│  2. Update workout_sessions (status='completed')   │
│  3. Update ended_at timestamp                      │
│  4. Mark exercises as completed                    │
│  5. Invalidate daily wins cache                    │
│  6. Update workout stats                           │
└────────────────────────────────────────────────────┘
  │
  │ Workout saved
  ▼
┌────────────────────────────────────────────────────┐
│  WORKOUT COMPLETE! 🎉                              │
│  ┌──────────────────────────────────────────────┐  │
│  │ Great job!                                   │  │
│  │                                              │  │
│  │ Duration: 52 min                             │  │
│  │ Total Volume: 12,450 lbs                     │  │
│  │ Personal Records: 0                          │  │
│  │                                              │  │
│  │ [View Details] [Close]                       │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
  │
  │ Click "Close"
  ▼
┌────────────────────────────────────────────────────┐
│  Back to Workouts List                             │
│  - Workout appears in history                      │
│  - Stats updated (streak, volume, etc.)            │
│  - "Win" badge added for the day                   │
│  - Next workout ready to start                     │
└────────────────────────────────────────────────────┘
  │
  ▼
END (Workout complete, stats updated)
```

---

## 🗄️ Database Flow

```
EXERCISE LIBRARY
┌────────────────────────────────────────┐
│ exercise_library                       │
│ - Standard exercises (30+)             │
│ - Custom exercises (per group)         │
│ - Search indexed                       │
└────────────────────────────────────────┘
            │
            │ Referenced by
            ▼
TEMPLATE STRUCTURE
┌────────────────────────────────────────┐
│ training_plans                         │
│ - id, name, status, description        │
│ - status: 'draft' | 'published'        │
└────────────────────────────────────────┘
            │
            │ Has many
            ▼
┌────────────────────────────────────────┐
│ plan_exercises                         │
│ - exercise_library_id (link ▲)        │
│ - block_id = NULL (simplified)         │
│ - sets, reps, weight, rest             │
│ - position (for ordering)              │
└────────────────────────────────────────┘
            │
            │ Assigned via
            ▼
┌────────────────────────────────────────┐
│ plan_assignments                       │
│ - plan_id, user_id                     │
│ - schedule info                        │
└────────────────────────────────────────┘
            │
            │ User starts workout
            ▼
WORKOUT EXECUTION
┌────────────────────────────────────────┐
│ workout_sessions                       │
│ - plan_id (reference)                  │
│ - status: 'in_progress' → 'completed'  │
│ - started_at, ended_at                 │
│ - total_seconds                        │
└────────────────────────────────────────┘
            │
            │ Snapshot of
            ▼
┌────────────────────────────────────────┐
│ session_exercises                      │
│ - session_id                           │
│ - plan_exercise_id (reference)         │
│ - target_sets, target_reps, etc.       │
│ - (snapshot at workout start)          │
└────────────────────────────────────────┘
            │
            │ Logged via
            ▼
┌────────────────────────────────────────┐
│ set_logs                               │
│ - session_exercise_id                  │
│ - set_index (1, 2, 3...)               │
│ - target_reps, actual_reps             │
│ - target_weight, actual_weight         │
│ - completed_at                         │
└────────────────────────────────────────┘
```

---

## 🔐 Security & Permissions Flow

```
USER AUTHENTICATION
┌────────────────────────────────────────┐
│ Supabase Auth                          │
│ - auth.uid() provides user_id          │
└────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ users table                            │
│ - id, email, role, group_id            │
│ - role: 'admin' | 'user'               │
└────────────────────────────────────────┘
            │
            ├─────── Is Admin? ────────┐
            │                          │
            ▼ Yes                      ▼ No
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ ADMIN PERMISSIONS           │  │ USER PERMISSIONS            │
├─────────────────────────────┤  ├─────────────────────────────┤
│ ✅ Create templates          │  │ ❌ Create templates          │
│ ✅ Edit templates            │  │ ❌ Edit templates            │
│ ✅ Publish templates         │  │ ❌ Publish templates         │
│ ✅ Assign workouts           │  │ ❌ Assign workouts           │
│ ✅ View all group members    │  │ ❌ View other members        │
│ ✅ Create custom exercises   │  │ ⚠️  Create custom (own)     │
│ ✅ See draft templates       │  │ ❌ See drafts               │
│ ─────────────────────────── │  │ ─────────────────────────── │
│ ✅ Start workouts            │  │ ✅ Start workouts            │
│ ✅ Log sets                  │  │ ✅ Log sets                  │
│ ✅ View history              │  │ ✅ View own history          │
│ ✅ View assigned workouts    │  │ ✅ View assigned workouts    │
└─────────────────────────────┘  └─────────────────────────────┘

ROW-LEVEL SECURITY (RLS) POLICIES
┌────────────────────────────────────────┐
│ exercise_library                       │
│ SELECT: all standard + own group       │
│ INSERT/UPDATE/DELETE: own custom only  │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ training_plans                         │
│ SELECT: own created OR assigned        │
│ INSERT/UPDATE/DELETE: own only         │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ plan_exercises                         │
│ SELECT/MODIFY: via training_plans RLS  │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ workout_sessions                       │
│ SELECT/MODIFY: own sessions only       │
│ user_id = auth.uid()                   │
└────────────────────────────────────────┘
```

---

## 📊 Data Flow Summary

```
1. SEEDING (One-time)
   Standard Exercises → exercise_library (30+ rows)

2. ADMIN CREATES TEMPLATE
   Admin → EnhancedWorkoutBuilderModal
        → ExerciseLibraryModal (select from library)
        → plan_exercises (with exercise_library_id)
        → training_plans (status='draft')
        → Publish (status='published')

3. ADMIN ASSIGNS TEMPLATE
   Admin → WorkoutAssignmentModal
        → Select users
        → Set schedule
        → plan_assignments (links user to plan)

4. USER SEES ASSIGNED WORKOUT
   User → Workouts Tab
       → Query plan_assignments (user_id=auth.uid())
       → JOIN training_plans (status='published')
       → Display WorkoutCard

5. USER STARTS WORKOUT
   User → Click "Start Workout"
       → createSessionFromSnapshot()
       → workout_sessions (status='in_progress')
       → session_exercises (snapshot of plan_exercises)
       → set_logs (placeholders)
       → ActiveWorkoutScreen

6. USER COMPLETES SETS
   User → Tap checkbox
       → completeSet()
       → UPDATE/INSERT set_logs (actual_reps, actual_weight)
       → Start rest timer
       → Repeat for all sets

7. USER FINISHES WORKOUT
   User → Click "Finish"
       → endSession()
       → UPDATE workout_sessions (status='completed')
       → Calculate stats
       → Invalidate cache
       → Show summary

8. DATA PERSISTENCE
   All changes → Supabase PostgreSQL
               → Real-time sync
               → RLS enforced
               → Offline queue (if supported)
```

---

## 🎯 Key Decision Points

```
┌─────────────────────────────────────────────────────┐
│ TEMPLATE TYPE DETECTION                             │
│                                                     │
│ template.exercises.every(e => e.block_id === null)  │
│                    │                                │
│         ┌──────────┴──────────┐                    │
│         ▼                     ▼                     │
│    TRUE (Simplified)     FALSE (Complex)            │
│         │                     │                     │
│         ▼                     ▼                     │
│ EnhancedWorkoutBuilder   ComplexWorkoutBuilder      │
│ (NEW Hevy-style UI)      (Existing UI)             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ EXERCISE CONFIG FIELDS                              │
│                                                     │
│      exercise.type                                  │
│            │                                        │
│     ┌──────┼──────┬──────────┬──────────┐          │
│     ▼      ▼      ▼          ▼          ▼          │
│ Lifting  Cardio  METCON  Bodyweight  Timed         │
│   │        │       │         │          │          │
│   ▼        ▼       ▼         ▼          ▼          │
│ sets     time   time_cap   sets      duration      │
│ reps     distance score    reps      sets          │
│ weight   pace   score_type rest      rest          │
│ rest                                               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ USER ROLE ROUTING                                   │
│                                                     │
│        user.role                                    │
│            │                                        │
│      ┌─────┴─────┐                                 │
│      ▼           ▼                                  │
│   'admin'     'user'                                │
│      │           │                                  │
│      ▼           ▼                                  │
│  Show Admin   Show User                             │
│  Tab with:    Tab with:                             │
│  - Templates  - Assigned                            │
│  - Create     - History                             │
│  - Assign     - Stats                               │
└─────────────────────────────────────────────────────┘
```

---

## 📱 Screen Navigation Map

```
APP ROOT
│
├─ AuthScreen (Login/Register)
│
└─ MainTabs
   ├─ Home
   ├─ Goals
   ├─ Mind
   └─ Body ◀────────────────────────────── We're here!
      │
      ├─ Profile Tab
      │  ├─ Body Metrics
      │  ├─ Personal Records
      │  └─ Progress Charts
      │
      ├─ Workouts Tab (USER)
      │  ├─ Assigned Workouts List
      │  │  └─ WorkoutCard
      │  │     └─ [Start Workout] → ActiveWorkoutScreen
      │  │                              │
      │  │                              ├─ Exercise List
      │  │                              ├─ Set Tracking
      │  │                              ├─ Rest Timer
      │  │                              └─ [Finish] → Summary
      │  │
      │  └─ Workout History
      │     └─ WorkoutHistoryCard
      │        └─ [View Details] → WorkoutDetailScreen
      │
      └─ Admin Tab (ADMIN ONLY)
         ├─ Templates List
         │  └─ WorkoutTemplateCard
         │     ├─ [Edit] → EnhancedWorkoutBuilderModal
         │     │              │
         │     │              ├─ Template Info
         │     │              ├─ Exercise List
         │     │              │  └─ TemplateExerciseCard
         │     │              │     └─ [Edit] → ExerciseConfigModal
         │     │              │
         │     │              └─ [Add Exercises] → ExerciseLibraryModal
         │     │                                      │
         │     │                                      ├─ Search
         │     │                                      ├─ Filters
         │     │                                      └─ Exercise Cards
         │     │
         │     ├─ [Assign] → WorkoutAssignmentModal
         │     │               │
         │     │               ├─ Step 1: Select Members
         │     │               ├─ Step 2: Schedule
         │     │               └─ Step 3: Review
         │     │
         │     ├─ [Publish/Unpublish]
         │     ├─ [Duplicate]
         │     └─ [Delete]
         │
         └─ [+ Template] → EnhancedWorkoutBuilderModal (Create Mode)
```

---

**This diagram shows the complete flow from admin template creation to user workout execution, including all major decision points and data flows.**

**Use this as a reference when implementing each phase!**

