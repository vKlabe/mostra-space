import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Run only in the isolated GitHub job');
assert.equal(process.env.COMMERCE_EPHEMERAL_POSTGRES, 'true');
const config = {
  host: '127.0.0.1', port: 55439, database: 'mostra_commerce_ci',
  user: 'postgres', password: 'commerce_ci_only', ssl: false,
  connectionTimeoutMillis: 5000, statement_timeout: 20000,
  application_name: 'mostra-commerce-concurrency-ci'
};
const ids = { admin: randomUUID(), seller: randomUUID() };
const buyers = Array.from({ length: 20 }, () => randomUUID());
let db;
async function connect(role) {
  const c = new pg.Client(config);
  await c.connect();
  try {
    if (role) {
      assert.ok(['service_role', 'anon', 'authenticated'].includes(role));
      await c.query('set role ' + role);
    }
    return c;
  } catch (e) { await c.end(); throw e; }
}
async function rpc(c, action, actor, data = {}) {
  return (await c.query('select public.commerce_command($1,$2,$3::jsonb) as result',
    [action, actor, JSON.stringify(data)])).rows[0].result;
}
async function enabled(value, c = db) { return rpc(c, 'set_payments', ids.admin, { enabled: value }); }
async function getOrder(id) {
  return (await db.query('select * from public.commerce_orders where id=$1', [id])).rows[0];
}
async function quote() {
  const id = randomUUID();
  await db.query("insert into public.artworks values($1,$2,'CI artwork',100,'EUR',true,true)", [id, ids.seller]);
  const r = await db.query(
    "insert into public.commerce_listings(artwork_id,seller_id,enabled,shipping_cents,shipping_countries,terms_url) values($1,$2,true,1000,ARRAY['IT'],'https://seller.example/terms') returning updated_at::text",
    [id, ids.seller]);
  return { artwork_id: id, buyer_email: 'buyer@example.com', terms_accepted: true,
    shipping_country: 'IT', quote_price: 100, quote_shipping: 1000,
    quote_terms: 'https://seller.example/terms', quote_version: r.rows[0].updated_at,
    livemode: false, fee_bps: 500, fee_base: 'artwork', refund_application_fee: false };
}
function paidData(o) {
  return { order_id: o.id, account_id: 'acct_ci', livemode: false,
    session_id: 'cs_ci_' + o.id, payment_intent_id: 'pi_ci_' + o.id,
    total_cents: o.total_cents, currency: 'eur' };
}
async function paidOrder() {
  await enabled(true);
  const o = await rpc(db, 'reserve', buyers[0], await quote());
  await enabled(false);
  await rpc(db, 'paid', null, paidData(o));
  await rpc(db, 'fulfill', ids.seller, { order_id: o.id, status: 'shipped', tracking: 'CI' });
  return getOrder(o.id);
}

// Every contender has a separate PostgreSQL backend. A held row lock makes
// the overlap observable; no result relies only on Promise.all timing.
async function race(n, prepare, action) {
  const blocker = await connect();
  const clients = [];
  let pending = [];
  try {
    for (let i = 0; i < n; i++) clients.push(await connect('service_role'));
    const pids = await Promise.all(clients.map(async c =>
      (await c.query('select pg_backend_pid() as pid')).rows[0].pid));
    assert.equal(new Set(pids).size, n);
    await blocker.query('begin');
    const prepared = await prepare(blocker);
    pending = clients.map((c, i) => Promise.resolve().then(() => action(c, i))
      .then(value => ({ ok: true, value }), error => ({ ok: false, error })));
    const deadline = Date.now() + 10000;
    let waiting = 0;
    do {
      const r = await db.query(
        "select count(*)::int as n from pg_stat_activity where pid=any($1::int[]) and wait_event_type='Lock'",
        [pids]);
      waiting = r.rows[0].n;
      if (waiting === n) break;
      await delay(25);
    } while (Date.now() < deadline);
    assert.equal(waiting, n, 'All separate backends must actually be waiting on a lock');
    await blocker.query('commit');
    return { results: await Promise.all(pending), prepared };
  } finally {
    await blocker.query('rollback').catch(() => {});
    await Promise.allSettled(pending);
    await Promise.allSettled(clients.map(c => c.end()));
    await blocker.end();
  }
}
const lockArtwork = q => c => c.query('select id from public.artworks where id=$1 for update', [q.artwork_id]);
const lockOrder = o => c => c.query('select id from public.commerce_orders where id=$1 for update', [o.id]);
function rejected(result, message) {
  assert.equal(result.ok, false);
  assert.match(result.error.message, new RegExp(message));
}
async function inventory(o) {
  const saved = await getOrder(o.id);
  assert.equal(saved.inventory_held, true);
  assert.equal((await db.query('select is_for_sale from public.artworks where id=$1', [o.artwork_id])).rows[0].is_for_sale, false);
  assert.equal(saved.fulfillment_status, 'shipped');
}

