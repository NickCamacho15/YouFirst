# Hevy/Strong-Style Workout Implementation Plan

**Date:** October 9, 2025  
**Goal:** Implement a simplified, mobile-first workout creation and execution system inspired by Hevy and Strong apps

---

## 📱 Analysis of Reference Images

### What the Images Show

#### 1. **Template Creation Flow** (Images 1-6)
- **Image 1:** Empty template with "Add Exercises" button
- **Image 2:** Exercise library modal with:
  - Search bar
  - Filter buttons (Body Part, Category)
  - Alphabetical scroll with section headers (A, B, C...)
  - Exercise cards showing: Icon/thumbnail, Name, Category (e.g., "Core", "Cardio", "Shoulders")
  - Info button (?) for each exercise
  - Quick index (A-Z) on right side
- **Image 3-4:** Multi-select mode with checkmarks and "Add (2)" counter
- **Image 5:** Exercise added to template with:
  - Exercise name (clickable/editable)
  - Set configuration table (Set | Previous | lbs | Reps)
  - 2:00 rest timer per set
  - "+ Add Set" button
- **Image 6:** Multiple sets displayed, showing timed rest between sets
- **Image 7:** Different exercise type (Running) with different metrics (mile, Time instead of lbs, Reps)

#### 2. **Template Library** (Image 8)
- Workout template card showing:
  - Template name: "Strong 5x5 - Workout B"
  - Exercise list with set counts: "5 x Squat (Barbell)", "5 x Overhead Press (Barbell)"
  - "Start Workout" button

#### 3. **Active Workout Session** (Image 9)
- Header: Workout name, Date, Timer (0:03 elapsed)
- Exercise list with expandable sets:
  - Set | Previous | lbs | Reps | ✓ (checkmark)
  - All sets visible at once
  - Checkmarks to mark sets complete
- Green "Finish" button at top
- Power button to exit

### Key Design Patterns Identified

1. **Simplified Structure:** Template → Exercises (no weeks/days/blocks complexity)
2. **Rich Exercise Library:** Pre-populated with common exercises, searchable, categorized
3. **Exercise-Specific Metrics:** Different tracking for Lifting (sets/reps/weight), Cardio (time/distance), etc.
4. **Real-Time Tracking:** Live timer, immediate set completion marking
5. **Visual Clarity:** Large touch targets, clear typography, status indicators
6. **Progressive Disclosure:** Start simple (template name), add exercises, configure sets

---

## 🎯 Implementation Strategy

### Approach: **Simplified Parallel System**

Rather than rewriting the existing complex workout system (weeks/days/blocks), we'll create a **simplified parallel system** for the Hevy-style experience:

1. **Keep existing structure** for advanced users/future features
2. **Add new simplified paths** that bypass weeks/days/blocks
3. **Use same database tables** but with different workflows
4. **Allow both systems to coexist** initially

---

## 🗄️ Database Changes Required

### 1. Exercise Library Table (NEW)

```sql
-- Shared exercise library for the group
create table if not exists public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  
  -- Categorization
  category text not null check (category in (
    'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 
    'Core', 'Cardio', 'Full Body', 'Other'
  )),
  body_part text, -- e.g., 'Chest', 'Biceps', 'Quadriceps'
  equipment text[], -- e.g., ['Barbell', 'Bench']
  
  -- Exercise type determines what metrics to track
  exercise_type text not null check (exercise_type in ('Lifting', 'Cardio', 'METCON', 'Bodyweight', 'Timed')),
  
  -- Default values for when adding to template
  default_sets int default 3,
  default_reps int default 10,
  default_rest_seconds int default 120, -- 2:00 rest
  
  -- Media
  thumbnail_url text,
  video_url text,
  instructions text,
  
  -- Metadata
  is_custom boolean not null default false,
  created_by uuid references public.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists exercise_library_category_idx on public.exercise_library(category);
create index if not exists exercise_library_name_idx on public.exercise_library(name);
create index if not exists exercise_library_group_idx on public.exercise_library(group_id);

alter table public.exercise_library enable row level security;

-- Everyone in the group can read standard + custom exercises
create policy exercise_library_select on public.exercise_library
  for select to authenticated using (
    is_custom = false or 
    group_id = (select group_id from public.users where id = auth.uid())
  );

-- Only creators can edit their custom exercises
create policy exercise_library_cud_own on public.exercise_library
  for all to authenticated 
  using (created_by = auth.uid()) 
  with check (created_by = auth.uid());
```

