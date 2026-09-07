-- Mostra.Space PWA 8
-- Badge counts, administrative audit trail and monitoring indexes.

begin;

create index if not exists pwa_push_deliveries_created_status_idx
  on public.pwa_push_deliveries (created_at desc, status);

create index if not exists pwa_push_subscriptions_updated_active_idx
  on public.pwa_push_subscriptions (updated_at desc, active);

create table if not exists public.pwa_push_admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  subscription_id uuid
    references public.pwa_push_subscriptions(id) on delete set null,
  delivery_id uuid
    references public.pwa_push_deliveries(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint pwa_push_admin_actions_action_check
    check (
      action in (
        'dispatch_run',
        'delivery_requeued',
        'subscription_disabled'
      )
    ),
  constraint pwa_push_admin_actions_metadata_check
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists pwa_push_admin_actions_created_idx
  on public.pwa_push_admin_actions (created_at desc);

alter table public.pwa_push_admin_actions enable row level security;
revoke all on table public.pwa_push_admin_actions from anon, authenticated;

-- Used by the dispatcher to attach the current unread total to each push. The
-- payload contains only the count, never notification or message content.
create or replace function public.pwa_unread_notification_counts(
  p_user_ids uuid[]
)
returns table (
  user_id uuid,
  unread_count bigint
)
language sql
security definer
stable
strict
set search_path = public, pg_temp
as $$
  select
    notification.user_id,
    count(*)::bigint as unread_count
  from public.account_notifications as notification
  where notification.user_id = any(p_user_ids)
    and notification.read_at is null
    and notification.scheduled_for <= now()
  group by notification.user_id;
$$;

revoke all on function public.pwa_unread_notification_counts(uuid[])
  from public, anon, authenticated;
grant execute on function public.pwa_unread_notification_counts(uuid[])
  to service_role;

commit;
