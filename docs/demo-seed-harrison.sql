\set uid 'a9a2c27a-36e6-468a-96ab-6f94015779c3'
\set email 'harrison@gmail.com'
\set username 'harrison'
\set display_name 'harrison'

-- Expose uid to PL/pgSQL via GUC
select set_config('app.uid', :'uid', false);

begin;

-- Ensure profile exists in public.users
insert into public.users (id, email, display_name, username)
values (:'uid'::uuid, :'email', :'display_name', :'username')
on conflict (id) do update set email=excluded.email, display_name=excluded.display_name, username=excluded.username;

-- Wipe existing data for idempotent reseed
-- Workouts and related
delete from public.set_logs where session_exercise_id in (
  select se.id from public.session_exercises se join public.workout_sessions ws on ws.id=se.session_id where ws.user_id = :'uid'::uuid
);
delete from public.session_exercises using public.workout_sessions ws where session_exercises.session_id = ws.id and ws.user_id=:'uid'::uuid;
delete from public.workout_sessions where user_id=:'uid'::uuid;

-- Plan trees and plans
delete from public.plan_exercises where user_id=:'uid'::uuid;
delete from public.plan_blocks where user_id=:'uid'::uuid;
delete from public.plan_days where user_id=:'uid'::uuid;
delete from public.plan_weeks where user_id=:'uid'::uuid;
delete from public.training_plans where user_id=:'uid'::uuid;

-- Challenges and rule checks
delete from public.user_challenge_rule_checks where user_id=:'uid'::uuid;
delete from public.user_challenges where user_id=:'uid'::uuid;

-- Personal rules and checks
delete from public.personal_rule_checks where user_id=:'uid'::uuid;
delete from public.personal_rules where user_id=:'uid'::uuid;

-- Routines and logs
delete from public.user_routine_logs where user_id=:'uid'::uuid;
delete from public.user_routines where user_id=:'uid'::uuid;

-- Tasks
delete from public.day_tasks where user_id=:'uid'::uuid;

-- Reading
delete from public.user_reading_sessions where user_id=:'uid'::uuid;

-- Meditation
delete from public.user_meditation_milestones where user_id=:'uid'::uuid;
delete from public.meditation_sessions where user_id=:'uid'::uuid;

-- Wins and notifications
delete from public.user_wins where user_id=:'uid'::uuid;
delete from public.notifications where user_id=:'uid'::uuid;

-- Personal Records
delete from public.personal_record_history where user_id=:'uid'::uuid;
delete from public.personal_records where user_id=:'uid'::uuid;

commit;

-- =====================
-- Seed: Wins (last 90 days, ~80–90% coverage, deterministic)
-- =====================
insert into public.user_wins (user_id, win_date)
select :'uid'::uuid as user_id, d::date as win_date
from generate_series(current_date - interval '90 days', current_date, interval '1 day') d
where (
  (('x' || substr(md5(:'uid' || to_char(d::date, 'YYYY-MM-DD')), 1, 8))::bit(32)::int % 100)
  < case when d::date >= current_date - 14 then 90 else 80 end
)
on conflict do nothing;

-- =====================
-- Seed: Meditation sessions (~60 sessions over last 60 days)
-- =====================
insert into public.meditation_sessions (
  user_id, started_at, ended_at, duration_seconds, prep_seconds, interval_minutes, meditation_minutes
)
select
  :'uid'::uuid,
  (d::date + make_time(
     6 + ((('x'||substr(md5(:'uid'||to_char(d,'YYYY-MM-DD')||'h'),1,2))::bit(8)::int % 3)),
     15 * ((('x'||substr(md5(:'uid'||to_char(d,'YYYY-MM-DD')||'m'),1,2))::bit(8)::int % 4)),
     0
  )) at time zone 'UTC' as started_at,
  ((d::date + time '06:00') + make_interval(secs => 600 + 60 * ((('x'||substr(md5(:'uid'||to_char(d,'YYYY-MM-DD')||'dur'),1,2))::bit(8)::int % 16)))) at time zone 'UTC' as ended_at,
  600 + 60 * ((('x'||substr(md5(:'uid'||to_char(d,'YYYY-MM-DD')||'dur'),1,2))::bit(8)::int % 16)) as duration_seconds,
  60 as prep_seconds,
  5 as interval_minutes,
  10 + ((('x'||substr(md5(:'uid'||to_char(d,'YYYY-MM-DD')||'min'),1,2))::bit(8)::int % 16)) as meditation_minutes
