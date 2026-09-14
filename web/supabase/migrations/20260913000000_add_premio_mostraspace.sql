-- Premio Mostra.Space. Additive migration; run before deploying the application.
-- Dates are exclusive boundaries stored in UTC; the public calendar uses Europe/Rome.
begin;

create table if not exists public.premio_editions (
  id uuid primary key default gen_random_uuid(), year integer not null unique,
  title text not null, published boolean not null default false, paused boolean not null default false,
  applications_open_at timestamptz not null, applications_close_at timestamptz not null,
  social_campaign_at timestamptz not null, social_close_at timestamptz not null, ceremony_at timestamptz not null,
  organizer text not null default 'Barattolo XR Lab', jury_text text not null default '',
  rules_text text not null default '', rules_version text not null default '2026-v1',
  rules_approved boolean not null default false, event_url text not null default '',
  results_published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (applications_open_at < applications_close_at and applications_close_at <= social_campaign_at
    and social_campaign_at < social_close_at and social_close_at < ceremony_at),
  check (not published or (rules_approved and length(rules_text) >= 200 and length(jury_text) >= 5))
);
insert into public.premio_editions(year,title,applications_open_at,applications_close_at,social_campaign_at,social_close_at,ceremony_at)
values(2026,'Premio Mostra.Space 2026','2026-10-06T16:00:00Z','2026-11-15T23:00:00Z',
  '2026-11-19T08:00:00Z','2026-11-29T23:00:00Z','2026-12-03T18:00:00Z') on conflict(year) do nothing;

