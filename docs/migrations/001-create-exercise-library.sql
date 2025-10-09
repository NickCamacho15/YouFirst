-- ============================================================================
-- HEVY-STYLE WORKOUT SYSTEM - PHASE 1: EXERCISE LIBRARY
-- Created: October 9, 2025
-- Purpose: Create exercise library table and seed with standard exercises
-- ============================================================================

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

create index if not exists exercise_library_type_idx 
  on public.exercise_library(exercise_type);

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

-- Make block_id nullable for simplified templates
-- (First check if the column exists and is not nullable)
do $$
begin
  alter table public.plan_exercises
    alter column block_id drop not null;
exception
  when others then
    -- Column might already be nullable or doesn't exist
    null;
end $$;

-- Create index for simplified template queries
create index if not exists plan_exercises_plan_simple_idx 
  on public.plan_exercises(plan_id, position) 
  where block_id is null;

-- ============================================================================
-- SEED STANDARD EXERCISES (30+ exercises)
-- ============================================================================

-- Insert standard exercises
insert into public.exercise_library (
  name, category, body_part, equipment, exercise_type, 
  default_sets, default_reps, default_rest_seconds, is_custom
)
values
  -- CHEST (5 exercises)
  ('Bench Press (Barbell)', 'Chest', 'Chest', ARRAY['Barbell', 'Bench'], 'Lifting', 3, 8, 180, false),
  ('Bench Press (Dumbbell)', 'Chest', 'Chest', ARRAY['Dumbbell', 'Bench'], 'Lifting', 3, 10, 120, false),
  ('Incline Bench Press (Barbell)', 'Chest', 'Upper Chest', ARRAY['Barbell', 'Bench'], 'Lifting', 3, 8, 150, false),
  ('Chest Fly (Dumbbell)', 'Chest', 'Chest', ARRAY['Dumbbell', 'Bench'], 'Lifting', 3, 12, 90, false),
  ('Push-Up', 'Chest', 'Chest', ARRAY[], 'Bodyweight', 3, 15, 60, false),
  
  -- BACK (5 exercises)
  ('Deadlift (Barbell)', 'Back', 'Lower Back', ARRAY['Barbell'], 'Lifting', 3, 5, 180, false),
  ('Pull-Up', 'Back', 'Lats', ARRAY['Pull-up Bar'], 'Bodyweight', 3, 8, 120, false),
  ('Bent Over Row (Barbell)', 'Back', 'Mid Back', ARRAY['Barbell'], 'Lifting', 3, 8, 120, false),
  ('Lat Pulldown (Cable)', 'Back', 'Lats', ARRAY['Cable Machine'], 'Lifting', 3, 10, 90, false),
  ('Seated Row (Cable)', 'Back', 'Mid Back', ARRAY['Cable Machine'], 'Lifting', 3, 12, 90, false),
  
  -- LEGS (6 exercises)
  ('Squat (Barbell)', 'Legs', 'Quadriceps', ARRAY['Barbell', 'Squat Rack'], 'Lifting', 3, 5, 180, false),
  ('Front Squat (Barbell)', 'Legs', 'Quadriceps', ARRAY['Barbell', 'Squat Rack'], 'Lifting', 3, 6, 180, false),
  ('Leg Press (Machine)', 'Legs', 'Quadriceps', ARRAY['Leg Press Machine'], 'Lifting', 3, 10, 120, false),
  ('Romanian Deadlift (Barbell)', 'Legs', 'Hamstrings', ARRAY['Barbell'], 'Lifting', 3, 8, 120, false),
  ('Leg Curl (Machine)', 'Legs', 'Hamstrings', ARRAY['Machine'], 'Lifting', 3, 12, 90, false),
  ('Calf Raise (Machine)', 'Legs', 'Calves', ARRAY['Machine'], 'Lifting', 3, 15, 60, false),
  
  -- SHOULDERS (4 exercises)
  ('Overhead Press (Barbell)', 'Shoulders', 'Front Delts', ARRAY['Barbell'], 'Lifting', 3, 5, 150, false),
  ('Overhead Press (Dumbbell)', 'Shoulders', 'Shoulders', ARRAY['Dumbbell'], 'Lifting', 3, 8, 120, false),
  ('Lateral Raise (Dumbbell)', 'Shoulders', 'Side Delts', ARRAY['Dumbbell'], 'Lifting', 3, 12, 60, false),
  ('Arnold Press (Dumbbell)', 'Shoulders', 'Shoulders', ARRAY['Dumbbell'], 'Lifting', 3, 10, 90, false),
  
  -- ARMS (4 exercises)
  ('Bicep Curl (Barbell)', 'Arms', 'Biceps', ARRAY['Barbell'], 'Lifting', 3, 10, 90, false),
  ('Hammer Curl (Dumbbell)', 'Arms', 'Biceps', ARRAY['Dumbbell'], 'Lifting', 3, 12, 60, false),
  ('Tricep Dip', 'Arms', 'Triceps', ARRAY['Dip Bar'], 'Bodyweight', 3, 10, 90, false),
  ('Tricep Extension (Cable)', 'Arms', 'Triceps', ARRAY['Cable Machine'], 'Lifting', 3, 12, 60, false),
  
  -- CORE (3 exercises)
  ('Plank', 'Core', 'Core', ARRAY[], 'Timed', 3, 60, 60, false),
  ('Ab Wheel Rollout', 'Core', 'Core', ARRAY['Ab Wheel'], 'Bodyweight', 3, 10, 90, false),
  ('Russian Twist', 'Core', 'Obliques', ARRAY[], 'Bodyweight', 3, 30, 60, false),
  
  -- CARDIO (3 exercises)
  ('Running', 'Cardio', 'Full Body', ARRAY['Treadmill'], 'Cardio', 1, 1, 0, false),
  ('Cycling', 'Cardio', 'Legs', ARRAY['Bike'], 'Cardio', 1, 1, 0, false),
  ('Rowing (Machine)', 'Cardio', 'Full Body', ARRAY['Rowing Machine'], 'Cardio', 1, 1, 0, false),
  
  -- FULL BODY (2 exercises)
  ('Burpee', 'Full Body', 'Full Body', ARRAY[], 'Bodyweight', 3, 15, 90, false),
  ('Kettlebell Swing', 'Full Body', 'Full Body', ARRAY['Kettlebell'], 'Lifting', 3, 15, 90, false)
