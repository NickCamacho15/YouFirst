-- Query Current Database Schema
-- Run these queries in your Supabase SQL Editor to verify the current structure

-- =====================
-- 1. Check training_plans table structure
-- =====================
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'training_plans'
ORDER BY ordinal_position;

-- =====================
-- 2. Check plan hierarchy tables
-- =====================
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('plan_weeks', 'plan_days', 'plan_blocks', 'plan_exercises')
ORDER BY table_name, ordinal_position;

-- =====================
-- 3. Check workout session tables
-- =====================
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('workout_sessions', 'session_exercises', 'set_logs')
ORDER BY table_name, ordinal_position;

-- =====================
-- 4. Check users, groups, and plan_assignments
-- =====================
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('groups', 'plan_assignments')
ORDER BY table_name, ordinal_position;

-- =====================
-- 5. Check RLS policies
-- =====================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('training_plans', 'plan_assignments', 'workout_sessions', 'users', 'groups')
ORDER BY tablename, policyname;

-- =====================
-- 6. Check indexes
-- =====================
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('training_plans', 'plan_weeks', 'plan_days', 'plan_blocks', 'plan_exercises', 'workout_sessions', 'session_exercises', 'set_logs', 'plan_assignments', 'groups')
ORDER BY tablename, indexname;

-- =====================
-- 7. Check foreign key relationships
-- =====================
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('training_plans', 'plan_weeks', 'plan_days', 'plan_blocks', 'plan_exercises', 'workout_sessions', 'session_exercises', 'set_logs', 'plan_assignments')
ORDER BY tc.table_name, kcu.column_name;

-- =====================
-- 8. Sample data check (if any exists)
-- =====================
SELECT COUNT(*) as total_plans FROM public.training_plans;
SELECT COUNT(*) as total_workouts FROM public.workout_sessions;
SELECT COUNT(*) as total_groups FROM public.groups;
SELECT COUNT(*) as total_users FROM public.users;
SELECT COUNT(*) as total_assignments FROM public.plan_assignments;