create table if not exists public.premio_entries (
  id uuid primary key default gen_random_uuid(), edition_id uuid not null references public.premio_editions(id),
  artist_id uuid not null references public.profiles(id) on delete cascade,
  gallery_id uuid references public.galleries(id) on delete set null,
  slug text not null, artist_name text not null default '', statement text not null default '',
  status text not null default 'draft' check(status in ('draft','submitted','admitted','excluded','withdrawn')),
  version integer not null default 0, submitted_at timestamptz, accepted_rules_version text,
  declarations_accepted_at timestamptz, public_note text not null default '',
  social_count integer check(social_count >= 0), social_snapshot_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(edition_id,artist_id), unique(edition_id,slug), unique(edition_id,gallery_id)
);
create table if not exists public.premio_snapshots (
  id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.premio_entries(id) on delete cascade,
  version integer not null, manifest jsonb not null, assets jsonb not null default '[]', digest text not null,
  created_at timestamptz not null default now(), unique(entry_id,version)
);
create table if not exists public.premio_reviews (
  entry_id uuid not null references public.premio_entries(id) on delete cascade,
  reviewer_name text not null, actor_id uuid references public.profiles(id) on delete set null,
  quality integer not null check(quality between 0 and 100), concept integer not null check(concept between 0 and 100),
  curation integer not null check(curation between 0 and 100), texts integer not null check(texts between 0 and 100),
  space integer not null check(space between 0 and 100), notes text not null default '',
  score numeric generated always as (quality * 0.30 + concept * 0.20 + curation * 0.20 + texts * 0.15 + space * 0.15) stored,
  updated_at timestamptz not null default now(), primary key(entry_id,reviewer_name)
);
create table if not exists public.premio_audit_log (
  id bigint generated always as identity primary key, edition_id uuid references public.premio_editions(id),
  entry_id uuid references public.premio_entries(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
-- Intervals preserve the actual cut-off, even if the finalisation job runs later.
create table if not exists public.premio_follow_periods (
  id bigint generated always as identity primary key, follower_id uuid not null, following_id uuid not null,
  started_at timestamptz not null, ended_at timestamptz,
  check(ended_at is null or ended_at >= started_at)
);
create unique index if not exists premio_follow_open_idx on public.premio_follow_periods(follower_id,following_id) where ended_at is null;
create index if not exists premio_follow_cutoff_idx on public.premio_follow_periods(following_id,started_at,ended_at);
create table if not exists public.premio_follow_exclusions (
  edition_id uuid not null references public.premio_editions(id), follower_id uuid not null,
  reason text not null check(length(reason) >= 10), actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), primary key(edition_id,follower_id)
);
create table if not exists public.premio_awards (
  id uuid primary key default gen_random_uuid(), edition_id uuid not null references public.premio_editions(id),
  entry_id uuid not null references public.premio_entries(id) on delete cascade,
  category text not null check(category in ('mostraspace','critica','social')),
  motivation text not null check(length(motivation) >= 20),
  plan text not null check(plan in ('pro','business')), months integer not null check(months in (6,12)),
  created_at timestamptz not null default now(), unique(edition_id,category), unique(edition_id,entry_id)
);
create table if not exists public.premio_grants (
  id uuid primary key default gen_random_uuid(), award_id uuid not null unique references public.premio_awards(id) on delete cascade,
  artist_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null check(plan in ('pro','business')), months integer not null check(months in(6,12)),
  status text not null default 'available' check(status in('available','active','expired','delivered')),
  previous_plan text not null default 'free', starts_at timestamptz, ends_at timestamptz,
  delivery_note text not null default '', updated_at timestamptz not null default now(),
  check(status <> 'active' or (starts_at is not null and ends_at > starts_at))
);
create unique index if not exists premio_grant_active_idx on public.premio_grants(artist_id) where status='active';
create index if not exists premio_entries_public_idx on public.premio_entries(edition_id,status,submitted_at);

create or replace function public.premio_track_follow() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' then
    insert into public.premio_follow_periods(follower_id,following_id,started_at)
    values(new.follower_id,new.following_id,clock_timestamp()) on conflict do nothing;
    return new;
  end if;
  update public.premio_follow_periods set ended_at=greatest(started_at,clock_timestamp())
    where follower_id=old.follower_id and following_id=old.following_id and ended_at is null;
  return old;
end $$;
-- Lock while seeding so a concurrent unfollow cannot leave an open historical interval.
lock table public.account_follows in share row exclusive mode;
insert into public.premio_follow_periods(follower_id,following_id,started_at)
select follower_id,following_id,coalesce((to_jsonb(f)->>'created_at')::timestamptz,now())
from public.account_follows f on conflict do nothing;
drop trigger if exists premio_follow_history on public.account_follows;
create trigger premio_follow_history after insert or delete on public.account_follows for each row execute function public.premio_track_follow();

create or replace function public.premio_build_snapshot(p_gallery uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object('gallery',jsonb_build_object('id',g.id,'owner_id',g.owner_id,'title',g.title,'slug',g.slug,
    'description',g.description,'cover_image_url',g.cover_image_url,'template_id',g.template_id),
    'template',(select jsonb_build_object('name',t.name,'unity_scene_key',t.unity_scene_key) from public.gallery_templates t where t.id=g.template_id),
    'artworks',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'artist_name',a.artist_name,
      'description',a.description,'year',a.year,'technique',a.technique,'dimensions',a.dimensions,
      'image_url',coalesce(nullif(to_jsonb(a)->>'optimized_url',''),nullif(to_jsonb(a)->>'card_url',''),a.image_url),
      'layout',to_jsonb(ga)) order by ga.sort_order,ga.id)
      from public.gallery_artworks ga join public.artworks a on a.id=ga.artwork_id where ga.gallery_id=g.id),'[]'::jsonb))
  from public.galleries g where g.id=p_gallery;
