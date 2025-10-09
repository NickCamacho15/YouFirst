# Hevy-Style Workout Implementation - Quick Start Guide

**Date:** October 9, 2025  
**For:** Developers implementing the new workout system  
**Est. Time to Complete Phase 1:** 4-6 hours

---

## 🎯 Phase 1 Goals

By the end of Phase 1, you will have:
- ✅ Exercise library database table created and seeded
- ✅ Exercise library service functions working
- ✅ ExerciseLibraryModal component fully functional
- ✅ Searchable, filterable exercise picker with 30+ exercises

---

## 📋 Prerequisites

Before starting, ensure you have:
- [x] Supabase project set up and connected
- [x] Database access (SQL editor or migration tool)
- [x] React Native dev environment running
- [x] Mobile app compiling successfully
- [x] Access to the codebase

---

## 🚀 Step-by-Step Implementation

### Step 1: Create Exercise Library Database Table (15 min)

#### 1.1 Create SQL Migration File

Create: `docs/create-exercise-library.sql`

```sql
-- ============================================================================
-- CREATE EXERCISE LIBRARY TABLE
-- ============================================================================

-- Main exercise library table
create table if not exists public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  
  -- Basic info
  name text not null,
  description text,
  
  -- Categorization
  category text not null check (category in (
    'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 
    'Core', 'Cardio', 'Full Body', 'Other'
  )),
  body_part text, -- Specific muscle group
  equipment text[], -- Array of equipment needed
  
  -- Exercise type determines tracking metrics
  exercise_type text not null check (exercise_type in (
    'Lifting', 'Cardio', 'METCON', 'Bodyweight', 'Timed'
  )),
  
  -- Default values when adding to template
  default_sets int not null default 3,
  default_reps int not null default 10,
  default_rest_seconds int not null default 120,
  
  -- Media (optional for MVP)
  thumbnail_url text,
  video_url text,
  instructions text,
  
  -- Metadata
  is_custom boolean not null default false,
  created_by uuid references public.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Create indexes for fast search
create index if not exists exercise_library_category_idx 
  on public.exercise_library(category);

create index if not exists exercise_library_name_idx 
  on public.exercise_library(name);

create index if not exists exercise_library_group_idx 
  on public.exercise_library(group_id);

-- Full-text search index
create index if not exists exercise_library_search_idx 
  on public.exercise_library 
  using gin (to_tsvector('english', name || ' ' || coalesce(description, '')));

-- Enable RLS
alter table public.exercise_library enable row level security;

-- RLS Policies
-- Everyone can read standard exercises + custom exercises in their group
drop policy if exists exercise_library_select on public.exercise_library;
create policy exercise_library_select on public.exercise_library
  for select to authenticated using (
    is_custom = false or 
    group_id = (select group_id from public.users where id = auth.uid())
  );

-- Only creators can modify their custom exercises
drop policy if exists exercise_library_cud_own on public.exercise_library;
create policy exercise_library_cud_own on public.exercise_library
  for all to authenticated 
  using (created_by = auth.uid()) 
  with check (created_by = auth.uid());

-- ============================================================================
-- ENHANCE PLAN_EXERCISES TABLE
-- ============================================================================

-- Add reference to exercise library
alter table public.plan_exercises
  add column if not exists exercise_library_id uuid 
    references public.exercise_library(id) on delete set null;

-- Add notes field
alter table public.plan_exercises
  add column if not exists notes text;

-- Allow block_id to be nullable for simplified templates
alter table public.plan_exercises
  alter column block_id drop not null;

-- Create index for simplified template queries
create index if not exists plan_exercises_plan_simple_idx 
  on public.plan_exercises(plan_id, position) 
  where block_id is null;

-- ============================================================================
-- SEED STANDARD EXERCISES
-- ============================================================================

-- Insert standard exercises (30 common exercises for MVP)
insert into public.exercise_library (
  name, category, body_part, equipment, exercise_type, 
  default_sets, default_reps, default_rest_seconds, is_custom
)
values
  -- CHEST (5 exercises)
  ('Bench Press (Barbell)', 'Chest', 'Chest', ARRAY['Barbell', 'Bench'], 'Lifting', 3, 8, 180, false),
  ('Bench Press (Dumbbell)', 'Chest', 'Chest', ARRAY['Dumbbell', 'Bench'], 'Lifting', 3, 10, 120, false),
  ('Incline Bench Press', 'Chest', 'Upper Chest', ARRAY['Barbell', 'Bench'], 'Lifting', 3, 8, 150, false),
  ('Chest Fly (Dumbbell)', 'Chest', 'Chest', ARRAY['Dumbbell', 'Bench'], 'Lifting', 3, 12, 90, false),
  ('Push-Up', 'Chest', 'Chest', ARRAY[], 'Bodyweight', 3, 15, 60, false),
  
  -- BACK (5 exercises)
  ('Deadlift (Barbell)', 'Back', 'Back', ARRAY['Barbell'], 'Lifting', 3, 5, 180, false),
  ('Pull-Up', 'Back', 'Lats', ARRAY['Pull-up Bar'], 'Bodyweight', 3, 8, 120, false),
  ('Bent Over Row (Barbell)', 'Back', 'Back', ARRAY['Barbell'], 'Lifting', 3, 8, 120, false),
  ('Lat Pulldown (Cable)', 'Back', 'Lats', ARRAY['Cable Machine'], 'Lifting', 3, 10, 90, false),
  ('Seated Row (Cable)', 'Back', 'Back', ARRAY['Cable Machine'], 'Lifting', 3, 12, 90, false),
  
  -- LEGS (6 exercises)
  ('Squat (Barbell)', 'Legs', 'Quadriceps', ARRAY['Barbell', 'Squat Rack'], 'Lifting', 3, 5, 180, false),
  ('Front Squat (Barbell)', 'Legs', 'Quadriceps', ARRAY['Barbell', 'Squat Rack'], 'Lifting', 3, 6, 180, false),
  ('Leg Press (Machine)', 'Legs', 'Quadriceps', ARRAY['Leg Press Machine'], 'Lifting', 3, 10, 120, false),
  ('Romanian Deadlift (Barbell)', 'Legs', 'Hamstrings', ARRAY['Barbell'], 'Lifting', 3, 8, 120, false),
  ('Leg Curl (Machine)', 'Legs', 'Hamstrings', ARRAY['Machine'], 'Lifting', 3, 12, 90, false),
  ('Calf Raise (Machine)', 'Legs', 'Calves', ARRAY['Machine'], 'Lifting', 3, 15, 60, false),
  
  -- SHOULDERS (4 exercises)
  ('Overhead Press (Barbell)', 'Shoulders', 'Shoulders', ARRAY['Barbell'], 'Lifting', 3, 5, 150, false),
  ('Overhead Press (Dumbbell)', 'Shoulders', 'Shoulders', ARRAY['Dumbbell'], 'Lifting', 3, 8, 120, false),
  ('Lateral Raise (Dumbbell)', 'Shoulders', 'Side Delts', ARRAY['Dumbbell'], 'Lifting', 3, 12, 60, false),
  ('Arnold Press (Dumbbell)', 'Shoulders', 'Shoulders', ARRAY['Dumbbell'], 'Lifting', 3, 10, 90, false),
  
  -- ARMS (4 exercises)
  ('Bicep Curl (Barbell)', 'Arms', 'Biceps', ARRAY['Barbell'], 'Lifting', 3, 10, 90, false),
  ('Hammer Curl (Dumbbell)', 'Arms', 'Biceps', ARRAY['Dumbbell'], 'Lifting', 3, 12, 60, false),
  ('Tricep Dip', 'Arms', 'Triceps', ARRAY['Dip Bar'], 'Bodyweight', 3, 10, 90, false),
  ('Tricep Extension (Cable)', 'Arms', 'Triceps', ARRAY['Cable Machine'], 'Lifting', 3, 12, 60, false),
  
  -- CORE (3 exercises)
  ('Plank', 'Core', 'Core', ARRAY[], 'Timed', 3, 1, 60, false),
  ('Ab Wheel', 'Core', 'Core', ARRAY['Ab Wheel'], 'Bodyweight', 3, 10, 90, false),
  ('Russian Twist', 'Core', 'Obliques', ARRAY[], 'Bodyweight', 3, 30, 60, false),
  
  -- CARDIO (3 exercises)
  ('Running', 'Cardio', 'Full Body', ARRAY['Treadmill'], 'Cardio', 1, 1, 0, false),
  ('Cycling', 'Cardio', 'Legs', ARRAY['Bike'], 'Cardio', 1, 1, 0, false),
  ('Rowing (Machine)', 'Cardio', 'Full Body', ARRAY['Rowing Machine'], 'Cardio', 1, 1, 0, false)
on conflict do nothing;

-- Verify insertion
select count(*) as total_exercises from public.exercise_library where is_custom = false;
```