### 2. Template Exercises Table (SIMPLIFIED)

We'll use the existing `plan_exercises` table but add a direct link to templates without requiring blocks:

```sql
-- Add optional exercise_library reference
alter table public.plan_exercises
  add column if not exists exercise_library_id uuid references public.exercise_library(id) on delete set null,
  add column if not exists notes text; -- Exercise-specific notes

-- Allow block_id to be nullable for simplified templates
alter table public.plan_exercises
  alter column block_id drop not null;

-- Create index for simplified template queries
create index if not exists plan_exercises_plan_simple_idx 
  on public.plan_exercises(plan_id, position) 
  where block_id is null;
```

### 3. Seed Standard Exercise Library

```sql
-- Insert common exercises (sample - full list would be ~100-200 exercises)
insert into public.exercise_library (name, category, body_part, equipment, exercise_type, default_sets, default_reps, default_rest_seconds, is_custom)
values
  -- Chest
  ('Bench Press (Barbell)', 'Chest', 'Chest', ARRAY['Barbell', 'Bench'], 'Lifting', 3, 5, 180, false),
  ('Bench Press (Dumbbell)', 'Chest', 'Chest', ARRAY['Dumbbell', 'Bench'], 'Lifting', 3, 8, 120, false),
  ('Incline Bench Press', 'Chest', 'Upper Chest', ARRAY['Barbell', 'Bench'], 'Lifting', 3, 8, 150, false),
  ('Push-Ups', 'Chest', 'Chest', ARRAY[], 'Bodyweight', 3, 15, 60, false),
  
  -- Back
  ('Deadlift (Barbell)', 'Back', 'Back', ARRAY['Barbell'], 'Lifting', 3, 5, 180, false),
  ('Pull-Up', 'Back', 'Lats', ARRAY['Pull-up Bar'], 'Bodyweight', 3, 8, 120, false),
  ('Bent Over Row (Barbell)', 'Back', 'Back', ARRAY['Barbell'], 'Lifting', 3, 8, 120, false),
  ('Lat Pulldown (Cable)', 'Back', 'Lats', ARRAY['Cable Machine'], 'Lifting', 3, 10, 90, false),
  
  -- Legs
  ('Squat (Barbell)', 'Legs', 'Quadriceps', ARRAY['Barbell', 'Squat Rack'], 'Lifting', 3, 5, 180, false),
  ('Leg Press (Machine)', 'Legs', 'Quadriceps', ARRAY['Leg Press Machine'], 'Lifting', 3, 10, 120, false),
  ('Romanian Deadlift (Barbell)', 'Legs', 'Hamstrings', ARRAY['Barbell'], 'Lifting', 3, 8, 120, false),
  ('Leg Curl (Machine)', 'Legs', 'Hamstrings', ARRAY['Machine'], 'Lifting', 3, 12, 90, false),
  ('Calf Raise (Machine)', 'Legs', 'Calves', ARRAY['Machine'], 'Lifting', 3, 15, 60, false),
  
  -- Shoulders
  ('Overhead Press (Barbell)', 'Shoulders', 'Shoulders', ARRAY['Barbell'], 'Lifting', 3, 5, 150, false),
  ('Overhead Press (Dumbbell)', 'Shoulders', 'Shoulders', ARRAY['Dumbbell'], 'Lifting', 3, 8, 120, false),
  ('Lateral Raise (Dumbbell)', 'Shoulders', 'Side Delts', ARRAY['Dumbbell'], 'Lifting', 3, 12, 60, false),
  ('Arnold Press (Dumbbell)', 'Shoulders', 'Shoulders', ARRAY['Dumbbell'], 'Lifting', 3, 10, 90, false),
  
  -- Arms
  ('Bicep Curl (Barbell)', 'Arms', 'Biceps', ARRAY['Barbell'], 'Lifting', 3, 10, 90, false),
  ('Bicep Curl (Dumbbell)', 'Arms', 'Biceps', ARRAY['Dumbbell'], 'Lifting', 3, 10, 90, false),
  ('Hammer Curl (Dumbbell)', 'Arms', 'Biceps', ARRAY['Dumbbell'], 'Lifting', 3, 12, 60, false),
  ('Tricep Extension (Cable)', 'Arms', 'Triceps', ARRAY['Cable Machine'], 'Lifting', 3, 12, 60, false),
  ('Tricep Dip', 'Arms', 'Triceps', ARRAY['Dip Bar'], 'Bodyweight', 3, 10, 90, false),
  
  -- Core
  ('Plank', 'Core', 'Core', ARRAY[], 'Timed', 3, 1, 60, false),
  ('Crunch', 'Core', 'Abs', ARRAY[], 'Bodyweight', 3, 20, 60, false),
  ('Russian Twist', 'Core', 'Obliques', ARRAY[], 'Bodyweight', 3, 30, 60, false),
  ('Ab Wheel', 'Core', 'Core', ARRAY['Ab Wheel'], 'Bodyweight', 3, 10, 90, false),
  
  -- Cardio
  ('Running', 'Cardio', 'Full Body', ARRAY['Treadmill'], 'Cardio', 1, 1, 0, false),
  ('Cycling', 'Cardio', 'Legs', ARRAY['Bike'], 'Cardio', 1, 1, 0, false),
  ('Rowing (Machine)', 'Cardio', 'Full Body', ARRAY['Rowing Machine'], 'Cardio', 1, 1, 0, false),
  ('Jump Rope', 'Cardio', 'Full Body', ARRAY['Jump Rope'], 'Cardio', 3, 1, 60, false),
  
  -- Full Body
  ('Burpees', 'Full Body', 'Full Body', ARRAY[], 'Bodyweight', 3, 15, 90, false),
  ('Kettlebell Swing', 'Full Body', 'Full Body', ARRAY['Kettlebell'], 'Lifting', 3, 15, 90, false)
on conflict do nothing;
```

