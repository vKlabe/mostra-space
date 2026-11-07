import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), ts = require('typescript');
const root = fileURLToPath(new URL('../../', import.meta.url));
function load(path, mocks = {}) {
  const output = ts.transpileModule(readFileSync(root + path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => name in mocks ? mocks[name] : require(name), loaded, loaded.exports);
  return loaded.exports;
}
const configModule = load('lib/commerce/config.ts');
const documents = load('lib/commerce/commercial-terms.ts');
const terms = load('lib/commerce/seller-terms.ts', { 'server-only': {}, './config': configModule, './commercial-terms': documents });
const validConfig = () => configModule.commerceConfig({
  STRIPE_SECRET_KEY: 'sk_live_placeholder', STRIPE_CONNECT_WEBHOOK_SECRET: 'whsec_placeholder',
  STRIPE_CONNECT_CLIENT_ID: 'ca_placeholder', NEXT_PUBLIC_SITE_URL: 'https://commerce.example',
  COMMERCE_FEE_BPS: '1000', COMMERCE_FEE_BASE: 'artwork', COMMERCE_REFUND_APPLICATION_FEE: 'true',
  COMMERCE_COMMERCIAL_REVIEWED: 'false', COMMERCE_ACTIVATION_APPROVED: 'false',
});
const sellerId = '11111111-1111-4111-8111-111111111111';
const orderId = '22222222-2222-4222-8222-222222222222';

function harness() {
  const config = validConfig(), calls = [], states = [], cookies = new Map();
  const h = { config, calls, states, cookies, authenticated: true, role: 'gallerist', accepted: true,
    seller: null, tokenMode: true, tokenScope: 'read_write', tokenAccount: 'acct_owner', accountType: 'standard', readError: false };
  const offered = terms.sellerTermsOffer(config);
  const acceptance = { details: { version: offered.version, hash: offered.hash, fee_bps: 1000, fee_base: 'artwork',
    refund_application_fee: true, livemode: true }, created_at: '2026-11-06T11:00:00Z' };
  const db = { from(table) {
    const filters = []; let deleting = false, update;
    const q = {
      select: () => q, eq: (key, value) => { filters.push([key, value]); return q; },
      gt: (key, value) => { filters.push([key, value, 'gt']); return q; },
      order: () => q, limit: () => q, delete: () => { deleting = true; return q; },
      update: value => { update = value; return q; },
      insert: async value => { assert.equal(table, 'commerce_oauth_states'); states.push(value); return { error: null }; },
      upsert: async value => { assert.equal(table, 'commerce_sellers'); h.seller = value; calls.push(['saveSeller', value]); return { error: null }; },
      single: async () => { assert.equal(table, 'profiles'); return { data: { id: sellerId, role: h.role }, error: null }; },
      maybeSingle: async () => {
        if (h.readError) return { data: null, error: { code: 'unavailable' } };
        if (table === 'commerce_settings') return { data: { payments_enabled: false }, error: null };
        if (table === 'commerce_audit') {
          assert.ok(filters.some(([k,v]) => k === 'actor_id' && v === sellerId));
          return { data: h.accepted ? acceptance : null, error: null };
        }
        if (table === 'commerce_sellers') {
          assert.ok(filters.some(([k,v]) => k === 'seller_id' && v === sellerId));
          return { data: h.seller, error: null };
        }
        if (table === 'commerce_oauth_states') {
          assert.equal(deleting, true);
          const index = states.findIndex(row => filters.every(([k,v,op]) => op === 'gt' ? row[k] > v : row[k] === v));
          const row = index >= 0 ? states.splice(index, 1)[0] : null;
          return { data: row ? { seller_id: row.seller_id } : null, error: null };
        }
        throw Error('Unexpected table ' + table);
      },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          assert.equal(table, 'commerce_sellers');
          assert.ok(filters.some(([k,v]) => k === 'seller_id' && v === sellerId));
          Object.assign(h.seller, update); return { error: null };
        }).then(resolve, reject);
      },
    };
    return q;
  } };
  const cm = { ...configModule, commerceConfig: () => config };
  const server = load('lib/commerce/server.ts', {
    'server-only': {}, './config': cm, './seller-terms': terms, './commercial-terms': documents,
    '@/lib/supabase/admin': { createAdminClient: () => db },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({
      data: { user: h.authenticated ? { id: sellerId, email: 'seller@example.test', email_confirmed_at: 'yes' } : null },
      error: null,
    }) } }) },
  });
  const stripe = {
    oauth: { token: async () => { calls.push('token'); return { stripe_user_id: h.tokenAccount, scope: h.tokenScope, livemode: h.tokenMode }; } },
    accounts: { retrieve: async id => { calls.push(['account', id]); return { id, type: h.accountType,
      charges_enabled: true, payouts_enabled: true, details_submitted: true }; } },
    accountLinks: { create: async data => { calls.push(['link', data]); return { url: 'https://connect.stripe.com/setup/owned' }; } },
  };
  const realStore = server.commerceStore();
  const route = load('app/api/commerce/[...path]/route.ts', {
    '@/lib/commerce/config': cm, '@/lib/commerce/server': { ...server, stripeClient: () => stripe,
      commerceStore: () => ({ ...realStore, getOrder: async () => ({ id: orderId, buyer_id: sellerId, seller_id: sellerId, state: 'checkout_open' }),
        command: async () => { throw Error('Sales mutation must remain blocked'); } }) },
    '@/lib/commerce/seller-terms': terms, '@/lib/commerce/countries': { shippingCountries: new Set(['IT']) },
    '@/lib/commerce/engine': { startCheckout: async () => { throw Error('Checkout must remain blocked'); } },
    'next/headers': { cookies: async () => ({
      get: name => cookies.get(name),
      set: (name, value, options) => { cookies.set(name, { value, ...options }); },
    }) },
  });
  h.post = (path, data = {}, origin = config.origin) => route.POST(new Request(config.origin + '/api/commerce/' + path,
    { method: 'POST', headers: { origin }, body: JSON.stringify(data) }), { params: Promise.resolve({ path: path.split('/') }) });
  h.get = (path, params = {}) => route.GET(new Request(config.origin + '/api/commerce/' + path + '?' + new URLSearchParams(params)),
    { params: Promise.resolve({ path: path.split('/') }) });
  h.begin = async () => {
    const response = await h.post('seller/connect', { stripe_account_id: 'acct_attacker' });
    assert.equal(response.status, 200);
    const url = new URL((await response.json()).url);
    assert.equal(url.hostname, 'connect.stripe.com'); assert.equal(url.searchParams.get('scope'), 'read_write');
    assert.equal(url.searchParams.get('redirect_uri'), config.origin + '/api/commerce/connect/callback');
    return url.searchParams.get('state');
  };
  h.callback = state => h.get('connect/callback', { state, code: 'code_test_placeholder' });
  return h;
}

