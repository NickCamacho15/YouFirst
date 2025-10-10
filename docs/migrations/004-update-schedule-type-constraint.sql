-- Update the schedule_type constraint to remove 'immediate' option
-- This migration updates the constraint to only allow 'once' and 'weekly'

-- First, drop the old constraint
ALTER TABLE public.training_plans
DROP CONSTRAINT IF EXISTS training_plans_schedule_type_check;

-- Add the new constraint with only 'once' and 'weekly'
ALTER TABLE public.training_plans
ADD CONSTRAINT training_plans_schedule_type_check 
CHECK (schedule_type IN ('once', 'weekly'));

-- Update any existing 'immediate' values to 'once' (if any exist)
UPDATE public.training_plans
SET schedule_type = 'once',
    scheduled_date = CURRENT_DATE
WHERE schedule_type = 'immediate';

COMMENT ON CONSTRAINT training_plans_schedule_type_check ON public.training_plans 
IS 'Ensures schedule_type is either once (specific date) or weekly (recurring days)';

