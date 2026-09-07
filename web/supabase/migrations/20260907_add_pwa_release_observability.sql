-- Mostra.Space PWA 10
-- Durable dispatcher heartbeats for release readiness and operational diagnosis.

begin;

create table if not exists public.pwa_push_dispatch_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_source text not null,
  status text not null default 'running',
  summary jsonb not null default '{}'::jsonb,
  error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  constraint pwa_push_dispatch_runs_trigger_check
    check (trigger_source in ('cron', 'admin')),
  constraint pwa_push_dispatch_runs_status_check
    check (status in ('running', 'succeeded', 'failed')),
  constraint pwa_push_dispatch_runs_summary_check
    check (jsonb_typeof(summary) = 'object'),
  constraint pwa_push_dispatch_runs_duration_check
    check (duration_ms is null or duration_ms >= 0),
  constraint pwa_push_dispatch_runs_completion_check
    check (
      (status = 'running' and completed_at is null)
      or (status in ('succeeded', 'failed') and completed_at is not null)
    )
);

create index if not exists pwa_push_dispatch_runs_started_idx
  on public.pwa_push_dispatch_runs (started_at desc);

create index if not exists pwa_push_dispatch_runs_source_started_idx
  on public.pwa_push_dispatch_runs (trigger_source, started_at desc);

alter table public.pwa_push_dispatch_runs enable row level security;
revoke all on table public.pwa_push_dispatch_runs from anon, authenticated;
grant select, insert, update, delete on table public.pwa_push_dispatch_runs
  to service_role;

create or replace function public.pwa_prune_push_dispatch_runs(
  p_keep_days integer default 30
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  delete from public.pwa_push_dispatch_runs
  where status <> 'running'
    and started_at < now() - make_interval(days => greatest(7, least(coalesce(p_keep_days, 30), 365)));

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.pwa_prune_push_dispatch_runs(integer)
  from public, anon, authenticated;
grant execute on function public.pwa_prune_push_dispatch_runs(integer)
  to service_role;

commit;
