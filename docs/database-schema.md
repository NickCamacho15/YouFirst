# YouFirst Database Schema Documentation

This document describes the database structure for the YouFirst habit tracker app, a personal excellence platform built on Supabase.

## Overview

The database follows a user-centered design where all data belongs to specific users, with Row-Level Security (RLS) ensuring users can only access their own data. The schema supports:

- User profiles
- Habit tracking with daily logs
- Goal setting with progress tracking

## Table Structure

### 1. users

Core user profile table linked to Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key, references auth.users(id) |
| email | text | User's email address |
| display_name | text | User's display name |
| bio | text | Optional user biography |
| profile_image_url | text | Optional URL to profile image |
| created_at | timestamptz | Account creation timestamp |

**Notes**:
- Created automatically via trigger when a new auth user is registered
- Can also be created/updated by client via upsert

### 2. habits

Tracks user habits that can be logged daily.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References users(id) |
| name | text | Habit name |
| description | text | Optional description |
| is_active | boolean | Whether habit is currently active |
| target_per_week | int | Weekly target frequency (default: 7) |
| created_at | timestamptz | Creation timestamp |

**Indexes**:
- `habits_user_id_idx` on `user_id` for faster user-specific queries

### 3. habit_logs

Records daily completion of habits.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| habit_id | uuid | References habits(id) |
| user_id | uuid | References users(id) |
| log_date | date | Date of the habit log |
| status | text | 'done' or 'skipped' |
| note | text | Optional note for the log |
| created_at | timestamptz | Creation timestamp |

**Indexes**:
- `habit_logs_user_date_idx` on `(user_id, log_date)` for date range queries
- `habit_logs_habit_date_idx` on `(habit_id, log_date)` for habit history

**Constraints**:
- Unique constraint on `(habit_id, log_date)` prevents multiple logs for same habit/day

### 4. goals

Tracks user's numeric goals with target values.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References users(id) |
| title | text | Goal title |
| target | numeric | Target value to achieve |
| unit | text | Optional unit of measurement |
| due_date | date | Optional target completion date |
| created_at | timestamptz | Creation timestamp |

**Indexes**:
- `goals_user_id_idx` on `user_id` for faster user-specific queries

### 5. goal_progress

Records progress entries toward goals.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| goal_id | uuid | References goals(id) |
| user_id | uuid | References users(id) |
| entry_date | date | Date of the progress entry |
| value | numeric | Value recorded for this entry |
| note | text | Optional note for the entry |
| created_at | timestamptz | Creation timestamp |

**Indexes**:
- `goal_progress_user_date_idx` on `(user_id, entry_date)` for date range queries

**Constraints**:
- Unique constraint on `(goal_id, entry_date)` prevents multiple entries for same goal/day

## Row-Level Security (RLS)

All tables have Row-Level Security enabled to ensure users can only access their own data.

### users Table Policies

| Policy | Description |
|--------|-------------|
| users_select_own | Users can only select their own row (id = auth.uid()) |
| users_insert_own | Users can only insert their own row (id = auth.uid()) |
| users_update_own | Users can only update their own row (id = auth.uid()) |

### habits Table Policies

| Policy | Description |
|--------|-------------|
| habits_select_own | Users can only select habits where user_id = auth.uid() |
| habits_cud_own | Users can create/update/delete habits where user_id = auth.uid() |

### habit_logs Table Policies

| Policy | Description |
|--------|-------------|
| habit_logs_select_own | Users can only select logs where user_id = auth.uid() |
| habit_logs_insert_own | Users can insert logs where user_id = auth.uid() AND the habit belongs to them |
| habit_logs_update_own | Users can update logs where user_id = auth.uid() AND the habit belongs to them |

### goals Table Policies

| Policy | Description |
|--------|-------------|
| goals_select_own | Users can only select goals where user_id = auth.uid() |
| goals_cud_own | Users can create/update/delete goals where user_id = auth.uid() |

### goal_progress Table Policies

| Policy | Description |
|--------|-------------|
| goal_prog_select_own | Users can only select progress entries where user_id = auth.uid() |
| goal_prog_cud_own | Users can create/update/delete progress where user_id = auth.uid() AND the goal belongs to them |

### 6. personal_records