---

## 🎨 Component Architecture

### Admin Workout Builder Components

```
BodyScreen (Admin)
├── WorkoutTemplatesList
│   └── WorkoutTemplateCard
│       ├── Edit button → opens EnhancedWorkoutBuilderModal
│       ├── Assign button → opens WorkoutAssignmentModal (existing)
│       ├── Publish/Unpublish
│       └── Delete
│
└── EnhancedWorkoutBuilderModal (NEW - replaces current WorkoutBuilderModal)
    ├── Header (template name, Save button)
    ├── TemplateBasicInfo (name, description)
    ├── TemplateExercisesList
    │   └── TemplateExerciseCard (for each exercise)
    │       ├── Exercise name & icon
    │       ├── Set configuration (sets × reps @ weight, rest time)
    │       ├── Reorder handle (drag)
    │       ├── Edit button → opens ExerciseConfigModal
    │       └── Remove button
    └── AddExercisesButton → opens ExerciseLibraryModal
```

### New Components Needed

#### 1. **ExerciseLibraryModal** (Core Component)
```tsx
// mobile/components/workout/ExerciseLibraryModal.tsx

interface ExerciseLibraryModalProps {
  visible: boolean
  onClose: () => void
  onSelectExercises: (exercises: ExerciseLibraryItem[]) => void
  allowMultiSelect?: boolean
}

// Features:
// - Search bar
// - Category filter (Any, Chest, Back, Legs, etc.)
// - Body part filter
// - Alphabetical section list
// - Quick scroll index (A-Z)
// - Multi-select with counter
// - Exercise info modal (?)
```

#### 2. **ExerciseConfigModal**
```tsx
// mobile/components/workout/ExerciseConfigModal.tsx

interface ExerciseConfigModalProps {
  visible: boolean
  exercise: TemplateExercise
  onSave: (config: ExerciseConfig) => void
  onClose: () => void
}

// Different config UI based on exercise type:
// - Lifting: sets, reps, weight, rest
// - Cardio: time, distance
// - Timed: duration
// - Bodyweight: sets, reps, rest
```

