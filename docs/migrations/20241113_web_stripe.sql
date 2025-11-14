-- Subscriptions + entitlements schema for web Stripe integration

create extension if not exists pgcrypto;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  plan_id text not null default 'pending',
  price_id text not null default 'pending',
  status text not null default 'incomplete' check (status in ('trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid')),
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_stripe_customer_idx on public.subscriptions(stripe_customer_id);
create index if not exists subscriptions_stripe_sub_idx on public.subscriptions(stripe_subscription_id);

create or replace function public.subscriptions_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.subscriptions_touch_updated_at();

alter table public.subscriptions enable row level security;

drop policy if exists user_can_read_own_subscription on public.subscriptions;
create policy user_can_read_own_subscription
on public.subscriptions
for select
using (auth.uid() = user_id);

drop policy if exists user_can_manage_own_subscription on public.subscriptions;
create policy user_can_manage_own_subscription
on public.subscriptions
for insert
with check (auth.uid() = user_id);

drop policy if exists service_role_full_access_subscriptions on public.subscriptions;
create policy service_role_full_access_subscriptions
on public.subscriptions
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  created_at timestamptz default now(),
  payload jsonb not null
);

alter table public.stripe_events enable row level security;

drop policy if exists service_role_manage_events on public.stripe_events;
create policy service_role_manage_events
on public.stripe_events
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop view if exists public.entitlements;
create view public.entitlements as
select
  user_id,
  (status in ('trialing','active') and (current_period_end is null or current_period_end > now())) as is_active
from public.subscriptions;

grant select on public.entitlements to authenticated;


