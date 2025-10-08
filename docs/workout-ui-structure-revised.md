# Workout UI Structure - Revised Plan

## Key Changes from Original Plan

Based on your feedback, here are the critical changes:

### 1. Tab Structure Correction

**INCORRECT (Original):**
- Admins had a separate navigation tab

**CORRECT (Revised):**
- Admins have **3 tabs within BodyScreen**: Profile, Workouts, Planning
- Users have **2 tabs within BodyScreen**: Profile, Workouts
- No additional navigation tabs at the bottom

### 2. UI Location

**Planning Tab (Admin Only):**
- Located inside BodyScreen as a 3rd tab
- This is where admins BUILD workout templates
- Create, edit, save drafts, publish workouts
- Assign workouts to group members

**Workouts Tab (Both Admin & Users):**
- Shows assigned/available workouts
- Both admins AND users can START and COMPLETE workouts here
- Logging interface for active workouts
- Workout history

---

## Detailed Tab Breakdown

### Admin View - BodyScreen Tabs

```
┌─────────────────────────────────────┐
│  Profile  │  Workouts  │  Planning  │  <- 3 Tabs
└─────────────────────────────────────┘
```

#### Tab 1: Profile (Admin)
- Body metrics (height, weight, body fat %)
- Personal Records (1RMs)
- Progress charts
- Same as current implementation

#### Tab 2: Workouts (Admin)
- View ALL workouts (own + created for group)
- Start/Complete workouts (Hevy/Strong style UI)
- Active workout logging
- Workout history
- Admins can test their own workouts

#### Tab 3: Planning (Admin Only - NEW)
- Workout template library
- Create new workout templates
- Edit existing templates
- Publish/Unpublish workouts
- Assign workouts to group members
- View member list

---

### User View - BodyScreen Tabs

```
┌─────────────────────────────┐
│  Profile  │  Workouts       │  <- 2 Tabs
└─────────────────────────────┘
```

#### Tab 1: Profile (User)
- Body metrics
- Personal Records
- Progress charts
- Same as current implementation

#### Tab 2: Workouts (User)
- View assigned workouts (published by admin)
- Start/Complete workouts (Hevy/Strong style UI)
- Active workout logging
- Workout history
- Cannot see draft workouts

---

## Database Schema Summary (Current State)

Based on the codebase analysis, here's what exists:

### Training Plan Hierarchy (EXISTS)
```
training_plans
├── id, user_id, name, description, start_date, is_active, created_at
│
├── plan_weeks
│   ├── id, plan_id, user_id, name, position, created_at
│   │
│   └── plan_days
│       ├── id, plan_id, week_id, user_id, name, position, created_at
│       │
│       └── plan_blocks
│           ├── id, plan_id, day_id, user_id, name, letter, position, created_at
│           │
│           └── plan_exercises
│               └── id, plan_id, block_id, user_id, name, type
│                   sets, reps, weight, rest, time, distance, pace
│                   time_cap, score_type, target, position, created_at
```

### Workout Session Tracking (EXISTS)
```
workout_sessions
├── id, user_id, plan_id, plan_day_id, session_date
│   started_at, ended_at, total_seconds, status
│
└── session_exercises
    ├── id, session_id, plan_exercise_id, name, type, order_index
    │   started_at, completed_at
    │   target_* (sets, reps, weight, rest, time, distance, pace, etc.)
    │
    └── set_logs
        └── id, session_exercise_id, set_index
            target_* (reps, weight, time, distance, pace)
            actual_* (reps, weight, time, distance, pace, score)
            rest_seconds_actual, completed_at
```

### Role/Group System (EXISTS)
```
groups
├── id, name, access_code, created_by, created_at

users
├── id, email, display_name, bio, profile_image_url
├── role ('admin' | 'user')  <- EXISTS
├── group_id -> groups(id)   <- EXISTS
└── created_at

plan_assignments
├── id, plan_id, user_id, assigned_by, created_at
└── unique(plan_id, user_id)
```

### What Needs to be Added

**ONLY ONE FIELD:**
```sql
-- Add status column to training_plans
ALTER TABLE public.training_plans
ADD COLUMN IF NOT EXISTS status text 
CHECK (status IN ('draft', 'published', 'archived')) 
DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS training_plans_status_idx 
ON public.training_plans(status);
```