from generate_series(current_date - interval '60 days', current_date, interval '1 day') d
where (('x'||substr(md5(:'uid'||to_char(d::date,'YYYY-MM-DD')||'med'),1,8))::bit(32)::int % 100) < 80;

-- Award meditation milestones (based on counts/seconds/distinct days)
with stats as (
  select
    count(*) as session_count,
    coalesce(sum(duration_seconds),0) as total_seconds,
    count(distinct started_at::date) as distinct_days
  from public.meditation_sessions
  where user_id=:'uid'::uuid
)
insert into public.user_meditation_milestones (user_id, milestone_code, awarded_at)
select :'uid'::uuid, code, now()
from (
  select 'first_session' as code where (select session_count from stats) >= 1
  union all
  select 'mindful_month' where (select distinct_days from stats) >= 30
  union all
  select 'ten_hour_club' where (select total_seconds from stats) >= 36000
  union all
  select 'fifty_sessions' where (select session_count from stats) >= 50
) s
on conflict (user_id, milestone_code) do nothing;

-- Notifications for newly awarded milestones
insert into public.notifications (user_id, type, title, body, data, is_read, created_at)
select :'uid'::uuid, 'milestone',
  case m.code
    when 'first_session' then 'First Session unlocked'
    when 'mindful_month' then 'Mindful Month unlocked'
    when 'ten_hour_club' then '10 Hour Club unlocked'
    when 'fifty_sessions' then '50 Sessions unlocked'
    else m.code || ' unlocked'
  end,
  coalesce(m.description, 'Great work on your meditation practice!'), jsonb_build_object('code', m.code), false, now()
from public.user_meditation_milestones um
join public.meditation_milestones m on m.code = um.milestone_code
where um.user_id=:'uid'::uuid
  and um.awarded_at > now() - interval '5 minutes';

-- =====================
-- Seed: Reading sessions (25 entries, last ~60 days)
-- =====================
with days as (
  select (current_date - (g * 2))::date as d
  from generate_series(0, 48, 1) as g
  order by d desc
  limit 25
)
insert into public.user_reading_sessions (user_id, started_at, ended_at, duration_seconds, book_title, reflection, pages_read)
select
  :'uid'::uuid,
  (d + time '20:00') at time zone 'UTC',
  ((d + time '20:00') + make_interval(secs => 1200 + 60 * ((('x'||substr(md5(:'uid'||to_char(d,'YYYY-MM-DD')||'read'),1,2))::bit(8)::int % 40)))) at time zone 'UTC',
  1200 + 60 * ((('x'||substr(md5(:'uid'||to_char(d,'YYYY-MM-DD')||'read'),1,2))::bit(8)::int % 40)),
  case (('x'||substr(md5(:'uid'||to_char(d,'YYYY-MM-DD')||'book'),1,2))::bit(8)::int % 3)
    when 0 then 'Atomic Habits'
    when 1 then 'Deep Work'
    else 'Make Time'
  end,
  case when (('x'||substr(md5(:'uid'||to_char(d,'YYYY-MM-DD')||'note'),1,2))::bit(8)::int % 5) = 0 then 'Noted a key insight' else null end,
  10 + ((('x'||substr(md5(:'uid'||to_char(d,'YYYY-MM-DD')||'pages'),1,2))::bit(8)::int % 25))
from days;

-- =====================
-- Seed: Routines (morning/evening) and logs for last 14 days
-- =====================
insert into public.user_routines (user_id, routine_type, title, position)
values
  (:'uid'::uuid, 'morning', 'Morning Routine', 0),
  (:'uid'::uuid, 'evening', 'Evening Shutdown', 0)
on conflict do nothing;

-- Map routine IDs for logs
with r as (
  select id, routine_type from public.user_routines where user_id=:'uid'::uuid
), days as (
  select (current_date - g)::date as d from generate_series(0, 13, 1) g
)
insert into public.user_routine_logs (user_id, routine_id, log_date, completed)
select :'uid'::uuid, r.id, d, (
  case r.routine_type when 'morning' then ((('x'||substr(md5(:'uid'||to_char(d,'YYYY-MM-DD')||'mrn'),1,2))::bit(8)::int % 100) < 85)
                      else ((('x'||substr(md5(:'uid'||to_char(d,'YYYY-MM-DD')||'eve'),1,2))::bit(8)::int % 100) < 80)
  end)
from r cross join days
on conflict (routine_id, log_date) do update set completed = excluded.completed;