test('seller connection: only sales approval flags are excluded; technical blockers still fail closed', () => {
  const config = validConfig();
  assert.deepEqual(configModule.configurationBlockers(config), ['COMMERCE_COMMERCIAL_REVIEWED', 'COMMERCE_ACTIVATION_APPROVED']);
  assert.deepEqual(configModule.sellerConnectionBlockers(config), []);
  for (const [key,value,expected] of [
    ['stripeKey','', 'STRIPE_SECRET_KEY'], ['webhookSecret','', 'STRIPE_CONNECT_WEBHOOK_SECRET'],
    ['clientId','', 'STRIPE_CONNECT_CLIENT_ID'], ['origin','http://untrusted.example', 'NEXT_PUBLIC_SITE_URL'],
    ['feeBps',null,'COMMERCE_FEE_BPS'], ['feeBase',null,'COMMERCE_FEE_BASE'],
    ['refundApplicationFee',null,'COMMERCE_REFUND_APPLICATION_FEE'],
  ]) assert.ok(configModule.sellerConnectionBlockers({ ...config, [key]: value }).includes(expected));
});

test('HTTP seller connection OFF: OAuth, callback, onboarding refresh/return work without enabling sales; state cannot replay', async () => {
  const h = harness(), state = await h.begin();
  const cookie = h.cookies.get('mostraspace-commerce-oauth');
  assert.equal(cookie.value, state); assert.equal(cookie.httpOnly, true); assert.equal(cookie.secure, true);
  assert.equal(cookie.sameSite, 'lax'); assert.equal(cookie.maxAge, 600);
  const response = await h.callback(state);
  assert.equal(response.status, 303); assert.equal(response.headers.get('location'), h.config.origin + '/dashboard/vendite?connected=1');
  assert.equal(h.seller.stripe_account_id, 'acct_owner'); assert.equal(h.seller.seller_id, sellerId); assert.equal(h.seller.livemode, true);
  h.cookies.set('mostraspace-commerce-oauth', cookie);
  assert.equal((await h.callback(state)).status, 400);
  assert.equal(h.calls.filter(c => c === 'token').length, 1);
  assert.equal((await h.post('seller/connect', { stripe_account_id: 'acct_attacker' })).status, 200);
  const refresh = await h.get('connect/onboarding-refresh', { account: 'acct_attacker' });
  assert.equal(refresh.status, 303);
  assert.equal(refresh.headers.get('cache-control'), 'no-store, max-age=0');
  for (const [,link] of h.calls.filter(c => Array.isArray(c) && c[0] === 'link')) {
    assert.equal(link.account, 'acct_owner'); assert.equal(link.type, 'account_onboarding');
  }
  assert.equal((await h.get('connect/onboarding-return')).status, 303);
  assert.deepEqual(await (await h.get('status')).json(), { paymentsEnabled: false });
});

