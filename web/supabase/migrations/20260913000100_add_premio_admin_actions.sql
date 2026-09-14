begin;
create or replace function public.premio_admin_update(p_actor uuid,p_edition uuid,p_action text,p_body jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.premio_editions; e public.premio_entries; k text; g public.premio_grants;
begin
  if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'PREMIO_ADMIN_REQUIRED'; end if;
  select * into d from public.premio_editions where id=p_edition for update;
  if not found then raise exception 'PREMIO_EDITION_NOT_FOUND'; end if;
  if p_action='deliver' then
    select g0.* into g from public.premio_grants g0 join public.premio_awards a on a.id=g0.award_id
      where g0.id=(p_body->>'grantId')::uuid and a.edition_id=p_edition for update of g0;
    if not found or g.status<>'available' or d.results_published_at is null or now()<d.ceremony_at then raise exception 'PREMIO_GRANT_UNAVAILABLE'; end if;
    if length(trim(coalesce(p_body->>'note','')))<20 then raise exception 'PREMIO_INVALID_DETAILS'; end if;
    update public.premio_grants set status='delivered',delivery_note=left(p_body->>'note',3000),updated_at=now() where id=g.id;
    insert into public.premio_audit_log(edition_id,actor_id,action,details)
      values(p_edition,p_actor,'prize_delivered',jsonb_build_object('grant_id',g.id,'note',p_body->>'note'));
    return;
  end if;
  if exists(select 1 from public.premio_awards where edition_id=p_edition) then raise exception 'PREMIO_ALREADY_FINALIZED'; end if;
  if p_action in('excludeFollower','restoreFollower') then
    if length(trim(coalesce(p_body->>'reason','')))<10 then raise exception 'PREMIO_REASON_REQUIRED'; end if;
    if p_action='excludeFollower' then
      insert into public.premio_follow_exclusions(edition_id,follower_id,reason,actor_id)
      values(p_edition,(p_body->>'followerId')::uuid,left(p_body->>'reason',3000),p_actor)
      on conflict(edition_id,follower_id) do update set reason=excluded.reason,actor_id=excluded.actor_id;
    else delete from public.premio_follow_exclusions where edition_id=p_edition and follower_id=(p_body->>'followerId')::uuid;
    end if;
    update public.premio_entries set social_count=null,social_snapshot_at=null where edition_id=p_edition;
    if now()>=d.social_close_at then perform public.premio_capture_counts(p_edition); end if;
    insert into public.premio_audit_log(edition_id,actor_id,action,details)
      values(p_edition,p_actor,p_action,jsonb_build_object('follower_id',p_body->>'followerId','reason',p_body->>'reason'));
    return;
  end if;
  select * into e from public.premio_entries where id=(p_body->>'entryId')::uuid and edition_id=p_edition for update;
  if not found then raise exception 'PREMIO_ENTRY_NOT_FOUND'; end if;
  if p_action='moderate' then
    if e.status not in('submitted','admitted','excluded') or e.version<1 then raise exception 'PREMIO_INVALID_STATUS'; end if;
    if coalesce(p_body->>'status','') not in('admitted','excluded','submitted') then raise exception 'PREMIO_INVALID_STATUS'; end if;
    if p_body->>'status'='excluded' and length(trim(coalesce(p_body->>'note','')))<10 then raise exception 'PREMIO_REASON_REQUIRED'; end if;
    if p_body->>'status'='admitted' and not exists(select 1 from public.galleries g0 join public.profiles p on p.id=g0.owner_id
        where g0.id=e.gallery_id and g0.owner_id=e.artist_id and g0.status='published' and p.public_profile_enabled and p.role='gallerist') then
      raise exception 'PREMIO_PUBLIC_CREATOR_REQUIRED'; end if;
    update public.premio_entries set status=p_body->>'status',public_note=left(coalesce(p_body->>'note',''),2000),updated_at=now() where id=e.id;
  elsif p_action='review' then
    if e.status<>'admitted' then raise exception 'PREMIO_INVALID_STATUS'; end if;
    if length(trim(coalesce(p_body->>'reviewer','')))<2 then raise exception 'PREMIO_INVALID_DETAILS'; end if;
    foreach k in array array['quality','concept','curation','texts','space'] loop
      if not (p_body ? k) or (p_body->>k)::integer not between 0 and 100 then raise exception 'PREMIO_INVALID_SCORE'; end if;
    end loop;
    insert into public.premio_reviews(entry_id,reviewer_name,actor_id,quality,concept,curation,texts,space,notes)
    values(e.id,left(trim(p_body->>'reviewer'),120),p_actor,(p_body->>'quality')::integer,(p_body->>'concept')::integer,
      (p_body->>'curation')::integer,(p_body->>'texts')::integer,(p_body->>'space')::integer,left(coalesce(p_body->>'note',''),5000))
    on conflict(entry_id,reviewer_name) do update set actor_id=excluded.actor_id,quality=excluded.quality,
      concept=excluded.concept,curation=excluded.curation,texts=excluded.texts,space=excluded.space,notes=excluded.notes,updated_at=now();
  else raise exception 'PREMIO_INVALID_REQUEST'; end if;
  insert into public.premio_audit_log(edition_id,entry_id,actor_id,action,details)
    values(p_edition,e.id,p_actor,p_action,p_body-'action');
end $$;
revoke all on function public.premio_admin_update(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.premio_admin_update(uuid,uuid,text,jsonb) to service_role;
commit;
