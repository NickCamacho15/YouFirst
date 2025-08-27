-- Notifications schema for mobile app
-- Idempotent and RLS-safe

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, is_read) where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_cud_own on public.notifications;
create policy notifications_cud_own on public.notifications
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());


