# Supabase Setup Guide for YouFirst

This guide explains how to set up Supabase for the YouFirst app, including authentication, database configuration, and necessary settings.

## Prerequisites

- A Supabase account
- Access to your Supabase project
- Basic SQL knowledge

## Authentication Setup

### 1. Configure Email Auth Provider

1. Navigate to **Authentication → Providers → Email/Password**
2. **Important:** Disable "Email confirmations" to allow immediate login after registration
3. Save your changes

### 2. User Management

- Users are automatically created in Supabase Auth when they register
- A database trigger creates corresponding rows in `public.users` table
- You can view/manage users in **Authentication → Users**

## Database Setup

### 1. Execute Schema Creation Script

Copy and run the following SQL in Supabase's SQL Editor to set up the complete database schema:

```sql
-- Extensions
create extension if not exists "pgcrypto";

-- USERS
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  bio text,
  profile_image_url text,
  created_at timestamptz default now()
);
alter table public.users enable row level security;

-- Ensure users row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- READING_SESSIONS (Mind → Reading)
create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds int not null check (duration_seconds >= 0),
  book_title text,
  reflection text,
  pages_read int check (pages_read >= 0),
  created_at timestamptz default now()
);
create index if not exists reading_sessions_user_started_idx on public.reading_sessions(user_id, started_at desc);
alter table public.reading_sessions enable row level security;

-- HABITS
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  target_per_week int not null default 7,
  created_at timestamptz default now()
);
create index if not exists habits_user_id_idx on public.habits(user_id);
alter table public.habits enable row level security;

-- HABIT_LOGS
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  log_date date not null,
  status text not null check (status in ('done','skipped')),
  note text,
  created_at timestamptz default now(),
  unique (habit_id, log_date)
);
create index if not exists habit_logs_user_date_idx on public.habit_logs(user_id, log_date);
create index if not exists habit_logs_habit_date_idx on public.habit_logs(habit_id, log_date);
alter table public.habit_logs enable row level security;

-- GOALS
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  target numeric,
  unit text,
  due_date date,
  created_at timestamptz default now()
);
create index if not exists goals_user_id_idx on public.goals(user_id);
alter table public.goals enable row level security;

-- GOAL_PROGRESS
create table if not exists public.goal_progress (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  entry_date date not null,
  value numeric not null,
  note text,
  created_at timestamptz default now(),
  unique (goal_id, entry_date)
);
create index if not exists goal_progress_user_date_idx on public.goal_progress(user_id, entry_date);
alter table public.goal_progress enable row level security;
```

### 2. Add Row Level Security (RLS) Policies

Run this SQL to set up RLS policies that ensure users can only access their own data:

```sql
-- USERS policies
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated using (auth.uid() = id);

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated using (auth.uid() = id);

-- HABITS policies
drop policy if exists habits_select_own on public.habits;
create policy habits_select_own on public.habits
  for select to authenticated using (user_id = auth.uid());

drop policy if exists habits_cud_own on public.habits;
create policy habits_cud_own on public.habits
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- HABIT_LOGS policies
drop policy if exists habit_logs_select_own on public.habit_logs;
create policy habit_logs_select_own on public.habit_logs
  for select to authenticated using (user_id = auth.uid());

drop policy if exists habit_logs_insert_own on public.habit_logs;
create policy habit_logs_insert_own on public.habit_logs
  for insert to authenticated with check (
    user_id = auth.uid() and
    exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid())
  );

drop policy if exists habit_logs_update_own on public.habit_logs;
create policy habit_logs_update_own on public.habit_logs
  for update to authenticated using (
    user_id = auth.uid() and
    exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid())
  ) with check (
    user_id = auth.uid() and
    exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid())
  );

-- READING_SESSIONS policies
drop policy if exists reading_sessions_select_own on public.reading_sessions;
create policy reading_sessions_select_own on public.reading_sessions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists reading_sessions_cud_own on public.reading_sessions;
create policy reading_sessions_cud_own on public.reading_sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- GOALS policies
drop policy if exists goals_select_own on public.goals;
create policy goals_select_own on public.goals
  for select to authenticated using (user_id = auth.uid());

drop policy if exists goals_cud_own on public.goals;
create policy goals_cud_own on public.goals
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- GOAL_PROGRESS policies
drop policy if exists goal_prog_select_own on public.goal_progress;
create policy goal_prog_select_own on public.goal_progress
  for select to authenticated using (user_id = auth.uid());

drop policy if exists goal_prog_cud_own on public.goal_progress;
create policy goal_prog_cud_own on public.goal_progress
  for all to authenticated using (
    user_id = auth.uid() and
    exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
  ) with check (
    user_id = auth.uid() and
    exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
  );
```

## Client Integration

### 1. Update Environment Variables

Ensure your mobile app has the correct Supabase URL and anon key in `mobile/app.json`:

```json
{
  "expo": {
    // ...other expo config
    "extra": {
      "expoPublicSupabaseUrl": "YOUR_SUPABASE_URL",
      "expoPublicSupabaseAnonKey": "YOUR_SUPABASE_ANON_KEY"
    }
  }
}
```

### 2. Testing the Setup

1. Register a new user in the app
2. Verify a row is automatically created in `public.users`
3. Test creating a habit and logging it:

```sql
-- Check if user exists in public.users
SELECT * FROM public.users WHERE email = 'test@example.com';

-- Create a test habit (run as the authenticated user)
INSERT INTO public.habits (user_id, name, description)
VALUES (auth.uid(), 'Daily Exercise', '30 minutes minimum');

-- Log the habit for today
INSERT INTO public.habit_logs (habit_id, user_id, log_date, status)
SELECT 
  h.id, 
  auth.uid(), 
  CURRENT_DATE, 
  'done'
FROM 
  public.habits h 
WHERE 
  h.user_id = auth.uid() AND h.name = 'Daily Exercise';
```

## Troubleshooting

### Common Issues

1. **"Email not confirmed" error during login**
   - Solution: Ensure "Email confirmations" is turned off in Authentication → Providers

2. **Unable to insert into tables**
   - Check that RLS policies are correctly set up
   - Ensure the user is authenticated
   - Verify foreign key relationships (user_id must match auth.uid())

3. **Trigger not creating user row**
   - Check the trigger function for errors
   - Manually run an insert to test permissions

### Checking RLS Policies

To verify RLS policies are correctly set up:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM
  pg_policies
WHERE
  schemaname = 'public'
ORDER BY
  tablename,
  policyname;
```

## Data Backup and Migration

For production, consider setting up regular database backups:

1. Navigate to **Database → Backups** in Supabase
2. Enable scheduled backups for your production environment
3. For migrations, use SQL scripts in version control

## Security Best Practices

1. Never expose Supabase service role key in client-side code
2. Always use the anon key with RLS for client access
3. Test RLS policies thoroughly to ensure data isolation
4. Implement proper error handling in the client for database operations

## Next Steps

- Set up real-time subscriptions for collaborative features
- Create database functions for complex operations
- Implement server-side validations with database triggers
- Consider adding full-text search capabilities

## Challenges (40–100 Day) Schema

The app's "Start New Challenge" feature needs persistent storage so users can resume progress across devices. The production database already contains legacy integer-based tables named `public.challenges` and `public.challenge_logs`. To avoid conflicts and align with Supabase Auth UUID users, create new tables with UUID keys:

```sql
-- USER_CHALLENGES
create table if not exists public.user_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  duration_days int not null check (duration_days in (40,70,100)),
  start_date date not null default current_date,
  share_code text unique,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  rules text[] not null default '{}',
  created_at timestamptz default now()
);
create index if not exists user_challenges_user_id_idx on public.user_challenges(user_id);
alter table public.user_challenges enable row level security;

-- DAILY RULE CHECKS (per-rule, per-day)
create table if not exists public.user_challenge_rule_checks (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.user_challenges(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rule_index int not null,              -- 0-based index into challenges.rules
  log_date date not null,
  completed boolean not null default true,
  created_at timestamptz default now(),
  unique (challenge_id, rule_index, log_date)
);
create index if not exists ucrc_user_date_idx on public.user_challenge_rule_checks(user_id, log_date);
alter table public.user_challenge_rule_checks enable row level security;
```

RLS policies ensuring users can access only their own data:

```sql
-- USER_CHALLENGES policies
drop policy if exists user_challenges_select_own on public.user_challenges;
create policy user_challenges_select_own on public.user_challenges
  for select to authenticated using (user_id = auth.uid());

drop policy if exists user_challenges_cud_own on public.user_challenges;
create policy user_challenges_cud_own on public.user_challenges
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- USER_CHALLENGE_RULE_CHECKS policies
drop policy if exists ucrc_select_own on public.user_challenge_rule_checks;
create policy ucrc_select_own on public.user_challenge_rule_checks
  for select to authenticated using (user_id = auth.uid());

drop policy if exists ucrc_cud_own on public.user_challenge_rule_checks;
create policy ucrc_cud_own on public.user_challenge_rule_checks
  for all to authenticated using (
    user_id = auth.uid() and exists (
      select 1 from public.user_challenges c where c.id = challenge_id and c.user_id = auth.uid()
    )
  ) with check (
    user_id = auth.uid() and exists (
      select 1 from public.user_challenges c where c.id = challenge_id and c.user_id = auth.uid()
    )
  );
```

Notes:

- `rules` is a `text[]` storing the short rule labels typed in the UI. If you later need rich rules, introduce a `user_challenge_rules` table and migrate.
- We store per-rule daily checks in `user_challenge_rule_checks` to power the checkbox list and progress calendar.
- `share_code` is optional and can be used for a short human-friendly identifier.
- Legacy tables `public.challenges` and `public.challenge_logs` may remain for other features. Do not drop or rename them; the app will read/write only the `user_*` tables above.