#### 1.2 Run the Migration

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Paste the SQL from above
4. Click "Run"
5. Verify success (should see "Success" message)

**Option B: Using CLI**
```bash
# If using Supabase CLI
supabase db reset
supabase migration new create_exercise_library
# Paste SQL into the new migration file
supabase db push
```

#### 1.3 Verify Table Creation

Run this query to verify:
```sql
-- Check table exists
select * from public.exercise_library limit 5;

-- Check exercise count
select category, count(*) 
from public.exercise_library 
where is_custom = false 
group by category 
order by category;
```

Expected output: 30 exercises across 7 categories

---

### Step 2: Create Exercise Library Service (30 min)

#### 2.1 Create Service File

Create: `mobile/lib/exercise-library.ts`

```typescript
import { supabase } from "./supabase"
import { getCurrentUserId } from "./auth"
import type {
  ExerciseLibraryRow,
  ExerciseLibraryItem,
  ExerciseFilters,
  ExerciseCategory,
  ExerciseType,
} from "../types/workout"

/**
 * Fetch all exercises from library with optional filters
 */
export async function listExercises(
  filters?: ExerciseFilters
): Promise<ExerciseLibraryItem[]> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  let query = supabase
    .from("exercise_library")
    .select("*")
    .order("name")

  // Apply search filter
  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`)
  }

  // Apply category filter
  if (filters?.category && filters.category !== "all") {
    query = query.eq("category", filters.category)
  }

  // Apply exercise type filter
  if (filters?.exerciseType && filters.exerciseType !== "all") {
    query = query.eq("exercise_type", filters.exerciseType)
  }

  // Apply custom-only filter
  if (filters?.customOnly) {
    query = query.eq("is_custom", true)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data || []
}

