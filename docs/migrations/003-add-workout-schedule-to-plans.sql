-- Add schedule fields to training_plans table
-- This allows workouts to be published with a schedule that applies to all users

ALTER TABLE public.training_plans
ADD COLUMN IF NOT EXISTS schedule_type text CHECK (schedule_type IN ('once', 'weekly')),
ADD COLUMN IF NOT EXISTS scheduled_date date,
ADD COLUMN IF NOT EXISTS recurrence_days integer[],
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date;

COMMENT ON COLUMN public.training_plans.schedule_type IS 'Determines when this workout appears: immediate (always available), once (specific date), or weekly (recurring days)';
COMMENT ON COLUMN public.training_plans.scheduled_date IS 'For schedule_type=once: the specific date this workout is scheduled';
COMMENT ON COLUMN public.training_plans.recurrence_days IS 'For schedule_type=weekly: array of days (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN public.training_plans.start_date IS 'For schedule_type=weekly: when the recurring schedule starts';
COMMENT ON COLUMN public.training_plans.end_date IS 'For schedule_type=weekly: when the recurring schedule ends (optional)';

-- Create index for querying by schedule
CREATE INDEX IF NOT EXISTS idx_training_plans_schedule ON public.training_plans(schedule_type, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_training_plans_recurrence ON public.training_plans USING GIN (recurrence_days);