**Update RLS Policy:**
```sql
-- Users should only see PUBLISHED plans assigned to them
DROP POLICY IF EXISTS training_plans_select_assigned ON public.training_plans;
CREATE POLICY training_plans_select_assigned ON public.training_plans
  FOR SELECT TO authenticated USING (
    status = 'published' AND EXISTS (
      SELECT 1 FROM public.plan_assignments pa
      WHERE pa.plan_id = public.training_plans.id
        AND pa.user_id = auth.uid()
    )
  );
```

---

## Implementation Details

### Phase 1: Add Planning Tab for Admins

**File:** `mobile/screens/BodyScreen.tsx`

**Current Structure:**
```typescript
const [activeTab, setActiveTab] = useState("profile")
// Tabs: "profile" | "workouts"
```

**Updated Structure:**
```typescript
const [activeTab, setActiveTab] = useState("profile")
// For admins: "profile" | "workouts" | "planning"
// For users: "profile" | "workouts"

const { user } = useUser()
const isAdmin = user?.role === 'admin'

const tabs = isAdmin 
  ? ["profile", "workouts", "planning"]
  : ["profile", "workouts"]
```

**Tab UI:**
```typescript
<View style={styles.tabContainer}>
  <TouchableOpacity
    style={[styles.tab, activeTab === "profile" && styles.activeTab]}
    onPress={() => setActiveTab("profile")}
  >
    <Text style={[styles.tabText, activeTab === "profile" && styles.activeTabText]}>
      Profile
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.tab, activeTab === "workouts" && styles.activeTab]}
    onPress={() => setActiveTab("workouts")}
  >
    <Text style={[styles.tabText, activeTab === "workouts" && styles.activeTabText]}>
      Workouts
    </Text>
  </TouchableOpacity>

  {isAdmin && (
    <TouchableOpacity
      style={[styles.tab, activeTab === "planning" && styles.activeTab]}
      onPress={() => setActiveTab("planning")}
    >
      <Text style={[styles.tabText, activeTab === "planning" && styles.activeTabText]}>
        Planning
      </Text>
    </TouchableOpacity>
  )}
</View>
```

---

### Planning Tab Content (Admin Only)

```typescript
{activeTab === "planning" && isAdmin && (
  <ScrollView style={styles.planningContainer}>
    {/* Header */}
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Workout Library</Text>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => setWorkoutBuilderOpen(true)}
      >
        <Ionicons name="add-circle" size={24} color="#8B5CF6" />
        <Text style={styles.createButtonText}>Create Workout</Text>
      </TouchableOpacity>
    </View>

    {/* Filter Tabs */}
    <View style={styles.filterTabs}>
      <TouchableOpacity 
        style={[styles.filterTab, planFilter === 'all' && styles.filterTabActive]}
        onPress={() => setPlanFilter('all')}
      >
        <Text>All</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.filterTab, planFilter === 'draft' && styles.filterTabActive]}
        onPress={() => setPlanFilter('draft')}
      >
        <Text>Drafts</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.filterTab, planFilter === 'published' && styles.filterTabActive]}
        onPress={() => setPlanFilter('published')}
      >
        <Text>Published</Text>
      </TouchableOpacity>
    </View>

    {/* Workout Template Cards */}
    {filteredPlans.map(plan => (
      <WorkoutTemplateCard
        key={plan.id}
        plan={plan}
        onEdit={() => editPlan(plan.id)}
        onPublish={() => publishPlan(plan.id)}
        onAssign={() => openAssignModal(plan.id)}
        onDuplicate={() => duplicatePlan(plan.id)}
      />
    ))}

    {/* Group Members Section */}
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Group Members</Text>
      <Text style={styles.sectionSubtitle}>{groupMembers.length} members</Text>
    </View>
    
    {groupMembers.map(member => (
      <MemberCard
        key={member.id}
        member={member}
        onAssignWorkout={() => openAssignModal(null, member.id)}
      />
    ))}
  </ScrollView>
)}
```

---

### Workouts Tab Content (Both Admin & Users)

This is where Hevy/Strong-inspired UI goes:

```typescript
{activeTab === "workouts" && (
  <ScrollView style={styles.workoutsContainer}>
    {/* Show active workout if in progress */}
    {activeWorkout && (
      <ActiveWorkoutBanner 
        workout={activeWorkout}
        onResume={() => navigateToActiveWorkout()}
      />
    )}

    {/* Assigned Workouts */}
    <Text style={styles.sectionTitle}>
      {isAdmin ? 'My Workouts' : 'Assigned Workouts'}
    </Text>
    
    {assignedWorkouts.map(workout => (
      <WorkoutCard
        key={workout.id}
        workout={workout}
        onStart={() => startWorkout(workout.id)}
        onViewDetails={() => viewWorkoutDetails(workout.id)}
        lastCompleted={getLastCompleted(workout.id)}
      />
    ))}

    {/* History */}
    <Text style={styles.sectionTitle}>History</Text>
    {recentWorkouts.map(session => (
      <WorkoutHistoryCard
        key={session.id}
        session={session}
        onView={() => viewSession(session.id)}
      />
    ))}
  </ScrollView>
)}
```