Stores a user's 1RM personal records for key lifts.

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | Primary key, references users(id) |
| bench_press_1rm | numeric | 1RM Bench Press in lbs (nullable) |
| squat_1rm | numeric | 1RM Squat in lbs (nullable) |
| deadlift_1rm | numeric | 1RM Deadlift in lbs (nullable) |
| overhead_press_1rm | numeric | 1RM Overhead Press in lbs (nullable) |
| updated_at | timestamptz | Last update timestamp (default now()) |

**Indexes/Constraints**:
- Primary key on `(user_id)` ensures one row per user

**RLS Policies**:
| Policy | Description |
|--------|-------------|
| prs_select_own | Users can select where user_id = auth.uid() |
| prs_upsert_own | Users can insert/update their own row (user_id = auth.uid()) |

Example SQL:

```sql
create table if not exists public.personal_records (
  user_id uuid primary key references public.users(id) on delete cascade,
  bench_press_1rm numeric,
  squat_1rm numeric,
  deadlift_1rm numeric,
  overhead_press_1rm numeric,
  updated_at timestamptz not null default now()
);

alter table public.personal_records enable row level security;

create policy prs_select_own on public.personal_records
  for select using (auth.uid() = user_id);

create policy prs_upsert_own on public.personal_records
  for insert with check (auth.uid() = user_id);

create policy prs_update_own on public.personal_records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Optional: convenience trigger to auto-set user_id on insert
create or replace function public.set_prs_user_id()
returns trigger language plpgsql as $$
begin
  if (new.user_id is null) then
    new.user_id := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_set_prs_user_id on public.personal_records;
create trigger trg_set_prs_user_id before insert or update on public.personal_records
for each row execute function public.set_prs_user_id();
```

## Authentication & User Creation

1. Users register through Supabase Auth (email/password)
2. Email confirmation is disabled for immediate login
3. On successful registration, a database trigger automatically:
   - Creates a corresponding row in the `public.users` table
   - Sets `display_name` from metadata or email username
4. The client also performs an upsert to the `public.users` table on login/registration

## Trigger Functions

### handle_new_user()

```sql
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
```

This trigger ensures a user record exists in the `users` table whenever a new auth user is created.

## Entity Relationship Diagram

```
┌───────────┐       ┌───────────┐       ┌───────────────┐
│  users    │       │  habits   │       │  habit_logs   │
├───────────┤       ├───────────┤       ├───────────────┤
│ id        │◄──┐   │ id        │◄─┐    │ id            │
│ email     │   │   │ user_id   │─┘│    │ habit_id      │───┐
│ display_  │   │   │ name      │   │    │ user_id       │─┐ │
│   name    │   │   │ description│   └───►│ log_date     │ │ │
│ bio       │   │   │ is_active │       │ status        │ │ │
│ profile_  │   │   │ target_per│       │ note          │ │ │
│  image_url│   │   │   _week   │       │ created_at    │ │ │
│ created_at│   │   │ created_at│       └───────────────┘ │ │
└───────────┘   │   └───────────┘                         │ │
                │                                         │ │
                │   ┌───────────┐       ┌───────────────┐ │ │
                │   │  goals    │       │goal_progress  │ │ │
                │   ├───────────┤       ├───────────────┤ │ │
                │   │ id        │◄──┐   │ id            │ │ │
                └───►│ user_id   │   │   │ goal_id       │─┘ │
                    │ title     │   │   │ user_id       │───┘
                    │ target    │   └───►│ entry_date   │
                    │ unit      │       │ value         │
                    │ due_date  │       │ note          │
                    │ created_at│       │ created_at    │
                    └───────────┘       └───────────────┘
```

## Performance Considerations

1. All tables have appropriate indexes on foreign keys and commonly queried columns
2. All tables include created_at timestamps for sorting and auditing
3. Composite indexes support common query patterns (e.g., finding all habits logged on a specific date)
4. UUID primary keys ensure distributed insertion without conflicts

## Security

1. All tables have Row-Level Security enabled
2. Users can only access and modify their own data
3. Foreign key relationships are protected (users can't add logs for habits they don't own)
4. The auth trigger runs with `security definer` privileges to ensure it can create user records

## Client Integration

To use this database from your app:

1. Ensure authentication is set up with Supabase JS client
2. User registration/login creates necessary user records automatically
3. All subsequent queries should use the authenticated Supabase client to enforce RLS