-- =====================
-- Seed: Day tasks (past 7, next 7 days)
-- =====================
with days as (
  select (current_date + (g - 7))::date as d from generate_series(0, 14, 1) g
), tasks as (
  select d, unnest(array['Plan day','Deep work block','Workout']) as title, generate_series(1,3) as idx from days
)
insert into public.day_tasks (user_id, task_date, title, time_text, done)
select :'uid'::uuid, d, title,
  case idx when 1 then '07:30' when 2 then '10:00' else '17:30' end,
  (('x'||substr(md5(:'uid'||to_char(d,'YYYY-MM-DD')||title),1,2))::bit(8)::int % 100) < case when d <= current_date then 85 else 25 end
from tasks
on conflict do nothing;

-- =====================
-- Seed: Training plan (1 plan, 1 week, 3 days, blocks, exercises)
-- =====================
insert into public.training_plans (user_id, name, description, start_date, is_active)
values (:'uid'::uuid, 'Foundation Plan', 'Push/Pull/Legs basic split', current_date - 28, true)
on conflict do nothing;

-- Use a DO block to capture IDs for weeks/days/blocks/exercises and sessions
do $$
declare
  v_uid uuid := current_setting('app.uid')::uuid;
  v_plan_id uuid;
  week1 uuid;
  day_push uuid;
  day_pull uuid;
  day_legs uuid;
  block_a uuid;
  ex record;
  sess uuid;
  ex_id uuid;
  d date;
  i int;
begin
  select id into v_plan_id from public.training_plans where user_id = v_uid order by created_at desc limit 1;

  -- Week 1
  insert into public.plan_weeks (plan_id, user_id, name, position) values (v_plan_id, v_uid, 'Week 1', 0) returning id into week1;

  -- Days (insert individually to capture IDs)
  insert into public.plan_days (plan_id, week_id, user_id, name, position)
  values (v_plan_id, week1, v_uid, 'Push', 0) returning id into day_push;

  insert into public.plan_days (plan_id, week_id, user_id, name, position)
  values (v_plan_id, week1, v_uid, 'Pull', 1) returning id into day_pull;

  insert into public.plan_days (plan_id, week_id, user_id, name, position)
  values (v_plan_id, week1, v_uid, 'Legs', 2) returning id into day_legs;

  -- Blocks
  insert into public.plan_blocks (plan_id, day_id, user_id, name, letter, position)
  values (v_plan_id, day_push, v_uid, 'Main', 'A', 0) returning id into block_a;

  -- Exercises for Push day
  insert into public.plan_exercises (plan_id, block_id, user_id, name, type, sets, reps, weight, rest, position)
  values
    (v_plan_id, block_a, v_uid, 'Bench Press', 'Lifting', '5', '5', '185', '120', 0),
    (v_plan_id, block_a, v_uid, 'Overhead Press', 'Lifting', '3', '8', '95', '90', 1),
    (v_plan_id, block_a, v_uid, 'Incline Dumbbell Press', 'Lifting', '3', '10', '60', '90', 2);

  -- Create 8 completed workout sessions across last 8 weeks using Push day exercises as template
  for i in 0..7 loop
    d := (current_date - (i*7))::date;
    insert into public.workout_sessions (user_id, plan_id, plan_day_id, started_at, ended_at, total_seconds, status)
    values (v_uid, v_plan_id, day_push, (d + time '17:00') at time zone 'UTC', (d + time '18:00') at time zone 'UTC', 3600, 'completed')
    returning id into sess;

    -- Snapshot exercises into session_exercises
    for ex in select id, name, type, position, sets, reps, weight, rest from public.plan_exercises pe where pe.plan_id=v_plan_id and pe.block_id=block_a order by position loop
      insert into public.session_exercises (session_id, plan_exercise_id, name, type, order_index, target_sets, target_reps, target_weight, target_rest_seconds)
      values (sess, ex.id, ex.name, ex.type, ex.position, nullif(ex.sets,'')::int, nullif(ex.reps,'')::int, nullif(ex.weight,'')::numeric, nullif(ex.rest,'')::int)
      returning id into ex_id;
      -- One set log for summary
      insert into public.set_logs (session_exercise_id, set_index, actual_reps, actual_weight, completed_at)
      values (ex_id, 1, coalesce(nullif(ex.reps,'')::int, 8), coalesce(nullif(ex.weight,'')::numeric, 50), (d + time '17:45') at time zone 'UTC');
    end loop;
  end loop;
end $$;