$$;
create or replace function public.premio_prepare_snapshot(p_artist uuid,p_gallery uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m jsonb;
begin
  if not exists(select 1 from public.galleries where id=p_gallery and owner_id=p_artist and status='published') then
    raise exception 'PREMIO_GALLERY_REQUIRED'; end if;
  m:=public.premio_build_snapshot(p_gallery);
  if jsonb_array_length(m->'artworks') < 1 then raise exception 'PREMIO_ARTWORKS_REQUIRED'; end if;
  return jsonb_build_object('manifest',m,'digest',md5(m::text));
end $$;

create or replace function public.premio_enroll(p_artist uuid,p_edition uuid) returns public.premio_entries language plpgsql security definer set search_path=public,pg_temp as $$
declare e public.premio_editions; r public.premio_entries;
begin
  select * into e from public.premio_editions where id=p_edition for share;
  if not found or not e.published or e.paused or now()<e.applications_open_at or now()>=e.applications_close_at then raise exception 'PREMIO_APPLICATIONS_CLOSED'; end if;
  if not exists(select 1 from auth.users where id=p_artist and email_confirmed_at is not null) then raise exception 'PREMIO_EMAIL_REQUIRED'; end if;
  if exists(select 1 from public.profiles where id=p_artist and role='admin') then raise exception 'PREMIO_ORGANIZER_EXCLUDED'; end if;
  insert into public.premio_entries(edition_id,artist_id,slug)
    values(p_edition,p_artist,'artista-'||replace(p_artist::text,'-','')) on conflict(edition_id,artist_id) do nothing;
  select * into r from public.premio_entries where edition_id=p_edition and artist_id=p_artist;
  return r;
end $$;

create or replace function public.premio_submit(p_artist uuid,p_entry uuid,p_gallery uuid,p_artist_name text,p_statement text,
  p_rules_version text,p_digest text,p_assets jsonb,p_declarations boolean) returns public.premio_entries
language plpgsql security definer set search_path=public,pg_temp as $$
declare e public.premio_editions; r public.premio_entries; m jsonb;
begin
  select * into r from public.premio_entries where id=p_entry and artist_id=p_artist;
  if not found then raise exception 'PREMIO_ENTRY_NOT_FOUND'; end if;
  -- Match moderation/withdrawal lock order: edition first, then entry.
  select * into e from public.premio_editions where id=r.edition_id for share;
  select * into r from public.premio_entries where id=p_entry and artist_id=p_artist for update;
  if not found then raise exception 'PREMIO_ENTRY_NOT_FOUND'; end if;
  if not e.published or e.paused or now()<e.applications_open_at or now()>=e.applications_close_at then raise exception 'PREMIO_APPLICATIONS_CLOSED'; end if;
  if r.status='excluded' then raise exception 'PREMIO_ENTRY_EXCLUDED'; end if;
  if p_declarations is not true or p_rules_version is distinct from e.rules_version then raise exception 'PREMIO_RULES_REQUIRED'; end if;
  if length(trim(p_artist_name)) not between 2 and 120 or length(trim(p_statement)) not between 20 and 3000 then raise exception 'PREMIO_INVALID_DETAILS'; end if;
  if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_artist and p.role='gallerist'
    and p.public_profile_enabled and u.email_confirmed_at is not null) then raise exception 'PREMIO_PUBLIC_CREATOR_REQUIRED'; end if;
  if not exists(select 1 from public.galleries where id=p_gallery and owner_id=p_artist and status='published') then raise exception 'PREMIO_GALLERY_REQUIRED'; end if;
  m:=public.premio_build_snapshot(p_gallery);
  if md5(m::text) is distinct from p_digest then raise exception 'PREMIO_GALLERY_CHANGED'; end if;
  if jsonb_array_length(m->'artworks')<1 then raise exception 'PREMIO_ARTWORKS_REQUIRED'; end if;
  if jsonb_typeof(p_assets) is distinct from 'array' or jsonb_array_length(p_assets)<>jsonb_array_length(m->'artworks') then raise exception 'PREMIO_ARCHIVE_INCOMPLETE'; end if;
  update public.premio_entries set gallery_id=p_gallery,artist_name=trim(p_artist_name),statement=trim(p_statement),
    slug=case when version=0 then coalesce(nullif(trim(both '-' from regexp_replace(lower(trim(p_artist_name)),'[^a-z0-9]+','-','g')),''),'artista')||'-'||replace(p_artist::text,'-','') else slug end,
    status='submitted',version=version+1,submitted_at=now(),accepted_rules_version=e.rules_version,
    declarations_accepted_at=now(),public_note='',updated_at=now() where id=r.id returning * into r;
  insert into public.premio_snapshots(entry_id,version,manifest,assets,digest) values(r.id,r.version,m,p_assets,p_digest);
  delete from public.premio_reviews where entry_id=r.id;
  insert into public.premio_audit_log(edition_id,entry_id,actor_id,action,details)
    values(e.id,r.id,p_artist,'submitted',jsonb_build_object('version',r.version,'digest',p_digest,'rules_version',e.rules_version));
  return r;