before(async () => {
  db = await connect();
  assert.equal((await db.query('select current_database() as name')).rows[0].name, 'mostra_commerce_ci');
  assert.match((await db.query('show server_version')).rows[0].server_version, /^17\./);
  assert.equal((await db.query("select count(*)::int as n from pg_tables where schemaname='public'")).rows[0].n, 0, 'Fixture must start empty');
  await db.query("create role anon; create role authenticated; create role service_role bypassrls;");
  await db.query("create table public.profiles(id uuid primary key,role text,display_name text,full_name text); create table public.artworks(id uuid primary key,owner_id uuid references public.profiles(id),title text,price numeric,currency text,is_public boolean,is_for_sale boolean); create function public.is_artwork_in_published_gallery(uuid) returns boolean language sql as 'select false'; grant usage on schema public to anon,authenticated,service_role; grant select,update on public.artworks to service_role; grant select on public.profiles to service_role;");
  for (const [id, role] of [[ids.admin, 'admin'], [ids.seller, 'gallerist'], ...buyers.map(id => [id, 'user'])]) {
    await db.query('insert into public.profiles values($1,$2,$2,null)', [id, role]);
  }
  // These scripts run only in the new CI service, never against Supabase.
  await db.query(readFileSync(new URL('../../supabase/artwork-commerce.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../../supabase/migrations/20261011143230_fix_commerce_refund_sync.sql', import.meta.url), 'utf8'));
  await db.query("insert into public.commerce_sellers(seller_id,stripe_account_id,livemode,charges_enabled,payouts_enabled,details_submitted) values($1,'acct_ci',false,true,true,true)", [ids.seller]);
});
after(async () => { await db?.end(); });

test('OFF by default; service-role reserve is blocked and browser roles cannot invoke RPC', async () => {
  const q = await quote();
  assert.equal((await db.query('select payments_enabled from public.commerce_settings')).rows[0].payments_enabled, false);
  const c = await connect('service_role');
  try {
    await assert.rejects(rpc(c, 'reserve', buyers[0], q), /PAYMENTS_OFF/);
    await assert.rejects(rpc(c, 'set_payments', buyers[0], { enabled: true }), /FORBIDDEN/);
  } finally { await c.end(); }
  for (const role of ['anon', 'authenticated']) {
    const browser = await connect(role);
    try { await assert.rejects(rpc(browser, 'set_payments', ids.admin, { enabled: true }), { code: '42501' }); }
    finally { await browser.end(); }
  }
});

test('20 distinct buyers on 20 blocked backends produce exactly one reservation', async () => {
  await enabled(true);
  const q = await quote();
  const { results } = await race(20, lockArtwork(q), (c, i) => rpc(c, 'reserve', buyers[i], q));
  assert.equal(results.filter(r => r.ok).length, 1);
  for (const r of results.filter(r => !r.ok)) rejected(r, 'ARTWORK_UNAVAILABLE');
  assert.equal((await db.query('select count(*)::int as n from public.commerce_orders where artwork_id=$1 and inventory_held', [q.artwork_id])).rows[0].n, 1);
});

test('20 simultaneous retries by one buyer reuse one order and snapshot', async () => {
  await enabled(true);
  const q = await quote();
  const { results } = await race(20, lockArtwork(q), c => rpc(c, 'reserve', buyers[0], q));
  assert.ok(results.every(r => r.ok));
  assert.equal(new Set(results.map(r => r.value.id)).size, 1);
  for (const r of results) { assert.equal(r.value.total_cents, 11000); assert.equal(r.value.fee_cents, 500); }
});

