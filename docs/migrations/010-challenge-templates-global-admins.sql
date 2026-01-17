-- Allow ALL admins to publish GLOBAL community challenges
-- This updates the RLS policy created in 009 to include public.current_user_role() = 'admin'
-- Safe to run multiple times

alter table if exists public.challenge_templates enable row level security;

drop policy if exists challenge_templates_cud_global_publisher on public.challenge_templates;
create policy challenge_templates_cud_global_publisher on public.challenge_templates
  for all to authenticated
  using (
    scope = 'global'
    and (
      public.current_user_role() = 'admin'
      or exists (select 1 from public.global_challenge_publishers p where p.user_id = auth.uid())
    )
  )
  with check (
    scope = 'global'
    and (
      public.current_user_role() = 'admin'
      or exists (select 1 from public.global_challenge_publishers p where p.user_id = auth.uid())
    )
    and created_by = auth.uid()
  );

