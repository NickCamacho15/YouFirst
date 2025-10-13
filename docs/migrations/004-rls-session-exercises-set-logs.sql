-- Ensure RLS and policies for workout execution tables
-- Safe to run multiple times

-- Enable RLS
alter table if exists public.workout_sessions enable row level security;
alter table if exists public.session_exercises enable row level security;
alter table if exists public.set_logs enable row level security;

-- workout_sessions: users can CRUD only their own
drop policy if exists ws_select_own on public.workout_sessions;
create policy ws_select_own on public.workout_sessions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists ws_insert_own on public.workout_sessions;
create policy ws_insert_own on public.workout_sessions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists ws_update_own on public.workout_sessions;
create policy ws_update_own on public.workout_sessions
  for update to authenticated using (user_id = auth.uid());

-- session_exercises: parent-based access
drop policy if exists se_all_parent on public.session_exercises;
create policy se_all_parent on public.session_exercises
  for all to authenticated
  using (exists (select 1 from public.workout_sessions ws where ws.id = session_id and ws.user_id = auth.uid()))
  with check (exists (select 1 from public.workout_sessions ws where ws.id = session_id and ws.user_id = auth.uid()));

-- set_logs: parent-based access through session_exercises → workout_sessions
drop policy if exists sl_all_parent on public.set_logs;
create policy sl_all_parent on public.set_logs
  for all to authenticated
  using (
    exists (
      select 1
      from public.session_exercises se
      join public.workout_sessions ws on ws.id = se.session_id
      where se.id = set_logs.session_exercise_id and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.session_exercises se
      join public.workout_sessions ws on ws.id = se.session_id
      where se.id = set_logs.session_exercise_id and ws.user_id = auth.uid()
    )
  );