---

### Active Workout Screen (Hevy/Strong Style)

**New File:** `mobile/screens/ActiveWorkoutScreen.tsx`

This screen opens when user taps "START WORKOUT":

```typescript
<SafeAreaView style={styles.container}>
  {/* Header with timer and finish button */}
  <View style={styles.header}>
    <TouchableOpacity onPress={handlePause}>
      <Ionicons name="pause-circle-outline" size={32} />
    </TouchableOpacity>
    <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
    <TouchableOpacity onPress={handleFinish}>
      <Ionicons name="checkmark-circle" size={32} color="#10B981" />
    </TouchableOpacity>
  </View>

  {/* Progress indicator */}
  <View style={styles.progress}>
    <Text style={styles.workoutName}>{workout.name}</Text>
    <Text style={styles.progressText}>
      {completedExercises} of {totalExercises} exercises complete
    </Text>
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${progress}%` }]} />
    </View>
  </View>

  {/* Exercise list */}
  <ScrollView style={styles.exerciseList}>
    {exercises.map((exercise, index) => (
      <ExerciseCard
        key={exercise.id}
        exercise={exercise}
        isActive={currentExerciseIndex === index}
        isCompleted={exercise.completed_at !== null}
        sets={getSetLogs(exercise.id)}
        onLogSet={(setIndex, data) => logSet(exercise.id, setIndex, data)}
        onComplete={() => completeExercise(exercise.id)}
      />
    ))}
  </ScrollView>

  {/* Rest timer overlay (when active) */}
  {restTimerActive && (
    <RestTimerOverlay
      seconds={restSeconds}
      onSkip={skipRest}
      onAddTime={addRestTime}
    />
  )}
</SafeAreaView>
```

---

## Component Structure

```
mobile/
├── screens/
│   ├── BodyScreen.tsx (updated with 3rd tab for admins)
│   └── ActiveWorkoutScreen.tsx (NEW - Hevy/Strong style)
│
├── components/
│   ├── workout/
│   │   ├── WorkoutTemplateCard.tsx (Planning tab - template list)
│   │   ├── WorkoutBuilderModal.tsx (Planning tab - create/edit)
│   │   ├── ExerciseEditorModal.tsx (Planning tab - exercise details)
│   │   ├── MemberCard.tsx (Planning tab - group members)
│   │   ├── AssignWorkoutModal.tsx (Planning tab - assignment)
│   │   ├── WorkoutCard.tsx (Workouts tab - assigned workout)
│   │   ├── ActiveWorkoutBanner.tsx (Workouts tab - resume banner)
│   │   ├── WorkoutHistoryCard.tsx (Workouts tab - history)
│   │   ├── ExerciseCard.tsx (Active screen - exercise + sets)
│   │   ├── SetRow.tsx (Active screen - individual set)
│   │   ├── LogSetModal.tsx (Active screen - log reps/weight)
│   │   ├── RestTimerOverlay.tsx (Active screen - rest countdown)
│   │   └── WorkoutCompleteModal.tsx (Active screen - celebration)
│   └── ...
│
└── lib/
    ├── workout-templates.ts (NEW - CRUD for templates)
    ├── workout-assignments.ts (NEW - assign to users)
    ├── active-workout-state.tsx (NEW - React Context)
    ├── workout.ts (EXISTING - session tracking)
    └── plans.ts (EXISTING - plan CRUD)
```

---

## Next Steps

1. ✅ Understand current schema (done via code analysis)
2. ✅ Clarify UI structure (done - 3 tabs in BodyScreen)
3. [ ] Create SQL migration for `status` column
4. [ ] Update `BodyScreen.tsx` to add 3rd tab for admins
5. [ ] Create Planning tab UI with workout template cards
6. [ ] Create Workout Builder modal (inspired by Hevy/Strong)
7. [ ] Update Workouts tab to show assigned workouts
8. [ ] Create Active Workout Screen (Hevy/Strong logging UI)
9. [ ] Test end-to-end: create → assign → complete

---

**Status:** Ready for implementation
**Priority:** High
**Estimated Time:** 2-3 weeks