/**
 * Get exercise categories with counts
 */
export async function getExerciseCategories(): Promise<
  Array<{ category: ExerciseCategory; count: number }>
> {
  const { data, error } = await supabase
    .from("exercise_library")
    .select("category")

  if (error) throw new Error(error.message)

  // Count by category
  const counts = new Map<ExerciseCategory, number>()
  data?.forEach((item) => {
    const cat = item.category as ExerciseCategory
    counts.set(cat, (counts.get(cat) || 0) + 1)
  })

  return Array.from(counts.entries()).map(([category, count]) => ({
    category,
    count,
  }))
}

/**
 * Create a custom exercise
 */
export async function createCustomExercise(exercise: {
  name: string
  description?: string
  category: ExerciseCategory
  body_part?: string
  equipment?: string[]
  exercise_type: ExerciseType
  default_sets?: number
  default_reps?: number
  default_rest_seconds?: number
}): Promise<ExerciseLibraryRow> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  // Get user's group_id
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("group_id")
    .eq("id", uid)
    .single()

  if (userError || !user) throw new Error("Failed to get user info")

  const { data, error } = await supabase
    .from("exercise_library")
    .insert([
      {
        ...exercise,
        is_custom: true,
        created_by: uid,
        group_id: user.group_id,
      },
    ])
    .select("*")
    .single()

  if (error || !data) throw new Error(error?.message || "Failed to create exercise")
  return data
}

/**
 * Update a custom exercise (only if user created it)
 */
export async function updateCustomExercise(
  exerciseId: string,
  updates: Partial<ExerciseLibraryRow>
): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("exercise_library")
    .update(updates)
    .eq("id", exerciseId)
    .eq("created_by", uid)
    .eq("is_custom", true)

  if (error) throw new Error(error.message)
}

/**
 * Delete a custom exercise (only if user created it)
 */
export async function deleteCustomExercise(exerciseId: string): Promise<void> {
  const uid = await getCurrentUserId()
  if (!uid) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("exercise_library")
    .delete()
    .eq("id", exerciseId)
    .eq("created_by", uid)
    .eq("is_custom", true)

  if (error) throw new Error(error.message)
}

/**
 * Search exercises using full-text search
 */