-- =====================
-- Seed: Personal Records and PR history
-- =====================
insert into public.personal_records (user_id, bench_press_1rm, squat_1rm, deadlift_1rm, overhead_press_1rm, updated_at)
values (:'uid'::uuid, 225, 315, 405, 135, now())
on conflict (user_id) do update set bench_press_1rm=excluded.bench_press_1rm, squat_1rm=excluded.squat_1rm, deadlift_1rm=excluded.deadlift_1rm, overhead_press_1rm=excluded.overhead_press_1rm, updated_at=excluded.updated_at;

insert into public.personal_record_history (user_id, lift, value, recorded_at)
values
  (:'uid'::uuid, 'bench', 205, current_date - 60),
  (:'uid'::uuid, 'bench', 215, current_date - 30),
  (:'uid'::uuid, 'bench', 225, current_date - 7),
  (:'uid'::uuid, 'squat', 295, current_date - 60),
  (:'uid'::uuid, 'squat', 305, current_date - 30),
  (:'uid'::uuid, 'squat', 315, current_date - 7),
  (:'uid'::uuid, 'deadlift', 385, current_date - 60),
  (:'uid'::uuid, 'deadlift', 395, current_date - 30),
  (:'uid'::uuid, 'deadlift', 405, current_date - 7)
on conflict do nothing;

-- Recent PR notification
insert into public.notifications (user_id, type, title, body, data, is_read)
values (:'uid'::uuid, 'pr', 'New PR achieved!', 'Bench Press 225', jsonb_build_object('lift','bench','value',225), false)
ON CONFLICT DO NOTHING;

-- =====================
-- Seed: Personal rules and checks (last 30 days, ~85% adherence)
-- =====================
insert into public.personal_rules (user_id, text)
values
  (:'uid'::uuid, 'No phone in bed'),
  (:'uid'::uuid, 'Sleep by 11pm'),
  (:'uid'::uuid, 'Protein with every meal')
on conflict do nothing;

-- Mark checks deterministically
with rules as (
  select id from public.personal_rules where user_id=:'uid'::uuid
), days as (
  select (current_date - g)::date as d from generate_series(0, 29, 1) g
)
insert into public.personal_rule_checks (rule_id, user_id, log_date, completed)
select r.id, :'uid'::uuid, d, ((('x'||substr(md5(:'uid'||r.id::text||to_char(d,'YYYY-MM-DD')),1,2))::bit(8)::int % 100) < 87)
from rules r cross join days
on conflict (rule_id, log_date) do update set completed = excluded.completed;

-- =====================
-- Seed: Challenges and rule checks
-- =====================
insert into public.user_challenges (user_id, title, description, duration_days, start_date, status, rules)
values
  (:'uid'::uuid, '30-day Meditation', 'Meditate daily for 30 days', 40, current_date - 20, 'active', array['Meditate 10+ min']::text[]),
  (:'uid'::uuid, 'No Sugar Week', 'Avoid added sugar', 70, current_date - 5, 'active', array['No added sugar']::text[]),
  (:'uid'::uuid, 'Reading Sprint', 'Read 20 min daily', 100, current_date - 20, 'completed', array['Read 20+ min']::text[])
ON CONFLICT DO NOTHING;

-- Check-ins for the first challenge (rule_index=1)
with c as (
  select id from public.user_challenges where user_id=:'uid'::uuid and title='30-day Meditation' limit 1
), days as (
  select (current_date - g)::date as d from generate_series(0, 20, 1) g
)
insert into public.user_challenge_rule_checks (challenge_id, user_id, rule_index, log_date, completed)
select c.id, :'uid'::uuid, 1, d, ((('x'||substr(md5(:'uid'||to_char(d,'YYYY-MM-DD')||'ch1'),1,2))::bit(8)::int % 100) < 90)
from c cross join days
on conflict (challenge_id, rule_index, log_date) do update set completed = excluded.completed;

-- =====================
-- Seed: General notifications (~9; 3 unread)
-- =====================
insert into public.notifications (user_id, type, title, body, data, is_read, created_at)
values
  (:'uid'::uuid, 'reminder', 'Evening shutdown', 'Wind down and review your tasks', null, false, now() - interval '1 day'),
  (:'uid'::uuid, 'reminder', 'Morning routine', 'Start strong today', null, true, now() - interval '2 days'),
  (:'uid'::uuid, 'achievement', 'Weekly streak', 'You maintained a 7-day streak', jsonb_build_object('streak',7), true, now() - interval '6 days'),
  (:'uid'::uuid, 'challenge', 'Challenge update', 'You are on track', null, false, now() - interval '3 hours'),
  (:'uid'::uuid, 'system', 'Welcome to demo', 'Enjoy exploring the app', null, true, now() - interval '10 days')