test('committing OFF blocks queued purchases and disallows attaching an existing checkout', async () => {
  await enabled(true);
  const o = await rpc(db, 'reserve', buyers[0], await quote());
  const q = await quote();
  const { results } = await race(2, c => enabled(false, c), (c, i) => i === 0
    ? rpc(c, 'reserve', buyers[1], q)
    : rpc(c, 'attach_session', buyers[0], { order_id: o.id, session_id: 'cs_ci_' + o.id }));
  rejected(results[0], 'PAYMENTS_OFF');
  assert.equal(results[1].ok, true);
  assert.equal(results[1].value.allowed, false);
  assert.equal((await getOrder(o.id)).inventory_held, true);
});

test('OFF waits for an in-flight reservation; the old revision cannot authorize checkout', async () => {
  await enabled(true);
  const q = await quote();
  const { results, prepared: o } = await race(1,
    c => rpc(c, 'reserve', buyers[0], q), c => enabled(false, c));
  assert.equal(results[0].ok, true);
  assert.equal(results[0].value.payments_enabled, false);
  const attached = await rpc(db, 'attach_session', buyers[0], { order_id: o.id, session_id: 'cs_ci_' + o.id });
  assert.equal(attached.allowed, false);
  assert.equal(attached.order.inventory_held, true);
});

test('paid webhook duplicates and refund-budget races are safe while OFF', async () => {
  const o = await paidOrder();
  const data = { ...paidData(o), event_id: 'evt_paid_' + randomUUID(), event_type: 'checkout.session.completed' };
  const paid = await race(2, lockOrder(o), c => rpc(c, 'paid', null, data));
  assert.ok(paid.results.every(r => r.ok && r.value.state === 'paid'));
  assert.equal((await db.query('select count(*)::int as n from public.commerce_events where stripe_event_id=$1', [data.event_id])).rows[0].n, 1);
  const requests = [randomUUID(), randomUUID()];
  const refunds = await race(2, lockOrder(o), (c, i) =>
    rpc(c, 'refund_request', ids.seller, { order_id: o.id, request_id: requests[i], amount_cents: 7000 }));
  assert.equal(refunds.results.filter(r => r.ok).length, 1);
  rejected(refunds.results.find(r => !r.ok), 'REFUND_TOO_LARGE');
  await inventory(o);
});

test('competing refund snapshots roll back stale events; retries and late failures preserve stock OFF', async () => {
  const o = await paidOrder();
  const snapshots = [5000, 6000].map(amount => ({
    order_id: o.id, account_id: 'acct_ci', livemode: false,
    payment_intent_id: o.stripe_payment_intent_id,
    refund_id: 're_ci_' + randomUUID(), amount_cents: amount, state: 'succeeded',
    expected_refund_revision: 0, event_id: 'evt_refund_' + randomUUID(), event_type: 'refund.updated'
  }));
  const { results } = await race(2, lockOrder(o), (c, i) => rpc(c, 'refund_sync', null, snapshots[i]));
  assert.equal(results.filter(r => r.ok).length, 1);
  const staleIndex = results.findIndex(r => !r.ok);
  rejected(results[staleIndex], 'STALE_REFUND_SNAPSHOT');
  assert.equal((await db.query('select count(*)::int as n from public.commerce_events where stripe_event_id=$1', [snapshots[staleIndex].event_id])).rows[0].n, 0);
  let saved = await getOrder(o.id);
  assert.equal(saved.refund_revision, 1);
  await rpc(db, 'refund_sync', null, { ...snapshots[staleIndex], expected_refund_revision: saved.refund_revision });
  saved = await getOrder(o.id);
  assert.equal(saved.state, 'refunded');
  assert.equal(saved.refunded_cents, 11000);
  assert.equal(saved.refund_revision, 2);
  for (const snapshot of snapshots) await rpc(db, 'refund_sync', null, snapshot);
  assert.equal((await getOrder(o.id)).refund_revision, 2);
  for (const [i, snapshot] of snapshots.entries()) {
    const current = await getOrder(o.id);
    await rpc(db, 'refund_sync', null, { ...snapshot, state: 'failed',
      expected_refund_revision: current.refund_revision, event_id: 'evt_failed_' + randomUUID() });
    saved = await getOrder(o.id);
    assert.equal(saved.refunded_cents, i === 0 ? 6000 : 0);
    assert.equal(saved.state, i === 0 ? 'partially_refunded' : 'paid');
    await inventory(o);
  }
  assert.equal((await db.query('select payments_enabled from public.commerce_settings')).rows[0].payments_enabled, false);
});