export async function searchExercises(
  searchTerm: string
): Promise<ExerciseLibraryItem[]> {
  if (!searchTerm.trim()) return listExercises()

  const { data, error } = await supabase.rpc("search_exercises", {
    search_query: searchTerm,
  })

  if (error) {
    // Fallback to simple ILIKE search if RPC doesn't exist yet
    return listExercises({ search: searchTerm })
  }

  return data || []
}
```

#### 2.2 (Optional) Create Search RPC Function

If you want fast full-text search, add this SQL function:

```sql
-- Create search function for exercises
create or replace function public.search_exercises(search_query text)
returns setof exercise_library
language sql
security definer
set search_path = public
as $$
  select *
  from exercise_library
  where to_tsvector('english', name || ' ' || coalesce(description, ''))
    @@ plainto_tsquery('english', search_query)
    and (
      is_custom = false or 
      group_id = (select group_id from users where id = auth.uid())
    )
  order by name;
$$;
```

---

### Step 3: Create ExerciseLibraryModal Component (2-3 hours)

#### 3.1 Create Component File

Create: `mobile/components/workout/ExerciseLibraryModal.tsx`

```typescript
import React, { useState, useEffect, useMemo } from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  SectionList,
  ActivityIndicator,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { listExercises } from "../../lib/exercise-library"
import type {
  ExerciseLibraryModalProps,
  ExerciseLibraryItem,
  ExerciseCategory,
} from "../../types/workout"

export default function ExerciseLibraryModal({
  visible,
  onClose,
  onSelectExercises,
  allowMultiSelect = true,
  preSelectedIds = [],
}: ExerciseLibraryModalProps) {
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(preSelectedIds))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [searchText, setSearchText] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | "all">("all")

  // Load exercises on mount
  useEffect(() => {
    if (visible) {
      loadExercises()
    }
  }, [visible])

  const loadExercises = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listExercises()
      setExercises(data)
    } catch (err: any) {
      setError(err.message || "Failed to load exercises")
    } finally {
      setLoading(false)
    }
  }

  // Filter and group exercises
  const sections = useMemo(() => {
    // Apply filters
    let filtered = exercises

    if (searchText) {
      filtered = filtered.filter((e) =>
        e.name.toLowerCase().includes(searchText.toLowerCase())
      )
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((e) => e.category === categoryFilter)
    }

    // Group by first letter
    const grouped = new Map<string, ExerciseLibraryItem[]>()
    filtered.forEach((exercise) => {
      const letter = exercise.name[0].toUpperCase()
      if (!grouped.has(letter)) {
        grouped.set(letter, [])
      }
      grouped.get(letter)!.push(exercise)
    })

    // Convert to section list format
    return Array.from(grouped.entries())
      .map(([letter, data]) => ({ title: letter, data }))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [exercises, searchText, categoryFilter])

  const toggleExercise = (exerciseId: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(exerciseId)) {
      newSet.delete(exerciseId)
    } else {
      if (!allowMultiSelect) {
        newSet.clear()
      }
      newSet.add(exerciseId)
    }
    setSelectedIds(newSet)
  }

  const handleAdd = () => {
    const selected = exercises.filter((e) => selectedIds.has(e.id))
    onSelectExercises(selected)
    onClose()
  }

  const renderExerciseCard = ({ item }: { item: ExerciseLibraryItem }) => {
    const isSelected = selectedIds.has(item.id)

    return (
      <TouchableOpacity
        style={[styles.exerciseCard, isSelected && styles.exerciseCardSelected]}
        onPress={() => toggleExercise(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.exerciseThumbnail}>
          <Ionicons name="barbell" size={24} color="#4A90E2" />
        </View>
        
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <Text style={styles.exerciseCategory}>{item.category}</Text>
        </View>

        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        )}
      </TouchableOpacity>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Exercises</Text>
          <TouchableOpacity onPress={handleAdd} disabled={selectedIds.size === 0}>
            <Text
              style={[
                styles.addButton,
                selectedIds.size === 0 && styles.addButtonDisabled,
              ]}
            >
              Add ({selectedIds.size})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#999"
          />
        </View>

        {/* Category Filters */}
        <View style={styles.filterContainer}>
          {["all", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core"].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                categoryFilter === cat && styles.filterChipActive,
              ]}
              onPress={() => setCategoryFilter(cat as any)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  categoryFilter === cat && styles.filterChipTextActive,
                ]}
              >
                {cat === "all" ? "All" : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exercise List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Loading exercises...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadExercises}>
              <Text style={styles.retryButton}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderExerciseCard}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
              </View>
            )}
            stickySectionHeadersEnabled
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  addButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A90E2",
  },
  addButtonDisabled: {
    color: "#ccc",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    gap: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  filterChipActive: {
    backgroundColor: "#4A90E2",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#F8F9FA",
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
  },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  exerciseCardSelected: {
    backgroundColor: "#EBF5FF",
  },
  exerciseThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  exerciseCategory: {
    fontSize: 14,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A90E2",
  },
  listContent: {
    paddingBottom: 20,
  },
})
```

---

### Step 4: Test the Implementation (30 min)

#### 4.1 Create Test Screen

Create: `mobile/components/workout/ExerciseLibraryTest.tsx`

```typescript
import React, { useState } from "react"
import { View, Button, Text, StyleSheet } from "react-native"
import ExerciseLibraryModal from "./ExerciseLibraryModal"
import type { ExerciseLibraryItem } from "../../types/workout"

