// Runs real PostgreSQL functions in an isolated in-memory database. Never connects to Supabase.
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const web = fileURLToPath(new URL('../../', import.meta.url));
const db = new PGlite(); let passed = 0;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
async function reject(fn, code) { await assert.rejects(fn, e => String(e.message).includes(code)); }
async function rpc(name, args) { return (await q(`select * from public.${name}(${args.map((_, i) => '$' + (i+1)).join(',')})`, args))[0]; }
async function user(role = 'user', verified = true) {
 const id = randomUUID(); await q("insert into auth.users(id,email,email_confirmed_at) values($1,$2,case when $3 then now()-interval '60 days' else null end)",[id,`${id}@example.test`,verified]);
 await q('update public.profiles set role=$2,public_profile_enabled=true,display_name=$3 where id=$1',[id,role,role+' fixture']); return id;
}
async function gallery(owner, title) {
 const g = (await q("insert into public.galleries(owner_id,title,slug,status) values($1,$2,$3,'published') returning id",[owner,title,randomUUID()]))[0].id;
 const a = (await q("insert into public.artworks(owner_id,title,image_url,description) values($1,'Original title','https://example.supabase.co/storage/v1/object/public/artworks/test.jpg','Original description') returning id",[owner]))[0].id;
 await q('insert into public.gallery_artworks(gallery_id,artwork_id,position_x,sort_order) values($1,$2,3,2)',[g,a]); return {g,a};
}
try {
 await db.exec(`create schema auth; create schema storage; create role anon; create role authenticated; create role service_role bypassrls;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',email_confirmed_at timestamptz);
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
 await db.exec((await readFile(`${web}../database/migrations/001_initial_schema.sql`,'utf8')).replace('create extension if not exists "pgcrypto";',''));
 await db.exec(`alter type public.subscription_plan add value 'diamond'; alter table public.profiles add column public_profile_enabled boolean default true, add column profile_slug text, add column stripe_subscription_status text, add column stripe_price_id text;
 create table public.account_follows(follower_id uuid not null references public.profiles(id) on delete cascade,following_id uuid not null references public.profiles(id) on delete cascade,created_at timestamptz default now(),primary key(follower_id,following_id));`);
 const admin = await user('admin'); const artists = await Promise.all([0,1,2,3].map(()=>user('gallerist'))); const follower=await user();const unverified=await user('user',false);
 await q("insert into public.account_follows(follower_id,following_id,created_at) values($1,$2,now()-interval '3 days')",[follower,artists[0]]);
 for(const file of ['20260913000000_add_premio_mostraspace.sql','20260913000100_add_premio_admin_actions.sql']) await db.exec(await readFile(`${web}supabase/migrations/${file}`,'utf8'));
 const edition=(await q('select id from public.premio_editions where year=2026'))[0].id;
 await check('migration seeds existing follows and draft edition', async()=>{assert.equal((await q('select count(*)::int n from public.premio_follow_periods'))[0].n,1); assert.equal((await q('select published from public.premio_editions'))[0].published,false);});
 await check('anonymous and authenticated callers have no table or RPC access',async()=>{
  for(const role of ['anon','authenticated']) {
   await db.exec(`set role ${role}`);
   await reject(()=>q('select * from public.premio_entries'),'permission denied');
   await reject(()=>rpc('premio_enroll',[artists[0],edition]),'permission denied');
   await reject(()=>rpc('premio_counts',[edition]),'permission denied');
   await db.exec('reset role');
  }
 });
 await check('unapproved rules cannot publish an edition',()=>reject(()=>q('update public.premio_editions set published=true where id=$1',[edition]),'check constraint'));
 await q("update public.premio_editions set applications_open_at=now()-interval '10 days',applications_close_at=now()+interval '1 day',social_campaign_at=now()+interval '2 days',social_close_at=now()+interval '3 days',ceremony_at=now()+interval '4 days',rules_text=$2,jury_text='Fixture jury',rules_approved=true,published=true where id=$1",[edition,'TEST RULES. '.repeat(30)]);
 await check('unverified artists and organisers cannot enroll',async()=>{await reject(()=>rpc('premio_enroll',[unverified,edition]),'PREMIO_EMAIL_REQUIRED');await reject(()=>rpc('premio_enroll',[admin,edition]),'PREMIO_ORGANIZER_EXCLUDED');});
 const entries=await Promise.all(artists.map(a=>rpc('premio_enroll',[a,edition])));
 await check('one application per account, repeated enrollment is idempotent',async()=>assert.equal((await rpc('premio_enroll',[artists[0],edition])).id,entries[0].id));
 const galleries=await Promise.all(artists.map((a,i)=>gallery(a,`Gallery ${i}`)));
 async function submit(i, overrides={}) { const prepared=(await rpc('premio_prepare_snapshot',[artists[i],galleries[i].g])).premio_prepare_snapshot;
  return rpc('premio_submit',[artists[i],entries[i].id,overrides.gallery||galleries[i].g,`Artist ${i}`,'An original artistic research statement.',overrides.rules||'2026-v1',overrides.digest||prepared.digest,JSON.stringify(overrides.assets||[`${entries[i].id}/fixture/0`]),true]); }
 await check('cannot submit another artist’s gallery',()=>reject(()=>submit(0,{gallery:galleries[1].g}),'PREMIO_GALLERY_REQUIRED'));
 await check('outdated consent and incomplete archive are rejected',async()=>{await reject(()=>submit(0,{rules:'old'}),'PREMIO_RULES_REQUIRED');await reject(()=>submit(0,{assets:[]}),'PREMIO_ARCHIVE_INCOMPLETE');});
 await check('concurrent gallery edits cause rejection',()=>reject(()=>submit(0,{digest:'stale'}),'PREMIO_GALLERY_CHANGED'));
 for(let i=0;i<artists.length;i++) entries[i]=await submit(i);
 await check('submission records ownership, rules, metadata and layout',async()=>{const e=entries[0];assert.equal(e.artist_id,artists[0]);assert.equal(e.accepted_rules_version,'2026-v1');assert.match(e.slug,/artist-0-/);const s=(await q('select manifest from public.premio_snapshots where entry_id=$1',[e.id]))[0].manifest;assert.equal(s.artworks[0].layout.position_x,3);assert.equal(s.artworks[0].title,'Original title');});
 await check('private/public profile and moderation access are validated',async()=>{await reject(()=>rpc('premio_admin_update',[artists[1],edition,'moderate',JSON.stringify({entryId:entries[0].id,status:'admitted'})]),'PREMIO_ADMIN_REQUIRED');await q('update public.profiles set public_profile_enabled=false where id=$1',[artists[0]]);await reject(()=>rpc('premio_admin_update',[admin,edition,'moderate',JSON.stringify({entryId:entries[0].id,status:'admitted'})]),'PREMIO_PUBLIC_CREATOR_REQUIRED');await q('update public.profiles set public_profile_enabled=true where id=$1',[artists[0]]);});
 const moderate = i=>rpc('premio_admin_update',[admin,edition,'moderate',JSON.stringify({entryId:entries[i].id,status:'admitted'})]);
 const review = (i,score)=>rpc('premio_admin_update',[admin,edition,'review',JSON.stringify({entryId:entries[i].id,reviewer:'Juror One',quality:score,concept:score,curation:score,texts:score,space:score})]);
 for(let i=0;i<artists.length;i++) await moderate(i);
 await review(0,95);
 await check('resubmission preserves old archive, removes old scores and requires admission again',async()=>{const slug=entries[0].slug;await q("update public.artworks set title='Changed title' where id=$1",[galleries[0].a]);entries[0]=await submit(0);assert.equal(entries[0].version,2);assert.equal(entries[0].slug,slug);assert.equal(entries[0].status,'submitted');assert.equal((await q('select count(*)::int n from public.premio_reviews where entry_id=$1',[entries[0].id]))[0].n,0);assert.equal((await q('select manifest from public.premio_snapshots where entry_id=$1 and version=1',[entries[0].id]))[0].manifest.artworks[0].title,'Original title');await moderate(0);});
 await check('parallel archive reservations enforce the rate limit',async()=>{await Promise.all([1,2,3].map(()=>rpc('premio_reserve_archive',[artists[0],entries[0].id])));await reject(()=>rpc('premio_reserve_archive',[artists[0],entries[0].id]),'PREMIO_TRY_LATER');});
 await check('edition rules cannot be changed after opening, including after unpublishing',async()=>{await reject(()=>q("update public.premio_editions set rules_version='changed' where id=$1",[edition]),'PREMIO_EDITION_LOCKED');await q('update public.premio_editions set published=false where id=$1',[edition]);await reject(()=>q("update public.premio_editions set rules_version='changed' where id=$1",[edition]),'PREMIO_EDITION_LOCKED');await q('update public.premio_editions set published=true where id=$1',[edition]);});
 await check('native follows/unfollows generate history and re-follow counts once',async()=>{await q('delete from public.account_follows where follower_id=$1 and following_id=$2',[follower,artists[0]]);await q('insert into public.account_follows(follower_id,following_id) values($1,$2)',[follower,artists[0]]);await q('insert into public.account_follows(follower_id,following_id) values($1,$2)',[unverified,artists[0]]);const counts=await q('select * from public.premio_counts($1)',[edition]);assert.equal(counts.find(c=>c.entry_id===entries[0].id).total,1);assert.equal((await q('select count(*)::int n from public.premio_follow_periods where follower_id=$1',[follower]))[0].n,2);});
 await check('awards cannot be finalised before the social deadline',()=>reject(()=>rpc('premio_finalize',[admin,edition,entries[0].id,entries[1].id,'A complete main award reason.','A complete critic award reason.','A complete social award reason.']),'PREMIO_SOCIAL_OPEN'));
 // Test-only clock advancement: move edition boundaries, never ship these commands as a migration.
 await db.exec("alter table public.premio_editions disable trigger premio_edition_guard");
 await q("update public.premio_editions set applications_open_at=now()-interval '10 days',applications_close_at=now()-interval '4 days',social_campaign_at=now()-interval '3 days',social_close_at=now()-interval '1 day',ceremony_at=now()+interval '1 day' where id=$1",[edition]);
 await db.exec("alter table public.premio_editions enable trigger premio_edition_guard");
 const cutoff=(await q('select social_close_at from public.premio_editions where id=$1',[edition]))[0].social_close_at;
 await q('delete from public.premio_follow_periods');
 const f2=await user(),f3=await user();
 for(const i of [0,2,3]) await q("insert into public.premio_follow_periods(follower_id,following_id,started_at,ended_at) values($1,$2,$3::timestamptz-interval '1 day',$3::timestamptz+interval '1 hour')",[follower,artists[i],cutoff]);
 await q("insert into public.premio_follow_periods(follower_id,following_id,started_at) values($1,$2,$3::timestamptz+interval '1 hour')",[f2,artists[2],cutoff]);
 await q("insert into public.premio_follow_periods(follower_id,following_id,started_at) values($1,$2,$3::timestamptz-interval '1 hour')",[unverified,artists[2],cutoff]);
 await q("insert into public.premio_follow_periods(follower_id,following_id,started_at,ended_at) values($1,$2,$3::timestamptz-interval '2 days',$3::timestamptz-interval '1 hour')",[f3,artists[2],cutoff]);
 await check('cutoff keeps later unfollows, rejects late follows and unverified accounts',async()=>{const c=await q('select * from public.premio_counts($1)',[edition]);assert.equal(c.find(c=>c.entry_id===entries[2].id).total,1);});
 await check('after both deadlines, submissions and withdrawal are rejected',async()=>{await reject(()=>submit(0),'PREMIO_APPLICATIONS_CLOSED');await reject(()=>rpc('premio_withdraw',[artists[0],edition]),'PREMIO_APPLICATIONS_CLOSED');});
 await check('capture is idempotent and audited exclusions can recalculate it',async()=>{await rpc('premio_capture_counts',[edition]);assert.equal((await rpc('premio_capture_counts',[edition])).premio_capture_counts,0);await rpc('premio_admin_update',[admin,edition,'excludeFollower',JSON.stringify({followerId:follower,reason:'Verified abusive account fixture'})]);assert.equal((await q('select social_count from public.premio_entries where id=$1',[entries[2].id]))[0].social_count,0);await rpc('premio_admin_update',[admin,edition,'restoreFollower',JSON.stringify({followerId:follower,reason:'Review confirms this follower is valid'})]);assert.equal((await q('select social_count from public.premio_entries where id=$1',[entries[2].id]))[0].social_count,1);});
 const finalize=(main=0,critic=1)=>rpc('premio_finalize',[admin,edition,entries[main].id,entries[critic].id,'The highest overall jury score.','Chosen by the named art critic.','Most valid followers at the cutoff.']);
 await check('reviews and three distinct winners are mandatory',async()=>{await reject(()=>finalize(0,0),'PREMIO_DISTINCT_WINNERS');await reject(()=>finalize(),'PREMIO_REVIEWS_INCOMPLETE');});
 for(let i=0;i<artists.length;i++) await review(i,[95,90,85,80][i]);
 await check('lower jury score cannot be selected as main winner',()=>reject(()=>finalize(1,0),'PREMIO_MAIN_SCORE'));
 await check('finalisation chooses three artists; social ties use jury score',async()=>{await finalize();const a=await q('select * from public.premio_awards where edition_id=$1',[edition]);assert.equal(a.length,3);assert.equal(new Set(a.map(x=>x.entry_id)).size,3);assert.equal(a.find(x=>x.category==='social').entry_id,entries[2].id);assert.equal(a.find(x=>x.category==='social').months,6);await reject(()=>finalize(),'PREMIO_ALREADY_FINALIZED');});
 await check('finalised exclusions are locked and results cannot leak before ceremony',async()=>{await reject(()=>rpc('premio_admin_update',[admin,edition,'excludeFollower',JSON.stringify({followerId:follower,reason:'A valid exclusion reason'})]),'PREMIO_ALREADY_FINALIZED');await reject(()=>q('update public.premio_editions set results_published_at=now() where id=$1',[edition]),'PREMIO_RESULTS_NOT_READY');const grant=(await q('select id from public.premio_grants where artist_id=$1',[artists[0]]))[0];await reject(()=>rpc('premio_claim',[artists[0],grant.id]),'PREMIO_RESULTS_PRIVATE');});
 await db.exec("alter table public.premio_editions disable trigger premio_edition_guard");await q("update public.premio_editions set ceremony_at=now()-interval '1 hour' where id=$1",[edition]);await db.exec("alter table public.premio_editions enable trigger premio_edition_guard");await q('update public.premio_editions set results_published_at=now() where id=$1',[edition]);
 const mainGrant=(await q('select id from public.premio_grants where artist_id=$1',[artists[0]]))[0].id;
 await check('only the winner can claim; free plan activation is finite and idempotent',async()=>{await reject(()=>rpc('premio_claim',[artists[1],mainGrant]),'PREMIO_GRANT_NOT_FOUND');const g=await rpc('premio_claim',[artists[0],mainGrant]);assert.equal(g.status,'active');assert.equal(g.months,12);assert.equal((await q('select plan from public.profiles where id=$1',[artists[0]]))[0].plan,'business');assert.equal((await rpc('premio_claim',[artists[0],mainGrant])).ends_at.getTime(),g.ends_at.getTime());});
 await check('existing subscribers retain their plan and available prize',async()=>{await q("update public.profiles set plan='diamond',stripe_subscription_status='active' where id=$1",[artists[1]]);const g=(await q('select id from public.premio_grants where artist_id=$1',[artists[1]]))[0];await reject(()=>rpc('premio_claim',[artists[1],g.id]),'PREMIO_EXISTING_PLAN');assert.equal((await q('select status from public.premio_grants where id=$1',[g.id]))[0].status,'available');});
 await check('late Stripe downgrade preserves the prize and expiry restores the underlying plan',async()=>{await q("update public.profiles set plan='free',stripe_subscription_status='canceled' where id=$1",[artists[0]]);assert.equal((await q('select plan from public.profiles where id=$1',[artists[0]]))[0].plan,'business');await q("update public.premio_grants set starts_at=now()-interval '1 year',ends_at=now()-interval '1 minute' where id=$1",[mainGrant]);await rpc('premio_maintenance',[]);assert.equal((await q('select plan from public.profiles where id=$1',[artists[0]]))[0].plan,'free');assert.equal((await q('select status from public.premio_grants where id=$1',[mainGrant]))[0].status,'expired');});
 await check('higher paid plan survives expiry of a social prize',async()=>{const g=(await q('select id from public.premio_grants where artist_id=$1',[artists[2]]))[0];await rpc('premio_claim',[artists[2],g.id]);await q("update public.profiles set plan='diamond',stripe_subscription_status='active' where id=$1",[artists[2]]);await q("update public.premio_grants set starts_at=now()-interval '1 year',ends_at=now()-interval '1 minute' where id=$1",[g.id]);await rpc('premio_maintenance',[]);assert.equal((await q('select plan from public.profiles where id=$1',[artists[2]]))[0].plan,'diamond');});
 console.log(`\n${passed} Premio PostgreSQL integration checks passed.`);
} finally { await db.close(); }
