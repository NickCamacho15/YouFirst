-- Adds total_volume numeric column to workout_sessions for completion stats
-- Safe to run multiple times

alter table if exists public.workout_sessions
  add column if not exists total_volume numeric;