export default function ExerciseLibraryTest() {
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedExercises, setSelectedExercises] = useState<ExerciseLibraryItem[]>([])

  const handleSelect = (exercises: ExerciseLibraryItem[]) => {
    setSelectedExercises(exercises)
    console.log("Selected exercises:", exercises)
  }

  return (
    <View style={styles.container}>
      <Button title="Open Exercise Library" onPress={() => setModalVisible(true)} />

      <Text style={styles.title}>Selected Exercises:</Text>
      {selectedExercises.map((ex) => (
        <Text key={ex.id} style={styles.exerciseText}>
          • {ex.name} ({ex.category})
        </Text>
      ))}

      <ExerciseLibraryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectExercises={handleSelect}
        allowMultiSelect={true}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
  },
  exerciseText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
})
```

#### 4.2 Add to BodyScreen for Testing

Temporarily add to `mobile/screens/BodyScreen.tsx`:

```typescript
import ExerciseLibraryTest from "../components/workout/ExerciseLibraryTest"

// In render:
{isAdmin && (
  <View>
    <ExerciseLibraryTest />
  </View>
)}
```

#### 4.3 Test Checklist

- [ ] Modal opens smoothly
- [ ] 30+ exercises load
- [ ] Search works (try "bench", "squat")
- [ ] Category filters work (Chest, Back, etc.)
- [ ] Can select/deselect exercises
- [ ] Multi-select shows count in header
- [ ] "Add" button is disabled when nothing selected
- [ ] Selected exercises are returned on Add
- [ ] Modal closes on Add/Close

---

## ✅ Phase 1 Completion Checklist

- [ ] SQL migration run successfully
- [ ] 30 exercises seeded in database
- [ ] `exercise-library.ts` service created
- [ ] `ExerciseLibraryModal.tsx` component created
- [ ] Test screen created and working
- [ ] All 9 test criteria passing
- [ ] No console errors
- [ ] Performance is smooth (no lag)

---

## 🐛 Common Issues & Solutions

### Issue: "Table does not exist"
**Solution:** Run the SQL migration again, check for typos in table name.

### Issue: "No exercises showing"
**Solution:** Check if seed data was inserted:
```sql
select count(*) from exercise_library;
```

### Issue: "RLS policy error"
**Solution:** Ensure you're authenticated. Check user's `group_id` is set.

### Issue: "Search not working"
**Solution:** RPC function may not exist yet. It falls back to ILIKE search automatically.

### Issue: "Modal won't open"
**Solution:** Check `visible` prop is being toggled. Add console.log to debug.

---

## 📚 Next Steps (Phase 2)

Once Phase 1 is complete, proceed to:
1. Create `EnhancedWorkoutBuilderModal`
2. Create `ExerciseConfigModal`
3. Integrate exercise library into template builder
4. Add drag-to-reorder for exercises
5. Save simplified templates to database

---

## 💬 Need Help?

- Check the full implementation plan: `HEVY-STYLE-WORKOUT-IMPLEMENTATION-PLAN.md`
- Review UI specs: `HEVY-STYLE-UI-SPECIFICATIONS.md`
- Compare systems: `SYSTEM-COMPARISON.md`
- Review types: `mobile/types/workout.ts`

---

**Estimated Time:** 4-6 hours for Phase 1  
**Difficulty:** Intermediate  
**Status:** READY TO IMPLEMENT ✅