#### 3. **EnhancedWorkoutBuilderModal**
```tsx
// mobile/components/workout/EnhancedWorkoutBuilderModal.tsx

interface EnhancedWorkoutBuilderModalProps {
  visible: boolean
  onClose: () => void
  templateId?: string // for editing existing
  mode: 'create' | 'edit'
}

// Full-screen modal with:
// - Template name input
// - Description input
// - Exercise list (drag-reorder)
// - Add exercises button
// - Save button
```

#### 4. **ActiveWorkoutScreen**
```tsx
// mobile/components/workout/ActiveWorkoutScreen.tsx

interface ActiveWorkoutScreenProps {
  session: WorkoutSession
  onFinish: () => void
  onCancel: () => void
}

// Features:
// - Live timer at top
// - Exercise list
// - Set checkboxes
// - Previous performance display
// - Rest timer between sets
// - Finish/Cancel buttons
```

#### 5. **TemplateExerciseCard**
```tsx
// mobile/components/workout/TemplateExerciseCard.tsx

// Displays exercise in template builder:
// - Exercise name with icon
// - "3 sets × 10 reps @ 135 lbs · 2:00 rest"
// - Edit/Remove buttons
// - Drag handle for reordering
```

#### 6. **UserWorkoutsList**
```tsx
// mobile/components/workout/UserWorkoutsList.tsx

// For regular users to view assigned workouts:
// - List of assigned/published templates
// - "Start Workout" button
// - Workout history
```

---

## 📊 Data Flow

### Admin Creates Template Flow

```
1. Admin clicks "+ Template" 
   → Opens EnhancedWorkoutBuilderModal
   
2. Enters template name/description
   → Creates draft training_plan (status='draft')
   
3. Clicks "Add Exercises"
   → Opens ExerciseLibraryModal
   → Fetches from exercise_library table
   
4. Selects exercises (e.g., "Bench Press", "Squat")
   → Returns selected exercises
   
5. Exercises added to template
   → Creates plan_exercises rows with:
      - exercise_library_id (link to library)
      - block_id = NULL (simplified mode)
      - default sets/reps from library
      - position for ordering
   
6. Admin configures each exercise
   → Opens ExerciseConfigModal
   → Updates plan_exercises row
   
7. Admin clicks "Save"
   → Template saved as draft
   
8. Admin clicks "Publish"
   → Updates status = 'published'
   → Now visible to assigned users
```

### User Completes Workout Flow

```
1. User opens Workouts tab
   → Fetches assigned published templates via plan_assignments
   
2. User clicks "Start Workout" on template
   → Fetches template exercises
   → Creates workout_session (status='in_progress')
   → Creates session_exercises (snapshot of targets)
   → Starts timer
   
3. User completes sets
   → Checks off sets
   → Creates/updates set_logs rows
   → Auto-starts rest timer
   
4. User finishes workout
   → Updates workout_session (status='completed', ended_at, total_seconds)
   → Marks session_exercises as completed
   → Returns to workout list
```

---

## 🎨 UI/UX Specifications

### Color Scheme (Match Your App)

Based on your app's existing theme:
- **Primary:** `#4A90E2` (blue)
- **Success:** `#10B981` (green)
- **Danger:** `#EF4444` (red)
- **Warning:** `#F59E0B` (amber)
- **Background:** `#F8F9FA` (light gray)
- **Card:** `#FFFFFF`
- **Border:** `#E0E0E0`
- **Text Primary:** `#333333`
- **Text Secondary:** `#666666`

### Typography

```tsx
// Exercise names
fontSize: 16,
fontWeight: '600',
color: '#333'

// Set configuration
fontSize: 14,
color: '#666'

// Category labels
fontSize: 12,
color: '#999'
textTransform: 'uppercase'
```

### Component Styling

```tsx
// Exercise Library Modal
- Full screen modal
- Search bar: rounded, light background
- Filter chips: pill-shaped, toggleable
- Exercise cards: 
  - 60px thumbnail/icon
  - Name + category
  - Right-aligned info button
  - Touch ripple effect
- Quick index: Fixed right side, A-Z letters

// Template Builder
- Sticky header with Save button
- Drag handles: 3 horizontal lines icon
- Exercise cards: 
  - Rounded corners
  - Light shadow
  - Edit/Remove in top-right
- "Add Exercises" button: Large, primary color, bottom of list

// Active Workout
- Timer: Large, top-center, bold
- Exercise sections: Collapsible
- Set rows: Table layout with checkboxes
- Rest timer: Countdown between sets
- Finish button: Green, full-width, sticky bottom
```