ON CONFLICT DO NOTHING;

-- =====================
-- Seed: Goals (5 goals with steps)
-- =====================
insert into public.goals (user_id, title, description, due_date, color, benefits, consequences, who_it_helps, steps)
values
  (:'uid'::uuid, 'Improve Focus', 'Reduce distractions and deepen work', current_date + 30, '#2563eb', '["Deep work","Pomodoro"]'::jsonb, '["Shallow output"]'::jsonb, '["Future self"]'::jsonb, '[{"text":"Set daily focus block","done":false},{"text":"Log distractions","done":false}]'::jsonb),
  (:'uid'::uuid, 'Strength Gains', 'Add 50 lbs to total', current_date + 60, '#16a34a', '["Health","Confidence"]'::jsonb, '["Slower progress"]'::jsonb, '["Self"]'::jsonb, '[{"text":"Train 3x weekly","done":false},{"text":"Log PRs","done":false}]'::jsonb),
  (:'uid'::uuid, 'Read More', 'Finish two books', current_date + 45, '#f59e0b', '["Knowledge"]'::jsonb, '["Stagnation"]'::jsonb, '["Career"]'::jsonb, '[{"text":"Read nightly","done":false},{"text":"Capture 5 insights","done":false}]'::jsonb),
  (:'uid'::uuid, 'Mindfulness', 'Daily 10-min meditation', current_date + 25, '#ef4444', '["Calm","Clarity"]'::jsonb, '["Stress"]'::jsonb, '["Family"]'::jsonb, '[{"text":"Morning sit","done":false},{"text":"Evening review","done":false}]'::jsonb),
  (:'uid'::uuid, 'Sleep Hygiene', 'Consistent 11pm bedtime', current_date + 21, '#a855f7', '["Recovery"]'::jsonb, '["Fatigue"]'::jsonb, '["Self"]'::jsonb, '[{"text":"No screens after 10pm","done":false}]'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================
-- Seed: Books and reading insights
-- =====================
insert into public.user_books (user_id, title, author, started_on, completed_on, total_pages)
values
  (:'uid'::uuid, 'Atomic Habits', 'James Clear', current_date - 50, current_date - 20, 320),
  (:'uid'::uuid, 'Deep Work', 'Cal Newport', current_date - 15, null, 296),
  (:'uid'::uuid, 'Make Time', 'Knapp & Zeratsky', null, null, 280)
ON CONFLICT DO NOTHING;

insert into public.user_reading_insights (user_id, book_id, insight)
select b.user_id, b.id, i.insight
from public.user_books b
join (values ('Focus on systems over goals'), ('Environment design beats willpower'), ('Protect deep work hours')) as i(insight)
  on b.user_id=:'uid'::uuid
ON CONFLICT DO NOTHING;

-- =====================
-- Seed: Distractions (apps + usage entries over last 25 days)
-- =====================
insert into public.user_distraction_apps (user_id, name, icon, color)
values
  (:'uid'::uuid, 'Instagram', '📷', '#e11d48'),
  (:'uid'::uuid, 'YouTube', '▶️', '#ef4444'),
  (:'uid'::uuid, 'News', '📰', '#0ea5e9')
ON CONFLICT DO NOTHING;

with apps as (
  select id from public.user_distraction_apps where user_id=:'uid'::uuid
), days as (
  select (current_date - g)::date as d from generate_series(0, 24, 1) g
)
insert into public.user_distraction_entries (user_id, app_id, usage_date, minutes)
select :'uid'::uuid, a.id, d, 5 + ((('x'||substr(md5(:'uid'||a.id::text||to_char(d,'YYYY-MM-DD')),1,2))::bit(8)::int % 40))
from apps a cross join days d
ON CONFLICT (user_id, app_id, usage_date) DO UPDATE SET minutes = excluded.minutes;

-- =====================
-- Seed: Activity goals (defaults if absent)
-- =====================
insert into public.activity_goals (user_id, activity, target_minutes)
values
  (:'uid'::uuid, 'reading', 45),
  (:'uid'::uuid, 'meditation', 10),
  (:'uid'::uuid, 'screen_time', 120),
  (:'uid'::uuid, 'workouts', 30)
ON CONFLICT (user_id, activity) DO UPDATE SET target_minutes = excluded.target_minutes;

-- Done
