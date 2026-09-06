-- Mostra.Space PWA 7
-- Durable Web Push delivery queue, preference categories and safe claiming.

begin;

alter table public.account_notifications
  add column if not exists push_category text;

alter table public.account_notifications
  drop constraint if exists account_notifications_push_category_check;
alter table public.account_notifications
  add constraint account_notifications_push_category_check
  check (
    push_category is null
    or push_category in (
      'messages',
      'followers',
      'favorites',
      'publications',
      'invitations',
      'events',
      'event_reminders',
      'gallery_updates',
      'platform_updates'
    )
  );

-- Preserve existing in-app notifications while assigning them to the new push
-- preference groups. New writers set the category explicitly.
update public.account_notifications
set push_category = case
  when type = 'gallery_published' then 'gallery_updates'
  when type = 'status_published' then 'publications'
  when type in ('event_3_days_before', 'event_30_minutes_before') then 'event_reminders'
  when type = 'event_created' and title = 'Invito evento' then 'invitations'
  when type = 'event_created' then 'events'
  else 'platform_updates'
end
where push_category is null;

create index if not exists account_notifications_push_due_idx
  on public.account_notifications (scheduled_for, id)
  where read_at is null;

alter table public.pwa_push_deliveries
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists claimed_at timestamptz,
  add column if not exists claim_token uuid,
  add column if not exists response_status integer;

alter table public.pwa_push_deliveries
  drop constraint if exists pwa_push_deliveries_status_check;
alter table public.pwa_push_deliveries
  add constraint pwa_push_deliveries_status_check
  check (status in ('pending', 'processing', 'sent', 'failed', 'skipped'));

drop index if exists public.pwa_push_deliveries_pending_idx;
create index pwa_push_deliveries_pending_idx
  on public.pwa_push_deliveries (next_attempt_at, created_at)
  where status = 'pending';

create index if not exists pwa_push_deliveries_stale_processing_idx
  on public.pwa_push_deliveries (claimed_at)
  where status = 'processing';

create or replace function public.pwa_queue_push_deliveries(
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  queued_count integer;
begin
  with candidates as (
    select
      notification.id as notification_id,
      subscription.id as subscription_id
    from public.account_notifications as notification
    join public.pwa_push_subscriptions as subscription
      on subscription.user_id = notification.user_id
    where notification.read_at is null
      and notification.scheduled_for is not null
      and notification.scheduled_for <= now()
      -- Do not flood a newly subscribed device with historical notifications.
      -- Future reminders created before subscription remain eligible.
      and notification.scheduled_for >= subscription.created_at
      and subscription.active = true
      and (subscription.expires_at is null or subscription.expires_at > now())
      and not exists (
        select 1
        from public.pwa_push_deliveries as existing_delivery
        where existing_delivery.notification_id = notification.id
          and existing_delivery.subscription_id = subscription.id
      )
    order by notification.scheduled_for, notification.id, subscription.id
    limit greatest(1, least(coalesce(p_limit, 500), 2000))
  ), inserted as (
    insert into public.pwa_push_deliveries (
      notification_id,
      subscription_id,
      status,
      next_attempt_at
    )
    select notification_id, subscription_id, 'pending', now()
    from candidates
    on conflict (notification_id, subscription_id) do nothing
    returning 1
  )
  select count(*)::integer into queued_count from inserted;

  return queued_count;
end;
$$;

create or replace function public.pwa_claim_push_deliveries(
  p_limit integer,
  p_claim_token uuid
)
returns table (
  delivery_id uuid,
  notification_id uuid,
  subscription_id uuid,
  attempt_count integer
)
language sql
security definer
strict
set search_path = public, pg_temp
as $$
  with claimable as (
    select delivery.id
    from public.pwa_push_deliveries as delivery
    where (
      delivery.status = 'pending'
      and delivery.next_attempt_at <= now()
      and delivery.attempt_count < 5
    ) or (
      delivery.status = 'processing'
      and delivery.claimed_at < now() - interval '10 minutes'
      and delivery.attempt_count <= 5
    )
    order by delivery.next_attempt_at, delivery.created_at
    limit greatest(1, least(coalesce(p_limit, 50), 200))
    for update of delivery skip locked
  )
  update public.pwa_push_deliveries as delivery
  set
    status = 'processing',
    attempt_count = delivery.attempt_count + 1,
    last_attempt_at = now(),
    claimed_at = now(),
    claim_token = p_claim_token
  from claimable
  where delivery.id = claimable.id
  returning
    delivery.id,
    delivery.notification_id,
    delivery.subscription_id,
    delivery.attempt_count;
$$;

create or replace function public.pwa_record_push_subscription_failure(
  p_subscription_id uuid,
  p_error_code text,
  p_disable boolean default false
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.pwa_push_subscriptions
  set
    failure_count = failure_count + 1,
    last_error_code = left(coalesce(p_error_code, 'UNKNOWN_ERROR'), 120),
    last_error_at = now(),
    active = case when p_disable then false else active end,
    disabled_at = case when p_disable then now() else disabled_at end
  where id = p_subscription_id;
$$;

revoke all on function public.pwa_queue_push_deliveries(integer)
  from public, anon, authenticated;
revoke all on function public.pwa_claim_push_deliveries(integer, uuid)
  from public, anon, authenticated;
revoke all on function public.pwa_record_push_subscription_failure(uuid, text, boolean)
  from public, anon, authenticated;

grant execute on function public.pwa_queue_push_deliveries(integer)
  to service_role;
grant execute on function public.pwa_claim_push_deliveries(integer, uuid)
  to service_role;
grant execute on function public.pwa_record_push_subscription_failure(uuid, text, boolean)
  to service_role;

commit;