---

## 🔧 Implementation Phases

### Phase 1: Exercise Library (Week 1)
**Goal:** Build the exercise library system

**Tasks:**
1. ✅ Create database migration for `exercise_library` table
2. ✅ Seed standard exercises
3. ✅ Create `ExerciseLibraryModal` component
   - Search functionality
   - Category filtering
   - Alphabetical sections
   - Multi-select
4. ✅ Create library service functions (`mobile/lib/exercise-library.ts`)
5. ✅ Test exercise library modal standalone

**Deliverable:** Working exercise picker modal with 30+ standard exercises

---

### Phase 2: Enhanced Template Builder (Week 2)
**Goal:** Simplified template creation for admins

**Tasks:**
1. ✅ Create `EnhancedWorkoutBuilderModal` component
2. ✅ Create `TemplateExerciseCard` component
3. ✅ Create `ExerciseConfigModal` component
4. ✅ Implement drag-to-reorder exercises
5. ✅ Update `workout-templates.ts` service for simplified templates
6. ✅ Integrate exercise library modal
7. ✅ Save templates with exercises (block_id = NULL)
8. ✅ Test full template creation flow

**Deliverable:** Admins can create templates with exercises in Hevy-style UI

---

### Phase 3: User Workout Execution (Week 3)
**Goal:** Users can start and complete workouts

**Tasks:**
1. ✅ Create `UserWorkoutsList` component
2. ✅ Create `ActiveWorkoutScreen` component
3. ✅ Implement live timer
4. ✅ Implement set completion checkboxes
5. ✅ Add rest timer between sets
6. ✅ Save set logs to database
7. ✅ Handle workout completion
8. ✅ Show workout history
9. ✅ Test full user workout flow

**Deliverable:** Users can execute assigned workouts with full tracking

---

### Phase 4: Polish & Additional Features (Week 4)
**Goal:** Add finishing touches and nice-to-haves

**Tasks:**
1. ✅ Add exercise instructions/video support
2. ✅ Add "previous performance" display during workout
3. ✅ Add workout stats dashboard
4. ✅ Add custom exercise creation
5. ✅ Add template duplication
6. ✅ Add workout notes
7. ✅ Optimize performance (caching, lazy loading)
8. ✅ User testing and feedback
9. ✅ Bug fixes and refinements

**Deliverable:** Production-ready workout system

---

## 📁 File Structure

```
mobile/
├── components/
│   └── workout/
│       ├── ExerciseLibraryModal.tsx (NEW)
│       ├── ExerciseConfigModal.tsx (NEW)
│       ├── EnhancedWorkoutBuilderModal.tsx (NEW)
│       ├── TemplateExerciseCard.tsx (NEW)
│       ├── UserWorkoutsList.tsx (NEW)
│       ├── ActiveWorkoutScreen.tsx (NEW)
│       ├── SetLogRow.tsx (NEW)
│       ├── RestTimer.tsx (NEW)
│       ├── ExerciseInfoModal.tsx (NEW)
│       ├── WorkoutTemplateCard.tsx (existing, enhance)
│       ├── WorkoutAssignmentModal.tsx (existing, keep)
│       └── ... (other existing components)
│
├── lib/
│   ├── exercise-library.ts (NEW)
│   ├── workout-templates.ts (existing, enhance)
│   ├── workout-sessions.ts (NEW - or rename workout.ts)
│   └── workout.ts (existing)
│
├── screens/
│   └── BodyScreen.tsx (existing, enhance)
│
└── types/
    └── workout.ts (NEW - shared types)
```

---

## 🧪 Testing Strategy

### Unit Tests
- Exercise library search/filter
- Set log calculations
- Rest timer logic
- Template validation

### Integration Tests
- Template creation end-to-end
- Workout execution end-to-end
- Assignment flow
- Data persistence

### User Acceptance Testing
1. **Admin Flow:**
   - Create a template with 5 exercises
   - Configure sets/reps/weight
   - Publish template
   - Assign to 3 users

2. **User Flow:**
   - View assigned workouts
   - Start a workout
   - Complete all sets
   - Finish workout
   - View history

---

