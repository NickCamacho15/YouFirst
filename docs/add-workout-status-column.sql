-- Add status column to training_plans for draft/published workflow
-- Run this in Supabase SQL Editor

-- =====================
-- 1. Add status column with default 'draft'
-- =====================
ALTER TABLE public.training_plans
ADD COLUMN IF NOT EXISTS status text 
CHECK (status IN ('draft', 'published', 'archived')) 
DEFAULT 'draft';

-- Set existing plans to 'published' so they remain visible
UPDATE public.training_plans 
SET status = 'published' 
WHERE status IS NULL;

-- =====================
-- 2. Add index for filtering by status
-- =====================
CREATE INDEX IF NOT EXISTS training_plans_status_idx 
ON public.training_plans(status);

-- =====================
-- 3. Update RLS policy so users only see PUBLISHED assigned plans
-- =====================
DROP POLICY IF EXISTS training_plans_select_assigned ON public.training_plans;
CREATE POLICY training_plans_select_assigned ON public.training_plans
  FOR SELECT TO authenticated USING (
    status = 'published' AND EXISTS (
      SELECT 1 FROM public.plan_assignments pa
      WHERE pa.plan_id = public.training_plans.id
        AND pa.user_id = auth.uid()
    )
  );

-- =====================
-- 4. Ensure admins can still see their own draft plans
-- =====================
-- The existing training_plans_select_owner policy handles this:
-- Admins can see all their own plans (draft, published, archived)
-- This policy should already exist:
DROP POLICY IF EXISTS training_plans_select_owner ON public.training_plans;
CREATE POLICY training_plans_select_owner ON public.training_plans
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- =====================
-- 5. Add CUD policy for training_plans (if not exists)
-- =====================
-- Admins should be able to create/update/delete their own plans
DROP POLICY IF EXISTS training_plans_cud_own ON public.training_plans;
CREATE POLICY training_plans_cud_own ON public.training_plans
  FOR ALL TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- =====================
-- 6. Verify RLS is enabled
-- =====================
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

-- =====================
-- 7. Test queries (optional)
-- =====================
-- As admin, should see all own plans:
-- SELECT * FROM public.training_plans WHERE user_id = auth.uid();

-- As user, should only see published assigned plans:
-- SELECT tp.* 
-- FROM public.training_plans tp
-- JOIN public.plan_assignments pa ON pa.plan_id = tp.id
-- WHERE pa.user_id = auth.uid() AND tp.status = 'published';

-- =====================
-- DONE
-- =====================
-- Migration complete!
-- Admins can now:
--  1. Create plans (default status: 'draft')
--  2. Edit draft plans
--  3. Publish plans (status -> 'published')
--  4. Assign published plans to users
-- 
-- Users can only see:
--  1. Published plans assigned to them
--  2. Cannot see draft or archived plans

