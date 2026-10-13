import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const Stripe = require('stripe');
const root = fileURLToPath(new URL('../../', import.meta.url));
const compiled = new URL('.compiled/', import.meta.url);
mkdirSync(compiled, { recursive: true });
writeFileSync(new URL('package.json', compiled), '{"type":"commonjs"}');
for (const name of ['config', 'engine', 'translations']) {
  writeFileSync(new URL(`${name}.js`, compiled), ts.transpileModule(readFileSync(`${root}/lib/commerce/${name}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
}
const { commerceConfig, configurationBlockers, cents } = require('./.compiled/config.js');
const { startCheckout, syncSession, syncRefund: applyRefundSnapshot, refreshRefund, requestRefund, syncFailedPayment } = require('./.compiled/engine.js');
const config = commerceConfig({ STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_CONNECT_WEBHOOK_SECRET: 'whsec_fake', STRIPE_CONNECT_CLIENT_ID: 'ca_fake', NEXT_PUBLIC_SITE_URL: 'https://commerce.example', COMMERCE_FEE_BPS: '500', COMMERCE_FEE_BASE: 'artwork', COMMERCE_REFUND_APPLICATION_FEE: 'false', COMMERCE_COMMERCIAL_REVIEWED: 'true', COMMERCE_ACTIVATION_APPROVED: 'true' });
const ids = { admin: randomUUID(), seller: randomUUID(), buyer: randomUUID(), other: randomUUID() };
let db;
const command = async (action, actor, data = {}) => (await db.query('select public.commerce_command($1,$2,$3::jsonb) as result', [action, actor, JSON.stringify(data)])).rows[0].result;
const store = { command, getOrder: async id => (await db.query('select * from commerce_orders where id=$1', [id])).rows[0], enabled: async () => (await db.query('select payments_enabled from commerce_settings')).rows[0].payments_enabled };
// Legacy SQL fixtures are sequential. Production uses refreshRefund around Stripe reads.
async function syncRefund(s, refund, order, incoming) {
  return applyRefundSnapshot(s, refund, await s.getOrder(order.id), incoming);
}
async function enabled(value) { return command('set_payments', ids.admin, { enabled: value }); }
async function artwork() {
  const id = randomUUID();
  await db.query('insert into artworks values($1,$2,$3,100,\'EUR\',true,true)', [id, ids.seller, 'Unique work']);
  await db.query('insert into commerce_listings(artwork_id,seller_id,enabled,shipping_cents,shipping_countries,terms_url) values($1,$2,true,1000,ARRAY[\'IT\',\'FR\'],\'https://seller.example/terms\')', [id, ids.seller]);
  const l = (await db.query('select updated_at::text from commerce_listings where artwork_id=$1', [id])).rows[0];
  return { artwork_id: id, buyer_email: 'buyer@example.com', terms_accepted: true, shipping_country: 'IT', quote_price: 100, quote_shipping: 1000, quote_terms: 'https://seller.example/terms', quote_version: l.updated_at, livemode: false, fee_bps: 500, fee_base: 'artwork', refund_application_fee: false };
}
async function reserve(data, buyer = ids.buyer) { return command('reserve', buyer, data || await artwork()); }
const session = (o, changes = {}) => ({ id: `cs_${o.id}`, metadata: { type: 'artwork_purchase', orderId: o.id }, client_reference_id: o.id, livemode: false, mode: 'payment', status: 'open', payment_status: 'unpaid', amount_total: o.total_cents, currency: 'eur', payment_intent: `pi_${o.id}`, url: 'https://checkout.stripe.test/session', ...changes });
const event = type => ({ id: `evt_${randomUUID()}`, type });
function gateway() {
  const sessions = new Map(), refundList = [], calls = [], idempotent = new Map();
  const api = {
    accounts: { retrieve: async id => ({ id, charges_enabled: true, payouts_enabled: true, details_submitted: true }) },
    checkout: { sessions: {
      create: async (params, scope) => {
        calls.push(['create', params, scope]);
        if (idempotent.has(scope.idempotencyKey)) return idempotent.get(scope.idempotencyKey);
        const o = await store.getOrder(params.metadata.orderId); const s = session(o); sessions.set(s.id, s); idempotent.set(scope.idempotencyKey, s);
        return s;
      },
      retrieve: async (id, params, scope) => { assert.equal(scope.stripeAccount, 'acct_seller'); return sessions.get(id); },
      expire: async (id, params, scope) => { assert.equal(scope.stripeAccount, 'acct_seller'); const s = { ...sessions.get(id), status: 'expired' }; sessions.set(id, s); return s; },
    } },
    refunds: {
      list: (params, scope) => { assert.equal(scope.stripeAccount, 'acct_seller'); return (async function* () { yield* refundList; })(); },
      create: async (params, scope) => {
        calls.push(['refund', params, scope]);
        if (idempotent.has(scope.idempotencyKey)) return idempotent.get(scope.idempotencyKey);
        const r = { id: `re_${randomUUID()}`, payment_intent: params.payment_intent, amount: params.amount, status: 'succeeded', metadata: params.metadata };
        refundList.push(r); idempotent.set(scope.idempotencyKey, r); return r;
      },
      retrieve: async (id, params, scope) => { assert.equal(scope.stripeAccount, 'acct_seller'); return refundList.find(r => r.id === id); },
    },
    paymentIntents: {},
  };
  return { api, sessions, calls, refundList };
}
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.profiles(id uuid primary key,role text,display_name text,full_name text);
    create table public.artworks(id uuid primary key,owner_id uuid references public.profiles(id),title text,price numeric,currency text,is_public boolean,is_for_sale boolean);
    create function public.is_artwork_in_published_gallery(uuid) returns boolean language sql as 'select false';
    grant usage on schema public to anon,authenticated,service_role;
    grant select,update on public.artworks to service_role; grant select on public.profiles to service_role;`);
  for (const [name, id] of Object.entries(ids)) await db.query('insert into profiles values($1,$2,$3,null)', [id, name === 'admin' ? 'admin' : name === 'seller' ? 'gallerist' : 'user', name]);
  // Both scripts below run ONLY in this ephemeral in-memory PGlite fixture.
  await db.exec(readFileSync(`${root}/supabase/artwork-commerce.sql`, 'utf8'));
  const fixes = readdirSync(`${root}/supabase/migrations`).filter(name => /^\d+_fix_commerce_refund_sync\.sql$/.test(name));
  assert.equal(fixes.length, 1, 'Exactly one incremental refund migration is required');
  await db.exec(readFileSync(`${root}/supabase/migrations/${fixes[0]}`, 'utf8'));
  await db.query('insert into commerce_sellers(seller_id,stripe_account_id,livemode,charges_enabled,payouts_enabled,details_submitted) values($1,\'acct_seller\',false,true,true,true)', [ids.seller]);
});
after(async () => { await db?.close(); });

test('defaults OFF; missing commercial configuration and activation authorization fail closed', async () => {
  assert.equal(await store.enabled(), false);
  const data = await artwork(); await assert.rejects(reserve(data), /PAYMENTS_OFF/);
  await assert.rejects(startCheckout(store, gateway().api, config, ids.buyer, data), /PAYMENTS_OFF/);
  const blocked = configurationBlockers(commerceConfig({ STRIPE_SECRET_KEY: 'sk_test_fake' }));
  for (const key of ['COMMERCE_ACTIVATION_APPROVED', 'COMMERCE_FEE_BPS', 'COMMERCE_FEE_BASE', 'COMMERCE_REFUND_APPLICATION_FEE']) assert.ok(blocked.includes(key));
  assert.equal(cents('123,45'), 12345); assert.throws(() => cents('1.005'), /INVALID_AMOUNT/);
});
test('RLS and grants deny browser access and RPC execution; only admin toggles', async () => {
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    try { await assert.rejects(db.query('select * from commerce_orders'), /permission denied/); await assert.rejects(command('set_payments', ids.admin, { enabled: true }), /permission denied/); }
    finally { await db.exec('reset role'); }
  }
  await assert.rejects(command('set_payments', ids.buyer, { enabled: true }), /FORBIDDEN/);
  await db.exec('set role service_role');
  try { await enabled(true); } finally { await db.exec('reset role'); }
});
test('quote validation, seller binding, self-purchase and currency validation', async () => {
  const q = await artwork();
  await assert.rejects(reserve({ ...q, quote_price: 1 }), /QUOTE_CHANGED/);
  await assert.rejects(reserve({ ...q, terms_accepted: false }), /INVALID_TERMS/);
  await assert.rejects(reserve(q, ids.seller), /OWN_ARTWORK/);
  await assert.rejects(reserve({ ...q, livemode: true }), /SELLER_NOT_READY/);
  await db.query('update artworks set currency=\'USD\' where id=$1', [q.artwork_id]);
  await assert.rejects(reserve(q), /INVALID_PRICE/);
});
test('20 competing reservations: one unique artwork lock; buyer retry reuses snapshot', async () => {
  const q = await artwork(); const results = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => reserve(q, i % 2 ? ids.buyer : ids.other)));
  const orders = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  assert.equal(new Set(orders.map(o => o.id)).size, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 10);
  assert.equal((await db.query('select count(*)::int n from commerce_orders where artwork_id=$1 and inventory_held', [q.artwork_id])).rows[0].n, 1);
  const o = orders[0]; assert.equal((await reserve({ ...q, quote_price: 3 }, o.buyer_id)).id, o.id);
  assert.equal(o.fee_cents, 500); assert.equal(o.total_cents, 11000);
});
test('OFF racing session attachment invalidates permission; expiry alone can release unpaid reservation', async () => {
  const o = await reserve(); await enabled(false);
  const attached = await command('attach_session', o.buyer_id, { order_id: o.id, session_id: `cs_${o.id}` }); assert.equal(attached.allowed, false);
  assert.equal((await store.getOrder(o.id)).inventory_held, true);
  await syncSession(store, session(o, { status: 'expired' }), 'acct_seller');
  assert.equal((await store.getOrder(o.id)).inventory_held, false);
  await enabled(true);
});
test('paid settlement works OFF, rejects mismatches, duplicate and late events preserve paid inventory', async () => {
  const o = await reserve(); await enabled(false);
  const paid = session(o, { status: 'complete', payment_status: 'paid' });
  await assert.rejects(syncSession(store, paid, 'acct_wrong'), /ACCOUNT_MISMATCH/);
  await assert.rejects(syncSession(store, { ...paid, amount_total: 1 }, 'acct_seller'), /PAYMENT_MISMATCH/);
  const e = event('checkout.session.completed'); await syncSession(store, paid, 'acct_seller', e); await syncSession(store, paid, 'acct_seller', e);
  await syncSession(store, { ...paid, status: 'expired', payment_status: 'unpaid' }, 'acct_seller', event('checkout.session.expired'));
  const saved = await store.getOrder(o.id); assert.equal(saved.state, 'paid'); assert.equal(saved.inventory_held, true);
  assert.equal((await db.query('select is_for_sale from artworks where id=$1', [o.artwork_id])).rows[0].is_for_sale, false);
  await command('fulfill', ids.seller, { order_id: o.id, status: 'shipped', tracking: 'TEST' });
  await assert.rejects(command('refund_request', ids.buyer, { order_id: o.id, request_id: randomUUID(), amount_cents: 100 }), /FORBIDDEN/);
  const attempts = await Promise.allSettled([7000, 7000].map(amount_cents => command('refund_request', ids.seller, { order_id: o.id, request_id: randomUUID(), amount_cents })));
  assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
  const request = attempts.find(r => r.status === 'fulfilled').value;
  const refund = { id: 're_concurrent', payment_intent: paid.payment_intent, amount: 7000, status: 'succeeded', metadata: { requestId: request.id } };
  await syncRefund(store, refund, saved); // use the authoritative PI snapshot
  const currentRefund = gateway(); currentRefund.refundList.push(refund);
  await refreshRefund(store, currentRefund.api, saved, refund.id, event('refund.updated'));
  assert.equal((await store.getOrder(saved.id)).refunded_cents, 7000);
  await assert.rejects(command('refund_request', ids.seller, { order_id: saved.id, request_id: request.id, amount_cents: 200 }), /IDEMPOTENCY_CONFLICT/);
  const full = { id: 're_external', payment_intent: paid.payment_intent, amount: 4000, status: 'succeeded', metadata: {} };
  await syncRefund(store, full, saved);
  assert.equal((await store.getOrder(saved.id)).state, 'refunded'); assert.equal((await store.getOrder(saved.id)).inventory_held, true);
  await enabled(true);
});
test('Stripe create timeout retries the same session key; no second payment is created', async () => {
  const q = await artwork(); const g = gateway(); const create = g.api.checkout.sessions.create; let fail = true;
  g.api.checkout.sessions.create = async (...args) => { const s = await create(...args); if (fail) { fail = false; throw Error('timeout'); } return s; };
  await assert.rejects(startCheckout(store, g.api, config, ids.buyer, q), /timeout/);
  const result = await startCheckout(store, g.api, config, ids.buyer, q);
  assert.equal(g.sessions.size, 1); assert.equal(g.calls[0][2].idempotencyKey, g.calls[1][2].idempotencyKey);
  assert.equal(g.calls[0][2].stripeAccount, 'acct_seller'); assert.equal(g.calls[0][1].mode, 'payment');
  assert.equal(g.calls[0][1].customer, undefined); assert.equal(g.calls[0][1].payment_intent_data.application_fee_amount, 500);
  assert.ok(result.url.startsWith('https://checkout.'));
});
test('OFF during Stripe creation expires hosted session and does not return a purchase URL', async () => {
  const g = gateway(); const create = g.api.checkout.sessions.create;
  g.api.checkout.sessions.create = async (...args) => { const s = await create(...args); await enabled(false); return s; };
  await assert.rejects(startCheckout(store, g.api, config, ids.buyer, await artwork()), /PAYMENTS_OFF/);
  const s = [...g.sessions.values()][0]; assert.equal(s.status, 'expired'); assert.equal((await store.getOrder(s.metadata.orderId)).inventory_held, false);
  await enabled(true);
});
test('asynchronous processing holds stock until authoritative cancellation, including while OFF', async () => {
  const o = await reserve(); const s = session(o, { status: 'complete' }); const g = gateway();
  await syncSession(store, s, 'acct_seller'); await syncSession(store, { ...s, status: 'expired' }, 'acct_seller');
  assert.equal((await store.getOrder(o.id)).inventory_held, true);
  let intent = { id: s.payment_intent, status: 'processing', amount: o.total_cents, currency: o.currency, metadata: s.metadata, livemode: false };
  g.api.paymentIntents.retrieve = async () => intent;
  g.api.paymentIntents.cancel = async (id, params, scope) => { assert.equal(scope.stripeAccount, 'acct_seller'); intent = { ...intent, status: 'canceled' }; return intent; };
  await enabled(false); await assert.rejects(syncFailedPayment(store, g.api, s, 'acct_seller'), /REVIEW_REQUIRED/);
  intent.status = 'requires_payment_method'; await syncFailedPayment(store, g.api, s, 'acct_seller', event('checkout.session.async_payment_failed'));
  assert.equal((await store.getOrder(o.id)).state, 'canceled'); assert.equal((await store.getOrder(o.id)).inventory_held, false);
  await enabled(true);
});
test('refund API works OFF, scopes to connected account and deduplicates retries', async () => {
  let o = await reserve(); await syncSession(store, session(o, { status: 'complete', payment_status: 'paid' }), 'acct_seller'); o = await store.getOrder(o.id);
  const g = gateway(); const requestId = randomUUID(); await enabled(false);
  const r = await requestRefund(store, g.api, o, ids.seller, requestId, 11000);
  assert.equal((await requestRefund(store, g.api, o, ids.seller, requestId, 11000)).id, r.id);
  const call = g.calls.find(c => c[0] === 'refund'); assert.equal(call[2].stripeAccount, 'acct_seller'); assert.equal(call[1].refund_application_fee, false);
  assert.equal(g.refundList.length, 1); assert.equal((await store.getOrder(o.id)).inventory_held, true);
  await db.query('delete from artworks where id=$1', [o.artwork_id]); assert.equal((await store.getOrder(o.id)).artwork_title, 'Unique work');
  await enabled(true);
});
test('expired Stripe idempotency window never recreates an uncertain checkout', async () => {
  const q = await artwork(); const o = await reserve(q); await db.query('update commerce_orders set created_at=now()-interval \'25 hours\' where id=$1', [o.id]);
  const g = gateway(); await assert.rejects(startCheckout(store, g.api, config, ids.buyer, q), /REVIEW_REQUIRED/); assert.equal(g.calls.length, 0); assert.equal((await store.getOrder(o.id)).inventory_held, true);
});
test('four-language key parity and existing subscription routes are preserved', () => {
  const { commerceTranslations: copies } = require('./.compiled/translations.js');
  const keys = o => Object.entries(o).flatMap(([k, v]) => typeof v === 'string' ? [k] : keys(v).map(sub => `${k}.${sub}`)).sort();
  for (const lang of ['en', 'fr', 'es']) assert.deepEqual(keys(copies[lang]), keys(copies.it));
  for (const path of ['lib/stripe/server.ts', 'app/api/billing/create-checkout-session/route.ts', 'app/api/billing/create-portal-session/route.ts', 'app/api/marketplace/templates/[templateId]/checkout/route.ts']) {
    const base = execFileSync('git', ['show', `219767d:web/${path}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    assert.equal(readFileSync(`${root}/${path}`, 'utf8').replaceAll('\r\n', '\n'), base.replaceAll('\r\n', '\n'));
  }
});
test('Stripe signatures reject altered payloads and a different webhook secret', () => {
  const stripe = new Stripe('sk_test_fake'); const payload = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed', account: 'acct_seller', data: { object: {} } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_connect' });
  assert.equal(stripe.webhooks.constructEvent(payload, signature, 'whsec_connect').id, 'evt_test');
  assert.throws(() => stripe.webhooks.constructEvent(payload + ' ', signature, 'whsec_connect'));
  assert.throws(() => stripe.webhooks.constructEvent(payload, signature, 'whsec_billing'));
});

// Run the actual route modules with network adapters replaced. Signature checking,
// route authorization, request validation, business logic and SQL remain real.
function loadTs(path, mocks = {}) {
  const output = ts.transpileModule(readFileSync(`${root}/${path}`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const scopedRequire = name => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  new Function('require', 'module', 'exports', output)(scopedRequire, module, module.exports);
  return module.exports;
}
test('HTTP: Connect signatures, account/mode isolation, duplicates, retries and late refund event', async () => {
  await enabled(true); let o = await reserve(); const g = gateway(); const signed = new Stripe('sk_test_fake');
  let current = session(o, { status: 'complete', payment_status: 'paid' }); g.sessions.set(current.id, current);
  g.api.webhooks = signed.webhooks;
  const handler = loadTs('app/api/stripe/connect-webhook/route.ts', {
    '@/lib/supabase/admin': { createAdminClient: () => { throw Error('Unexpected account mutation'); } },
    '@/lib/commerce/config': { commerceConfig: () => config },
    '@/lib/commerce/server': { commerceStore: () => store, stripeClient: () => g.api, json: (data, status = 200) => Response.json(data, { status }) },
    '@/lib/commerce/engine': require('./.compiled/engine.js'),
  });
  const send = async (e, secret = config.webhookSecret) => { const payload = JSON.stringify(e); return handler.POST(new Request('https://commerce.example/api/stripe/connect-webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': signed.webhooks.generateTestHeaderString({ payload, secret }) } })); };
  const e = { ...event('checkout.session.completed'), account: 'acct_seller', livemode: false, data: { object: current } };
  assert.equal((await send(e, 'whsec_wrong')).status, 400);
  assert.equal((await send({ ...e, account: undefined })).status, 200); assert.equal((await store.getOrder(o.id)).state, 'reserved');
  assert.equal((await send({ ...e, livemode: true })).status, 200); assert.equal((await store.getOrder(o.id)).state, 'reserved');
  // Simulate the refund arriving before checkout completion. Route recovers checkout.
  g.api.paymentIntents.retrieve = async () => ({ id: current.payment_intent, metadata: current.metadata });
  g.api.checkout.sessions.list = async () => ({ data: [current] });
  const refund = { id: 're_early_webhook', amount: 500, payment_intent: current.payment_intent, status: 'succeeded', metadata: {} }; g.refundList.push(refund);
  assert.equal((await send({ ...e, ...event('refund.created'), data: { object: refund } })).status, 200);
  assert.equal((await store.getOrder(o.id)).state, 'partially_refunded');
  await enabled(false);
  // Delayed webhook contents say succeeded; the current Stripe GET says failed.
  refund.status = 'failed';
  const failure = { ...e, ...event('refund.failed'), data: { object: { ...refund, status: 'succeeded' } } };
  assert.equal((await send(failure)).status, 200);
  assert.equal((await store.getOrder(o.id)).state, 'paid');
  assert.equal((await store.getOrder(o.id)).refunded_cents, 0);
  const revision = (await store.getOrder(o.id)).refund_revision;
  assert.equal((await send(failure)).status, 200);
  assert.equal((await store.getOrder(o.id)).refund_revision, revision);
  refund.status = 'requires_action';
  assert.equal((await send({ ...e, ...event('refund.updated'), data: { object: refund } })).status, 200);
  assert.equal((await store.getOrder(o.id)).refunded_cents, 0);
  refund.status = 'succeeded';
  assert.equal((await send({ ...e, ...event('refund.updated'), data: { object: refund } })).status, 200);
  assert.equal((await send(e)).status, 200); assert.equal((await send(e)).status, 200);
  assert.equal((await store.getOrder(o.id)).refunded_cents, 500);
  const retrieve = g.api.checkout.sessions.retrieve; g.api.checkout.sessions.retrieve = async () => { throw Error('network down'); };
  assert.equal((await send({ ...e, id: 'evt_retry' })).status, 500);
  g.api.checkout.sessions.retrieve = retrieve; assert.equal((await send({ ...e, id: 'evt_retry' })).status, 200);
  await enabled(true);
});
test('HTTP: existing billing webhook ignores signed connected events before touching subscriptions', async () => {
  const stripe = new Stripe('sk_test_fake'); let touched = false;
  const handler = loadTs('app/api/stripe/webhook/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/stripe/server': { getStripe: () => stripe },
    '@/lib/plans': { normalizePlanName: s => s },
    '@/lib/supabase/admin': { createAdminClient: () => { touched = true; throw Error('Unexpected subscription write'); } },
  });
  const prior = process.env.STRIPE_WEBHOOK_SECRET; process.env.STRIPE_WEBHOOK_SECRET = 'whsec_billing';
  try {
    const payload = JSON.stringify({ ...event('customer.subscription.updated'), account: 'acct_seller', livemode: false, data: { object: {} } });
    const response = await handler.POST(new Request('https://commerce.example/api/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_billing' }) } }));
    assert.equal(response.status, 200); assert.equal(touched, false);
    const base = execFileSync('git', ['show', '219767d:web/app/api/stripe/webhook/route.ts'], { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n');
    const now = readFileSync(`${root}/app/api/stripe/webhook/route.ts`, 'utf8').replaceAll('\r\n', '\n');
    assert.equal(now.replace('  // Connected sellers have a separate ledger and webhook. Never grant platform plans here.\n  if (event.account) return NextResponse.json({ received: true, ignored: true });\n\n', ''), base);
  } finally { if (prior === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = prior; }
});
test('HTTP: CSRF, authentication, order ownership, OFF and activation approval enforce server gates', async () => {
  const configModule = { ...require('./.compiled/config.js'), commerceConfig: () => ({ ...config, activationApproved: false }) };
  let user = { id: ids.buyer, email: 'buyer@example.com', email_confirmed_at: '2026-10-08' }, role = 'user';
  const fakeDb = { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: user?.id, role } }) }) }) }) };
  const server = loadTs('lib/commerce/server.ts', {
    'server-only': {}, './config': configModule,
    '@/lib/supabase/admin': { createAdminClient: () => fakeDb },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
  });
  const handler = loadTs('app/api/commerce/[...path]/route.ts', {
    '@/lib/commerce/config': configModule,
    '@/lib/commerce/countries': { shippingCountries: new Set(['IT', 'FR']) },
    '@/lib/commerce/server': { ...server, commerceStore: () => store },
    '@/lib/commerce/engine': require('./.compiled/engine.js'),
    'next/headers': { cookies: () => { throw Error('Cookies not expected'); } },
  });
  const post = (path, body, origin = config.origin) => handler.POST(new Request(`${config.origin}/api/commerce/${path}`, { method: 'POST', headers: { origin }, body: JSON.stringify(body) }), { params: Promise.resolve({ path: path.split('/') }) });
  const q = await artwork();
  assert.equal((await post('checkout', q, 'https://attacker.example')).status, 403);
  const originalUser = user; user = null; assert.equal((await post('checkout', q)).status, 401); user = originalUser;
  const order = await reserve(q, ids.other); const forbidden = await post(`orders/${order.id}/sync`, {}); assert.equal(forbidden.status, 403);
  await enabled(false); const blocked = await post('checkout', q); assert.equal((await blocked.json()).error, 'NOT_CONFIGURED');
  user = { ...user, id: ids.admin }; role = 'admin'; assert.equal((await post('admin', { enabled: true })).status, 403); assert.equal(await store.enabled(), false);
  await enabled(true);
});
test('UI: purchase controls are visible but disabled initially in IT/EN/FR/ES; order controls remain present', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const translations = require('./.compiled/translations.js');
  for (const locale of ['it', 'en', 'fr', 'es']) {
    const ui = loadTs('components/commerce/CommerceUI.tsx', {
      'next/link': { __esModule: true, default: p => React.createElement('a', p) },
      '@/components/i18n/LanguageProvider': { useLanguage: () => ({ locale }) },
      '@/lib/commerce/translations': translations,
    });
    const html = renderToStaticMarkup(React.createElement(ui.BuyArtwork, { artworkId: randomUUID() }));
    assert.match(html, /<button[^>]*disabled=""/); assert.ok(html.includes(translations.commerceTranslations[locale].buy));
    const panel = renderToStaticMarkup(React.createElement(ui.CommercePanel, { mode: 'seller' }));
    assert.ok(panel.includes(translations.commerceTranslations[locale].off)); assert.ok(panel.includes(translations.commerceTranslations[locale].orders));
  }
});

async function paidRefundFixture() {
  await enabled(true);
  const order = await reserve();
  await syncSession(store, session(order, { status: 'complete', payment_status: 'paid' }), 'acct_seller');
  await enabled(false);
  const saved = await store.getOrder(order.id);
  const g = gateway();
  const refund = { id: `re_${randomUUID()}`, payment_intent: saved.stripe_payment_intent_id, amount: saved.total_cents, status: 'succeeded', metadata: {} };
  g.refundList.push(refund);
  return { order: saved, g, refund };
}

test('refund correction OFF: succeeded -> failed restores paid without releasing the artwork', async () => {
  const { order, g, refund } = await paidRefundFixture();
  try {
    await refreshRefund(store, g.api, order, refund.id);
    assert.equal((await store.getOrder(order.id)).state, 'refunded');
    refund.status = 'failed';
    const failure = event('refund.failed');
    await refreshRefund(store, g.api, order, refund.id, failure);
    let saved = await store.getOrder(order.id);
    assert.equal(saved.state, 'paid'); assert.equal(saved.refunded_cents, 0);
    assert.equal(saved.inventory_held, true); assert.equal(saved.refund_revision, 2);
    await refreshRefund(store, g.api, order, refund.id, failure);
    saved = await store.getOrder(order.id);
    assert.equal(saved.refund_revision, 2);
    assert.equal((await db.query('select is_for_sale from artworks where id=$1', [order.artwork_id])).rows[0].is_for_sale, false);
    await command('refund_request', ids.seller, { order_id: order.id, request_id: randomUUID(), amount_cents: order.total_cents });
    assert.equal(await store.enabled(), false);
  } finally { await enabled(true); }
});

test('refund correction OFF: requires_action and pending reserve the amount until resolved', async () => {
  const { order, g, refund } = await paidRefundFixture();
  try {
    for (const status of ['succeeded', 'requires_action', 'pending', 'succeeded', 'canceled']) {
      refund.status = status;
      await refreshRefund(store, g.api, order, refund.id);
      const saved = await store.getOrder(order.id);
      assert.equal(saved.state, status === 'succeeded' ? 'refunded' : 'paid');
      assert.equal(saved.refunded_cents, status === 'succeeded' ? order.total_cents : 0);
      assert.equal(saved.inventory_held, true);
      if (['requires_action', 'pending'].includes(status)) {
        await assert.rejects(command('refund_request', ids.seller, { order_id: order.id, request_id: randomUUID(), amount_cents: 1 }), /REFUND_TOO_LARGE/);
      }
    }
    await command('refund_request', ids.seller, { order_id: order.id, request_id: randomUUID(), amount_cents: order.total_cents });
  } finally { await enabled(true); }
});

test('late failures recompute multiple refunds and preserve fulfillment while OFF', async () => {
  const { order, g, refund } = await paidRefundFixture();
  try {
    await command('fulfill', ids.seller, { order_id: order.id, status: 'shipped', tracking: 'TEST-REFUND' });
    refund.amount = 7000;
    const second = { ...refund, id: `re_${randomUUID()}`, amount: 4000 };
    g.refundList.push(second);
    await refreshRefund(store, g.api, order, refund.id);
    assert.equal((await store.getOrder(order.id)).state, 'partially_refunded');
    await refreshRefund(store, g.api, order, second.id);
    assert.equal((await store.getOrder(order.id)).state, 'refunded');
    refund.status = 'failed'; await refreshRefund(store, g.api, order, refund.id);
    let saved = await store.getOrder(order.id);
    assert.equal(saved.refunded_cents, 4000); assert.equal(saved.state, 'partially_refunded');
    second.status = 'failed'; await refreshRefund(store, g.api, order, second.id);
    saved = await store.getOrder(order.id);
    assert.equal(saved.refunded_cents, 0); assert.equal(saved.state, 'paid');
    assert.equal(saved.fulfillment_status, 'shipped'); assert.equal(saved.tracking_reference, 'TEST-REFUND');
    assert.equal(saved.inventory_held, true);
  } finally { await enabled(true); }
});

test('concurrent Stripe reads reject the stale snapshot and retry without losing the event', { timeout: 10000 }, async () => {
  const { order, g, refund } = await paidRefundFixture();
  let release, entered;
  const blocked = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  let calls = 0, slow;
  const first = event('refund.updated'), second = event('refund.failed');
  g.api.refunds.retrieve = async (id, params, scope) => {
    assert.equal(scope.stripeAccount, order.stripe_account_id);
    assert.equal(id, refund.id);
    const snapshot = { ...refund };
    if (++calls === 1) { entered(); await blocked; }
    return snapshot;
  };
  try {
    slow = refreshRefund(store, g.api, order, refund.id, first);
    await started;
    refund.status = 'failed';
    await refreshRefund(store, g.api, order, refund.id, second);
    release(); await slow;
    const saved = await store.getOrder(order.id);
    assert.equal(calls, 3); assert.equal(saved.refund_revision, 2);
    assert.equal(saved.state, 'paid'); assert.equal(saved.refunded_cents, 0);
    assert.equal((await db.query('select state from commerce_refunds where order_id=$1', [order.id])).rows[0].state, 'failed');
    assert.equal((await db.query('select count(*)::int n from commerce_events where order_id=$1', [order.id])).rows[0].n, 2);
    assert.equal(saved.inventory_held, true); assert.equal(await store.enabled(), false);
  } finally { release(); if (slow) await slow.catch(() => {}); await enabled(true); }
});

test('missing/stale refund revisions fail closed and do not consume the webhook event', async () => {
  const { order, g, refund } = await paidRefundFixture();
  try {
    const incoming = event('refund.updated');
    await assert.rejects(applyRefundSnapshot(store, refund, { ...order, refund_revision: undefined }, incoming), /STALE_REFUND_SNAPSHOT/);
    await refreshRefund(store, g.api, order, refund.id);
    await assert.rejects(applyRefundSnapshot(store, refund, order, incoming), /STALE_REFUND_SNAPSHOT/);
    assert.equal((await db.query('select count(*)::int n from commerce_events where order_id=$1', [order.id])).rows[0].n, 0);
    refund.status = 'failed';
    await refreshRefund(store, g.api, order, refund.id, incoming);
    assert.equal((await store.getOrder(order.id)).state, 'paid');
    assert.equal((await db.query('select count(*)::int n from commerce_events where order_id=$1', [order.id])).rows[0].n, 1);
  } finally { await enabled(true); }
});

test('persistent revision conflicts stop after five retries; other errors are not retried', async () => {
  const { order, g, refund } = await paidRefundFixture();
  try {
    let attempts = 0;
    const conflicting = { ...store, command: async () => { attempts++; throw Error('STALE_REFUND_SNAPSHOT'); } };
    await assert.rejects(refreshRefund(conflicting, g.api, order, refund.id), /REVIEW_REQUIRED/);
    assert.equal(attempts, 5);
    g.api.refunds.retrieve = async () => { attempts++; throw Error('network unavailable'); };
    attempts = 0;
    await assert.rejects(refreshRefund(store, g.api, order, refund.id), /network unavailable/);
    assert.equal(attempts, 1);
    assert.equal((await store.getOrder(order.id)).refund_revision, 0);
    assert.equal((await db.query('select count(*)::int n from commerce_refunds where order_id=$1', [order.id])).rows[0].n, 0);
  } finally { await enabled(true); }
});