## 🚀 Migration from Old System

### Coexistence Strategy

The new simplified system will coexist with the existing week/day/block system:

1. **Simplified templates:** `block_id = NULL` in `plan_exercises`
2. **Complex templates:** Use full hierarchy with blocks
3. **UI Detection:**
   ```tsx
   const isSimplified = template.exercises.every(e => e.block_id === null)
   
   if (isSimplified) {
     return <EnhancedWorkoutBuilderModal />
   } else {
     return <ComplexWorkoutBuilderModal />
   }
   ```

### Future Consolidation

Once new system is stable:
1. Add migration tool to convert complex → simple
2. Deprecate complex builder UI (keep data structure)
3. Phase out week/day/block UI components
4. Keep database structure for backwards compatibility

---

## 📝 Success Metrics

### Phase 1 Success Criteria
- ✅ Exercise library loads < 500ms
- ✅ Search returns results < 100ms
- ✅ Can select and add 10 exercises in < 30 seconds

### Phase 2 Success Criteria
- ✅ Template creation < 2 minutes for 5-exercise workout
- ✅ Drag-reorder works smoothly (60fps)
- ✅ Auto-save prevents data loss

### Phase 3 Success Criteria
- ✅ Workout starts < 1 second
- ✅ Set completion feels immediate (< 100ms UI update)
- ✅ No workout data loss if app backgrounded

### Phase 4 Success Criteria
- ✅ 90%+ feature parity with reference apps (Hevy/Strong)
- ✅ Users rate UX 4+/5
- ✅ No critical bugs in production

---

## 🎯 Key Decisions

### 1. Exercise Library Source
**Decision:** Build custom library seeded with ~100 common exercises
**Rationale:** 
- Full control over data structure
- No API dependencies
- Can customize per user needs
- Users can add custom exercises

**Alternative:** Integrate with ExerciseDB API (if needed later)

### 2. Template Structure
**Decision:** Simplify to Template → Exercises (skip weeks/days/blocks for new templates)
**Rationale:**
- Matches reference app UX
- Easier for users to understand
- Faster template creation
- Can add complexity later if needed

**Alternative:** Use full hierarchy (rejected - too complex for MVP)

### 3. Workout Session Model
**Decision:** Keep existing `workout_sessions` → `session_exercises` → `set_logs` structure
**Rationale:**
- Already implemented
- Supports all tracking needs
- Good data model for analytics
- RLS policies working

---

## 📚 Resources & References

### Design Inspiration
- **Hevy:** Focus on simplicity, great exercise library
- **Strong:** Clean set tracking, good timer UI
- **Jefit:** Exercise database and instructions

### Technical Stack
- **React Native** for mobile components
- **Supabase** for backend (existing)
- **PostgreSQL** for data storage (existing)
- **TypeScript** for type safety (existing)

### External Assets Needed
- Exercise thumbnail images (can use placeholders initially)
- Exercise instruction videos (optional, can link to YouTube)

---

## 🔐 Security Considerations

1. **Exercise Library:**
   - Standard exercises visible to all
   - Custom exercises only visible within group
   - RLS policies enforced

2. **Templates:**
   - Draft templates only visible to creator
   - Published templates only visible to assigned users
   - Admin-only edit permissions

3. **Workout Sessions:**
   - Users can only see their own sessions
   - No cross-user data leakage
   - Proper foreign key relationships

---

## 📞 Open Questions for User

1. **Exercise Thumbnails:** Use icon font (free) or real images (need to source)?
2. **Video Instructions:** Required for MVP or Phase 2?
3. **Rest Timer:** Auto-start between sets or manual?
4. **Weight Units:** Support both lbs and kg?
5. **Workout Notes:** Allow users to add notes during workout?
6. **Supersets:** Need superset support in MVP? (pairs exercises with minimal rest)
7. **Progressive Overload:** Auto-suggest weight increases based on history?

---

## ✅ Next Steps

1. **Review this plan** with stakeholders
2. **Get approvals** on design direction
3. **Create database migration file**
4. **Begin Phase 1 implementation** (Exercise Library)
5. **Set up weekly demo schedule**

---

**Document Version:** 1.0  
**Last Updated:** October 9, 2025  
**Status:** PENDING APPROVAL