end $$;

create or replace function public.premio_counts(p_edition uuid) returns table(entry_id uuid,total integer) language sql stable security definer set search_path=public,pg_temp as $$
  select e.id,count(distinct f.follower_id)::integer from public.premio_entries e
  join public.premio_editions d on d.id=e.edition_id
  left join public.premio_follow_periods f on f.following_id=e.artist_id and f.follower_id<>e.artist_id
    and f.started_at < least(now(),d.social_close_at)
    and (f.ended_at is null or f.ended_at >= least(now(),d.social_close_at))
    and exists(select 1 from auth.users u where u.id=f.follower_id and u.email_confirmed_at<least(now(),d.social_close_at))
    and not exists(select 1 from public.premio_follow_exclusions x where x.edition_id=d.id and x.follower_id=f.follower_id)
  where e.edition_id=p_edition group by e.id;
$$;

create or replace function public.premio_capture_counts(p_edition uuid) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.premio_editions; n integer;
begin
  select * into d from public.premio_editions where id=p_edition for update;
  if not found or now()<d.social_close_at then raise exception 'PREMIO_SOCIAL_OPEN'; end if;
  update public.premio_entries e set social_count=c.total,social_snapshot_at=d.social_close_at
    from public.premio_counts(p_edition) c where e.id=c.entry_id and e.social_snapshot_at is null;
  get diagnostics n=row_count;
  return n;
end $$;

