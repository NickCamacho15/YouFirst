-- Add missing 'skipped' column to set_logs and ensure unique index
-- Safe to run multiple times

alter table if exists public.set_logs
  add column if not exists skipped boolean not null default false;

-- Ensure uniqueness of (session_exercise_id, set_index)
create unique index if not exists set_logs_unique_ex_set
  on public.set_logs(session_exercise_id, set_index);


