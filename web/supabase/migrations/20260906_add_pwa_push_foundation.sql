-- Mostra.Space PWA 4
-- Additive database foundation for future Web Push delivery.
-- This migration does not send notifications and does not change the existing
-- account_notifications flow.

begin;

create table if not exists public.pwa_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  content_encoding text not null default 'aes128gcm',
  device_label text,
  user_agent text,
  locale text,
  timezone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz,
  disabled_at timestamptz,
  failure_count integer not null default 0,
  last_error_code text,
  last_error_at timestamptz,
  constraint pwa_push_subscriptions_endpoint_key unique (endpoint),
  constraint pwa_push_subscriptions_content_encoding_check
    check (content_encoding in ('aes128gcm', 'aesgcm')),
  constraint pwa_push_subscriptions_failure_count_check
    check (failure_count >= 0),
  constraint pwa_push_subscriptions_active_state_check
    check (
      (active and disabled_at is null)
      or (not active and disabled_at is not null)
    )
);

create index if not exists pwa_push_subscriptions_user_active_idx
  on public.pwa_push_subscriptions (user_id, active, updated_at desc);

create table if not exists public.pwa_push_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default false,
  messages_enabled boolean not null default true,
  followers_enabled boolean not null default true,
  favorites_enabled boolean not null default true,
  publications_enabled boolean not null default true,
  invitations_enabled boolean not null default true,
  events_enabled boolean not null default true,
  event_reminders_enabled boolean not null default true,
  gallery_updates_enabled boolean not null default true,
  platform_updates_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pwa_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null
    references public.account_notifications(id) on delete cascade,
  subscription_id uuid not null
    references public.pwa_push_subscriptions(id) on delete cascade,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  last_error_code text,
  constraint pwa_push_deliveries_notification_subscription_key
    unique (notification_id, subscription_id),
  constraint pwa_push_deliveries_status_check
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  constraint pwa_push_deliveries_attempt_count_check
    check (attempt_count >= 0)
);

create index if not exists pwa_push_deliveries_pending_idx
  on public.pwa_push_deliveries (status, created_at)
  where status = 'pending';

create index if not exists pwa_push_deliveries_subscription_idx
  on public.pwa_push_deliveries (subscription_id, created_at desc);

create or replace function public.pwa_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pwa_push_subscriptions_set_updated_at
  on public.pwa_push_subscriptions;
create trigger pwa_push_subscriptions_set_updated_at
before update on public.pwa_push_subscriptions
for each row execute function public.pwa_set_updated_at();

drop trigger if exists pwa_push_preferences_set_updated_at
  on public.pwa_push_preferences;
create trigger pwa_push_preferences_set_updated_at
before update on public.pwa_push_preferences
for each row execute function public.pwa_set_updated_at();

drop trigger if exists pwa_push_deliveries_set_updated_at
  on public.pwa_push_deliveries;
create trigger pwa_push_deliveries_set_updated_at
before update on public.pwa_push_deliveries
for each row execute function public.pwa_set_updated_at();

alter table public.pwa_push_subscriptions enable row level security;
alter table public.pwa_push_preferences enable row level security;
alter table public.pwa_push_deliveries enable row level security;

drop policy if exists "Users can read own PWA push subscriptions"
  on public.pwa_push_subscriptions;
create policy "Users can read own PWA push subscriptions"
on public.pwa_push_subscriptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own PWA push subscriptions"
  on public.pwa_push_subscriptions;
create policy "Users can create own PWA push subscriptions"
on public.pwa_push_subscriptions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own PWA push subscriptions"
  on public.pwa_push_subscriptions;
create policy "Users can update own PWA push subscriptions"
on public.pwa_push_subscriptions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own PWA push subscriptions"
  on public.pwa_push_subscriptions;
create policy "Users can delete own PWA push subscriptions"
on public.pwa_push_subscriptions
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own PWA push preferences"
  on public.pwa_push_preferences;
create policy "Users can read own PWA push preferences"
on public.pwa_push_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own PWA push preferences"
  on public.pwa_push_preferences;
create policy "Users can create own PWA push preferences"
on public.pwa_push_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own PWA push preferences"
  on public.pwa_push_preferences;
create policy "Users can update own PWA push preferences"
on public.pwa_push_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own PWA push preferences"
  on public.pwa_push_preferences;
create policy "Users can delete own PWA push preferences"
on public.pwa_push_preferences
for delete
to authenticated
using (auth.uid() = user_id);

-- Delivery attempts are backend-only. RLS is enabled and there are no client
-- policies. Supabase's service role remains able to manage these rows.
revoke all on table public.pwa_push_deliveries from anon, authenticated;

grant select, insert, update, delete
  on table public.pwa_push_subscriptions to authenticated;
grant select, insert, update, delete
  on table public.pwa_push_preferences to authenticated;

commit;
