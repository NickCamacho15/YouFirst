-- Add scheduling columns to plan_assignments table
-- This allows workouts to be assigned immediately, on a specific date, or weekly recurring

-- Add schedule type column
ALTER TABLE public.plan_assignments 
ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'immediate' 
CHECK (schedule_type IN ('immediate', 'once', 'weekly'));

-- Add scheduled date for one-time assignments
ALTER TABLE public.plan_assignments 
ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Add recurrence days for weekly assignments (0=Sun, 1=Mon, ..., 6=Sat)
ALTER TABLE public.plan_assignments 
ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[];

-- Add start date for recurring schedules
ALTER TABLE public.plan_assignments 
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Add optional end date for recurring schedules
ALTER TABLE public.plan_assignments 
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add active flag to allow pausing assignments
ALTER TABLE public.plan_assignments 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for efficient date queries
CREATE INDEX IF NOT EXISTS idx_plan_assignments_scheduled_date 
ON public.plan_assignments(scheduled_date) 
WHERE scheduled_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plan_assignments_schedule_type 
ON public.plan_assignments(schedule_type);

-- Add comments for documentation
COMMENT ON COLUMN public.plan_assignments.schedule_type IS 'Type of schedule: immediate (available now), once (specific date), weekly (recurring)';
COMMENT ON COLUMN public.plan_assignments.scheduled_date IS 'Date for one-time scheduled workouts';
COMMENT ON COLUMN public.plan_assignments.recurrence_days IS 'Array of day numbers for weekly recurrence (0=Sun, 1=Mon, ..., 6=Sat)';
COMMENT ON COLUMN public.plan_assignments.start_date IS 'Start date for recurring schedules';
COMMENT ON COLUMN public.plan_assignments.end_date IS 'Optional end date for recurring schedules (null = ongoing)';
COMMENT ON COLUMN public.plan_assignments.is_active IS 'Whether the assignment is currently active';