create or replace function public.premio_finalize(p_actor uuid,p_edition uuid,p_main uuid,p_critic uuid,
  p_main_reason text,p_critic_reason text,p_social_reason text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.premio_editions; social_id uuid; main_score numeric;
begin
  if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'PREMIO_ADMIN_REQUIRED'; end if;
  select * into d from public.premio_editions where id=p_edition for update;
  if not found or now()<d.social_close_at then raise exception 'PREMIO_SOCIAL_OPEN'; end if;
  if exists(select 1 from public.premio_awards where edition_id=p_edition) then raise exception 'PREMIO_ALREADY_FINALIZED'; end if;
  if p_main=p_critic then raise exception 'PREMIO_DISTINCT_WINNERS'; end if;
  if (select count(*) from public.premio_entries e join public.galleries g on g.id=e.gallery_id join public.profiles p on p.id=e.artist_id
      where e.edition_id=p_edition and e.id in(p_main,p_critic) and e.status='admitted' and g.status='published' and p.public_profile_enabled and p.role<>'admin')<>2
    then raise exception 'PREMIO_INVALID_WINNER'; end if;
  if exists(select 1 from public.premio_entries e where e.edition_id=p_edition and e.status='admitted'
      and not exists(select 1 from public.premio_reviews r where r.entry_id=e.id)) then raise exception 'PREMIO_REVIEWS_INCOMPLETE'; end if;
  select avg(score) into main_score from public.premio_reviews where entry_id=p_main;
  if main_score is null or exists(select 1 from public.premio_reviews r join public.premio_entries e on e.id=r.entry_id
      where e.edition_id=p_edition and e.status='admitted' group by e.id having avg(r.score)>main_score)
    then raise exception 'PREMIO_MAIN_SCORE'; end if;
  perform public.premio_capture_counts(p_edition);
  select e.id into social_id from public.premio_entries e join public.galleries g on g.id=e.gallery_id
    join public.profiles p on p.id=e.artist_id
    where e.edition_id=p_edition and e.status='admitted' and e.id not in(p_main,p_critic) and g.status='published'
      and p.public_profile_enabled and p.role<>'admin'
    order by e.social_count desc,(select avg(score) from public.premio_reviews where entry_id=e.id) desc,
      e.submitted_at asc,e.id asc limit 1;
  if social_id is null then raise exception 'PREMIO_THREE_ARTISTS_REQUIRED'; end if;
  insert into public.premio_awards(edition_id,entry_id,category,motivation,plan,months) values
    (p_edition,p_main,'mostraspace',p_main_reason,'business',12),
    (p_edition,p_critic,'critica',p_critic_reason,'pro',12),
    (p_edition,social_id,'social',p_social_reason,'pro',6);
  insert into public.premio_grants(award_id,artist_id,plan,months)
    select a.id,e.artist_id,a.plan,a.months from public.premio_awards a join public.premio_entries e on e.id=a.entry_id where a.edition_id=p_edition;
  insert into public.premio_audit_log(edition_id,actor_id,action,details)
    values(p_edition,p_actor,'awards_finalized',jsonb_build_object('mostraspace',p_main,'critica',p_critic,'social',social_id));
end $$;

create or replace function public.premio_claim(p_artist uuid,p_grant uuid) returns public.premio_grants language plpgsql security definer set search_path=public,pg_temp as $$
declare g public.premio_grants; p public.profiles; d public.premio_editions;
begin
  select * into g from public.premio_grants where id=p_grant and artist_id=p_artist for update;
  if not found then raise exception 'PREMIO_GRANT_NOT_FOUND'; end if;
  if g.status='active' then return g; end if;
  if g.status<>'available' then raise exception 'PREMIO_GRANT_UNAVAILABLE'; end if;
  select e.* into d from public.premio_editions e join public.premio_awards a on a.edition_id=e.id where a.id=g.award_id;
  if not d.published or d.results_published_at is null or now()<d.ceremony_at then raise exception 'PREMIO_RESULTS_PRIVATE'; end if;
  select * into p from public.profiles where id=p_artist for update;
  if p.plan::text<>'free' or coalesce(to_jsonb(p)->>'stripe_subscription_status','') in('active','trialing','past_due','unpaid','incomplete') then
    raise exception 'PREMIO_EXISTING_PLAN'; end if;
  update public.premio_grants set status='active',previous_plan=p.plan::text,starts_at=now(),
    ends_at=now()+make_interval(months=>g.months),updated_at=now() where id=g.id returning * into g;
  update public.profiles set plan=g.plan::public.subscription_plan where id=p_artist;
  insert into public.premio_audit_log(edition_id,actor_id,action,details)
    values(d.id,p_artist,'prize_activated',jsonb_build_object('grant_id',g.id,'ends_at',g.ends_at));
  return g;
end $$;

-- Preserve active awards against late Stripe downgrade events without changing Stripe subscriptions.
create or replace function public.premio_protect_plan() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare g public.premio_grants; paid_changed boolean;
begin
  select * into g from public.premio_grants where artist_id=new.id and status='active' and ends_at>now();
  if not found then return new; end if;
  paid_changed := (to_jsonb(new)->>'stripe_subscription_status') is distinct from (to_jsonb(old)->>'stripe_subscription_status')
    or (to_jsonb(new)->>'stripe_price_id') is distinct from (to_jsonb(old)->>'stripe_price_id');
  if (new.plan is distinct from old.plan and new.plan::text<>g.plan) or paid_changed then
    update public.premio_grants set previous_plan=new.plan::text where id=g.id;
  end if;
  if array_position(array['free','pro','business','diamond','institution'],new.plan::text)
      < array_position(array['free','pro','business','diamond','institution'],g.plan) then
    new.plan:=g.plan::public.subscription_plan;
  end if;
  return new;
end $$;
drop trigger if exists premio_plan_protection on public.profiles;
create trigger premio_plan_protection before update on public.profiles for each row execute function public.premio_protect_plan();

create or replace function public.premio_maintenance() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare g public.premio_grants; d record; expired_count integer:=0; captured integer:=0;
begin
  for g in select * from public.premio_grants where status='active' and ends_at<=now() for update skip locked loop
    update public.premio_grants set status='expired',updated_at=now() where id=g.id;
    update public.profiles set plan=g.previous_plan::public.subscription_plan where id=g.artist_id and plan::text=g.plan;
    expired_count:=expired_count+1;
  end loop;
  for d in select id from public.premio_editions where published and now()>=social_close_at loop
    captured:=captured+public.premio_capture_counts(d.id);
  end loop;
  return jsonb_build_object('expired_grants',expired_count,'captured_entries',captured);
end $$;

-- Freeze public rules/calendar as soon as participation starts. Corrections require a new edition.
create or replace function public.premio_guard_edition() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if (old.published or exists(select 1 from public.premio_entries where edition_id=old.id)) and now()>=old.applications_open_at and
    (new.rules_text,new.rules_version,new.applications_open_at,new.applications_close_at,new.social_campaign_at,new.social_close_at,new.ceremony_at)
      is distinct from (old.rules_text,old.rules_version,old.applications_open_at,old.applications_close_at,old.social_campaign_at,old.social_close_at,old.ceremony_at)
    then raise exception 'PREMIO_EDITION_LOCKED'; end if;
  if new.results_published_at is not null and (now()<new.ceremony_at or (select count(*) from public.premio_awards where edition_id=new.id)<>3) then
    raise exception 'PREMIO_RESULTS_NOT_READY'; end if;
  new.updated_at:=now(); return new;
end $$;
drop trigger if exists premio_edition_guard on public.premio_editions;
create trigger premio_edition_guard before update on public.premio_editions for each row execute function public.premio_guard_edition();

-- Reserve archive attempts atomically so parallel requests cannot bypass the limit.
create or replace function public.premio_reserve_archive(p_artist uuid,p_entry uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare e public.premio_entries;
begin
  select * into e from public.premio_entries where id=p_entry and artist_id=p_artist for update;
  if not found then raise exception 'PREMIO_ENTRY_NOT_FOUND'; end if;
  if (select count(*) from public.premio_audit_log where actor_id=p_artist and action='archive_started' and created_at>now()-interval '15 minutes')>=3 then raise exception 'PREMIO_TRY_LATER'; end if;
  insert into public.premio_audit_log(edition_id,entry_id,actor_id,action) values(e.edition_id,e.id,p_artist,'archive_started');
end $$;
create or replace function public.premio_withdraw(p_artist uuid,p_edition uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.premio_editions; e public.premio_entries;
begin
  select * into d from public.premio_editions where id=p_edition for update;
  if not found or now()>=d.social_close_at then raise exception 'PREMIO_APPLICATIONS_CLOSED'; end if;
  update public.premio_entries set status='withdrawn',updated_at=now() where edition_id=p_edition and artist_id=p_artist and status in('draft','submitted','admitted') returning * into e;
  if not found then raise exception 'PREMIO_ENTRY_NOT_FOUND'; end if;
  insert into public.premio_audit_log(edition_id,entry_id,actor_id,action) values(d.id,e.id,p_artist,'withdrawn');
end $$;
create or replace function public.premio_export_follows(p_edition uuid)
returns table(id bigint,entry_id uuid,artist_name text,follower_id uuid,started_at timestamptz,ended_at timestamptz,email_confirmed_at timestamptz,exclusion_reason text)
language sql stable security definer set search_path=public,pg_temp as $$
  select f.id,e.id,e.artist_name,f.follower_id,f.started_at,f.ended_at,u.email_confirmed_at,x.reason
  from public.premio_entries e join public.premio_follow_periods f on f.following_id=e.artist_id
  left join auth.users u on u.id=f.follower_id
  left join public.premio_follow_exclusions x on x.edition_id=e.edition_id and x.follower_id=f.follower_id
  where e.edition_id=p_edition;
$$;

-- All writes and public projections pass through server-side authorization. No new client write policy.
do $$ declare t text; f record; begin
  foreach t in array array['premio_editions','premio_entries','premio_snapshots','premio_reviews','premio_audit_log',
    'premio_follow_periods','premio_follow_exclusions','premio_awards','premio_grants'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'premio\_%' escape '\' loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
grant usage,select on sequence public.premio_audit_log_id_seq,public.premio_follow_periods_id_seq to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('premio-archives','premio-archives',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
commit;
