-- Migration: Add set_details column to plan_exercises table
-- Purpose: Support per-set configurations (different weights/reps for each set)
-- Date: 2024-10-09

-- Add set_details column as JSONB to store array of set configurations
ALTER TABLE public.plan_exercises 
ADD COLUMN IF NOT EXISTS set_details JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.plan_exercises.set_details IS 
'Array of per-set configurations: [{ set_number: 1, reps: 10, weight: 135, time_seconds: null, distance_m: null }, ...]';

-- Create an index for querying set_details (if needed for filtering/sorting)
CREATE INDEX IF NOT EXISTS plan_exercises_set_details_idx 
ON public.plan_exercises USING GIN (set_details);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'plan_exercises'
  AND column_name = 'set_details';

