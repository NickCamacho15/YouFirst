-- Fix plan_assignments to inherit schedule from training_plans
-- This ensures that when a workout with a recurring schedule is assigned to users,
-- the schedule information is properly copied from training_plans to plan_assignments

-- Update all existing plan_assignments to copy schedule from training_plans
UPDATE plan_assignments 
SET 
  schedule_type = tp.schedule_type,
  scheduled_date = tp.scheduled_date,
  recurrence_days = tp.recurrence_days,
  start_date = tp.start_date,
  end_date = tp.end_date
FROM training_plans tp
WHERE plan_assignments.plan_id = tp.id
  AND tp.schedule_type IS NOT NULL
  AND (
    plan_assignments.schedule_type IS NULL 
    OR plan_assignments.schedule_type != tp.schedule_type
    OR plan_assignments.recurrence_days IS NULL
    OR plan_assignments.recurrence_days != tp.recurrence_days
  );

-- Verify the update
SELECT 
  pa.id,
  tp.name AS workout_name,
  pa.schedule_type,
  pa.recurrence_days,
  pa.start_date,
  pa.end_date
FROM plan_assignments pa
JOIN training_plans tp ON pa.plan_id = tp.id
WHERE pa.schedule_type = 'weekly'
ORDER BY pa.created_at DESC;