test('HTTP seller connection OFF: rejects unauthenticated users, buyers, CSRF, missing consent, database failure and missing configuration', async () => {
  for (const [change,expected] of [
    [h => { h.authenticated = false; },401], [h => { h.role = 'user'; },403],
    [h => { h.accepted = false; },409], [h => { h.readError = true; },503],
    [h => { h.config.webhookSecret = ''; },503], [h => { h.config.clientId = ''; },503],
  ]) {
    const h = harness(); change(h);
    assert.equal((await h.post('seller/connect')).status, expected);
    assert.equal(h.states.length, 0); assert.equal(h.calls.length, 0);
  }
  const h = harness();
  assert.equal((await h.post('seller/connect', {}, 'https://attacker.example')).status, 403);
  assert.equal(h.states.length, 0);
});

test('HTTP seller callback: invalid, expired or other-seller state and changed consent are rejected before Stripe', async () => {
  for (const change of [
    h => { h.states[0].expires_at = '2020-01-01T00:00:00Z'; },
    h => { h.states[0].seller_id = 'another-seller'; },
    h => { h.cookies.clear(); },
    h => { h.cookies.set('mostraspace-commerce-oauth', { value: 'forged' }); },
    h => { h.accepted = false; },
    h => { h.config.feeBps = 1500; },
  ]) {
    const h = harness(), state = await h.begin(); change(h);
    assert.ok([400,409].includes((await h.callback(state)).status));
    assert.equal(h.calls.length, 0); assert.equal(h.seller, null);
  }
});

test('HTTP seller connection: test/live mismatch, insufficient scope, non-standard and different locked account never bind', async () => {
  for (const change of [
    h => { h.tokenMode = false; }, h => { h.tokenScope = 'read_only'; },
    h => { h.accountType = 'express'; },
    h => { h.seller = { seller_id: sellerId, stripe_account_id: 'acct_existing', livemode: true, disconnected: true }; },
  ]) {
    const h = harness(), state = await h.begin(); change(h);
    assert.equal((await h.callback(state)).status, 409);
    assert.equal(h.calls.filter(c => Array.isArray(c) && c[0] === 'saveSeller').length, 0);
  }
  const h = harness();
  h.seller = { seller_id: sellerId, stripe_account_id: 'acct_test', livemode: false, disconnected: false };
  assert.equal((await h.post('seller/connect')).status, 409);
  assert.equal((await h.get('connect/onboarding-refresh')).status, 409);
  assert.equal(h.calls.length, 0);
});

test('HTTP sales remain blocked after seller connection while approvals or the database switch are OFF', async () => {
  const h = harness(), state = await h.begin(); await h.callback(state);
  const quote = { artwork_id: sellerId, terms_accepted: true, shipping_country: 'IT',
    quote_terms: 'https://seller.example/terms', quote_version: 'now', quote_price: 10, quote_shipping: 0 };
  const listing = { enabled: true, terms_url: quote.quote_terms, shipping_amount: '0', shipping_countries: 'IT' };
  for (const approvals of [false,true]) {
    h.config.commercialReviewed = approvals; h.config.activationApproved = approvals;
    for (const [path,body] of [['checkout',quote],['listings/' + sellerId,listing],['orders/' + orderId + '/resume',{}]]) {
      const response = await h.post(path, body);
      assert.equal((await response.json()).error, approvals ? 'PAYMENTS_OFF' : 'NOT_CONFIGURED');
    }
    assert.deepEqual(await (await h.get('status')).json(), { paymentsEnabled: false });
  }
});
