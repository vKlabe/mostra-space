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
const documentModule = load('lib/commerce/commercial-terms.ts');
const terms = load('lib/commerce/seller-terms.ts', { 'server-only': {}, './config': configModule, './commercial-terms': documentModule });
const config = { feeBps: 1000, feeBase: 'artwork', refundApplicationFee: true, livemode: true, origin: 'https://commerce.example' };
function harness() {
  const rows = [], effects = []; let readError = false, writeError = false;
  const db = { from(table) {
    if (table === 'artworks') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { owner_id: 'seller' }, error: null }) }) }) };
    assert.equal(table, 'commerce_audit');
    const filters = [];
    const query = {
      select: () => query, eq: (key, value) => { filters.push([key, value]); return query; },
      order: () => query, limit: () => query,
      maybeSingle: async () => ({ data: rows.filter(r => filters.every(([k,v]) => r[k] === v)).at(-1) || null, error: readError ? {} : null }),
      insert: async row => { if (!writeError) rows.push({ ...row, created_at: '2026-11-05T12:00:00Z' }); return { error: writeError ? {} : null }; },
    }; return query;
  } };
  const offer = terms.sellerTermsOffer(config);
  const body = { accepted: true, version: offer.version, hash: offer.hash, locale: 'it' };
  return { db, rows, effects, body, readFail: () => { readError = true; }, writeFail: () => { writeError = true; } };
}
test('seller consent: explicit current document required; false/string/old hash cannot be accepted', async () => {
  const h = harness();
  for (const change of [{ accepted: false }, { accepted: 'true' }, { version: 'old' }, { hash: 'forged' }, { locale: 'unknown' }]) {
    await assert.rejects(terms.acceptSellerTerms(h.db, 'seller', config, { ...h.body, ...change }), { code: 'SELLER_TERMS_REQUIRED' });
  }
  assert.equal(h.rows.length, 0);
  assert.equal((await terms.sellerTermsStatus(h.db, 'seller', config)).accepted, false);
});
test('seller consent: authenticated identity, immutable document snapshot and server prices are recorded; retry is idempotent', async () => {
  const h = harness();
  await terms.acceptSellerTerms(h.db, 'seller', config, { ...h.body, seller_id: 'attacker', fee_bps: 0 });
  await terms.acceptSellerTerms(h.db, 'seller', config, h.body);
  assert.equal(h.rows.length, 1);
  assert.equal(h.rows[0].actor_id, 'seller');
  assert.deepEqual(h.rows[0].details.document, documentModule.artworkCommercialTerms);
  assert.equal(h.rows[0].details.fee_bps, 1000);
  assert.equal((await terms.sellerTermsStatus(h.db, 'seller', config)).accepted, true);
  assert.equal((await terms.sellerTermsStatus(h.db, 'other', config)).accepted, false);
  assert.equal((await terms.sellerTermsStatus(h.db, 'seller', { ...config, livemode: false })).accepted, false);
  assert.equal((await terms.sellerTermsStatus(h.db, 'seller', { ...config, feeBps: 1500 })).accepted, false);
  assert.equal((await terms.sellerTermsStatus(h.db, 'seller', { ...config, refundApplicationFee: false })).accepted, false);
});
test('seller consent: database failures never become acceptance', async () => {
  for (const fail of ['readFail', 'writeFail']) {
    const h = harness(); h[fail]();
    await assert.rejects(terms.acceptSellerTerms(h.db, 'seller', config, h.body), { code: 'SERVICE_UNAVAILABLE' });
    assert.equal(h.rows.length, 0);
  }
});
test('HTTP seller consent: authorization, CSRF, ownership and checkout/listing/connect gates; acceptance works with payments OFF', async () => {
  const h = harness(); let authenticated = true, role = 'gallerist', payments = false;
  const { CommerceError } = configModule;
  const server = {
    actor: async required => {
      if (!authenticated) throw new CommerceError('UNAUTHORIZED', 401);
      if (required === 'seller' && role !== 'gallerist') throw new CommerceError('FORBIDDEN', 403);
      return { db: h.db, user: { id: 'seller', email: 'seller@example.test', email_confirmed_at: 'yes' }, profile: { role } };
    },
    sameOrigin: request => { if (request.headers.get('origin') !== config.origin) throw new CommerceError('FORBIDDEN', 403); },
    payload: request => request.json(), checkedId: id => id,
    requirePayments: async () => { if (!payments) throw new CommerceError('PAYMENTS_OFF'); },
    commerceStore: () => ({ command: async (...args) => { h.effects.push(args); return {}; }, getOrder: async () => ({ seller_id: 'seller', buyer_id: 'seller', state: 'checkout_open' }) }),
    stripeClient: () => { h.effects.push('stripe'); return {}; },
    json: (value, status = 200) => Response.json(value, { status }),
    failure: error => Response.json({ error: error.code || 'SERVICE_UNAVAILABLE' }, { status: error.status || 503 }),
  };
  const route = load('app/api/commerce/[...path]/route.ts', {
    '@/lib/commerce/seller-terms': terms, '@/lib/commerce/countries': { shippingCountries: new Set(['IT']) },
    '@/lib/commerce/config': { ...configModule, commerceConfig: () => config },
    '@/lib/commerce/server': server, '@/lib/commerce/engine': { startCheckout: async () => ({ url: 'https://checkout.example' }) },
    'next/headers': {},
  });
  const post = (path, body = {}, origin = config.origin) => route.POST(new Request(config.origin + '/api/commerce/' + path, {
    method: 'POST', headers: { origin }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ path: path.split('/') }) });
  assert.equal((await post('seller/terms', h.body, 'https://attacker.example')).status, 403);
  authenticated = false; assert.equal((await post('seller/terms', h.body)).status, 401);
  authenticated = true; role = 'user'; assert.equal((await post('seller/terms', h.body)).status, 403); role = 'gallerist';
  payments = true;
  const listing = { enabled: true, shipping_amount: '0', shipping_countries: 'IT', terms_url: 'https://seller.example/terms' };
  const quote = { artwork_id: 'art', shipping_country: 'IT', terms_accepted: true, quote_terms: listing.terms_url, quote_version: 'today', quote_price: 10, quote_shipping: 0 };
  for (const [path, body] of [['seller/connect', {}], ['listings/art', listing], ['checkout', quote], ['orders/order/resume', {}]]) {
    const result = await post(path, body); assert.equal((await result.json()).error, 'SELLER_TERMS_REQUIRED', path);
  }
  assert.equal(h.effects.length, 0);
  assert.equal((await post('listings/art', { ...listing, enabled: false })).status, 200);
  payments = false;
  assert.equal((await post('seller/terms', { ...h.body, seller_id: 'attacker' })).status, 200);
  assert.equal(h.rows[0].actor_id, 'seller');
  assert.equal((await post('seller/connect')).status, 409);
  payments = true;
  assert.equal((await post('checkout', quote)).status, 200);
});