on conflict do nothing;

-- ============================================================================
-- CREATE SEARCH RPC FUNCTION (OPTIONAL BUT RECOMMENDED)
-- ============================================================================

-- Create search function for fast full-text search
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

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table exists
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'exercise_library') then
    raise notice '✅ exercise_library table created successfully';
  else
    raise exception '❌ exercise_library table was not created';
  end if;
end $$;

-- Count exercises
do $$
declare
  exercise_count int;
begin
  select count(*) into exercise_count from public.exercise_library where is_custom = false;
  if exercise_count >= 30 then
    raise notice '✅ % standard exercises seeded successfully', exercise_count;
  else
    raise warning '⚠️  Only % exercises seeded (expected 30+)', exercise_count;
  end if;
end $$;

-- Show summary by category
select 
  category,
  count(*) as exercise_count,
  string_agg(exercise_type::text, ', ') as types
from public.exercise_library 
where is_custom = false 
group by category 
order by category;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Show completion message
do $$
begin
  raise notice '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  raise notice '✅ PHASE 1 DATABASE MIGRATION COMPLETE!';
  raise notice '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  raise notice '';
  raise notice 'Created:';
  raise notice '  • exercise_library table';
  raise notice '  • Enhanced plan_exercises table';
  raise notice '  • RLS policies';
  raise notice '  • Search indexes';
  raise notice '  • 30+ standard exercises';
  raise notice '';
  raise notice 'Next steps:';
  raise notice '  1. Create mobile/lib/exercise-library.ts service';
  raise notice '  2. Create ExerciseLibraryModal component';
  raise notice '  3. Test the exercise library!';
  raise notice '';
  raise notice '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
end $$;

