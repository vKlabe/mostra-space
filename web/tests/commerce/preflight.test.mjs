import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = fileURLToPath(new URL('../../', import.meta.url));
function loadTs(path, mocks = {}) {
  const source = ts.transpileModule(readFileSync(root + path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  const scopedRequire = name => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  new Function('require', 'module', 'exports', source)(scopedRequire, module, module.exports);
  return module.exports;
}
const configModule = loadTs('lib/commerce/config.ts');

function harness(options = {}) {
  const effects = { stripeReads: 0, settingsReads: 0 };
  const runtimeConfig = {
    stripeKey: ['sk', options.testMode ? 'test' : 'live', 'fixture_only'].join('_'),
    webhookSecret: '', clientId: 'ca_fixture', origin: 'https://commerce.example',
    livemode: !options.testMode, feeBps: 1000, feeBase: 'artwork',
    refundApplicationFee: true, activationApproved: false, commercialReviewed: false,
    ...options.config,
  };
  const config = { ...configModule, commerceConfig: () => runtimeConfig };
  const db = {
    from(table) {
      assert.ok(['profiles', 'commerce_settings'].includes(table));
      return {
        select(columns) {
          assert.equal(columns, table === 'profiles' ? 'id,role' : 'payments_enabled');
          return {
            eq(column, value) {
              assert.equal(column, 'id');
              assert.equal(value, table === 'profiles' ? 'user_fixture' : true);
              return {
                async single() {
                  if (table === 'profiles') {
                    return { data: options.missingProfile ? null : {
                      id: 'user_fixture', role: options.role || 'admin',
                    } };
                  }
                  effects.settingsReads++;
                  return {
                    data: options.missingSettings ? null : {
                      payments_enabled: options.switchEnabled || false,
                    },
                    error: options.databaseError ? { code: 'connection_failure' } : null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  class Stripe {
    constructor(key) {
      assert.equal(key, runtimeConfig.stripeKey);
      this.accounts = {
        async retrieveCurrent(...args) {
          effects.stripeReads++;
          assert.deepEqual(args, [], 'Read the owner of the server key, not a supplied account');
          if (options.stripeFailure) throw Error('sensitive diagnostic: ' + key);
          return {
            id: 'acct_runtime_fixture', object: 'account',
            email: 'private@example.test', metadata: { internal: 'do_not_disclose' },
          };
        },
      };
    }
  }
  const server = loadTs('lib/commerce/server.ts', {
    'server-only': {}, stripe: Stripe, './config': config,
    '@/lib/supabase/admin': { createAdminClient: () => db },
    '@/lib/supabase/server': {
      createClient: async () => ({
        auth: { getUser: async () => ({
          data: {
            user: options.anonymous ? null : {
              id: 'user_fixture', user_metadata: { role: 'admin' },
            },
          },
          error: options.authError ? { message: 'expired' } : null,
        }) },
      }),
    },
  });
  const route = loadTs('app/api/commerce/preflight/route.ts', {
    '@/lib/commerce/config': config, '@/lib/commerce/server': server,
  });
  return { route, effects, runtimeConfig };
}

test('preflight: unauthenticated requests cannot read Stripe or settings and are not cached', async () => {
  for (const options of [{ anonymous: true }, { authError: true }]) {
    const h = harness(options);
    const response = await h.route.GET();
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'UNAUTHORIZED' });
    assert.deepEqual(h.effects, { stripeReads: 0, settingsReads: 0 });
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.equal(response.headers.get('vary'), 'Cookie');
  }
});

test('preflight: user-editable admin metadata does not grant access to buyers or sellers', async () => {
  for (const options of [{ role: 'user' }, { role: 'gallerist' }, { missingProfile: true }]) {
    const h = harness(options);
    const response = await h.route.GET();
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: 'FORBIDDEN' });
    assert.deepEqual(h.effects, { stripeReads: 0, settingsReads: 0 });
  }
});

test('preflight: administrator can verify the runtime account while payments and activation stay OFF', async () => {
  const h = harness();
  const before = structuredClone(h.runtimeConfig);
  const response = await h.route.GET();
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data, {
    stripeAccountId: 'acct_runtime_fixture', livemode: true,
    paymentsSwitchEnabled: false, paymentsEnabled: false,
    configurationBlockers: [
      'STRIPE_CONNECT_WEBHOOK_SECRET', 'COMMERCE_COMMERCIAL_REVIEWED',
      'COMMERCE_ACTIVATION_APPROVED',
    ],
  });
  assert.deepEqual(h.effects, { stripeReads: 1, settingsReads: 1 });
  assert.deepEqual(h.runtimeConfig, before);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(response.headers.get('vary'), 'Cookie');
  for (const privateValue of [before.stripeKey, 'private@example.test', 'do_not_disclose']) {
    assert.ok(!JSON.stringify(data).includes(privateValue));
  }
});

test('preflight: a database switch ON cannot bypass missing deployment approval', async () => {
  const h = harness({ switchEnabled: true });
  const data = await (await h.route.GET()).json();
  assert.equal(data.paymentsSwitchEnabled, true);
  assert.equal(data.paymentsEnabled, false);
  assert.ok(data.configurationBlockers.includes('COMMERCE_ACTIVATION_APPROVED'));
});

test('preflight: missing settings or a database error cannot masquerade as confirmed OFF', async () => {
  for (const options of [{ missingSettings: true }, { databaseError: true }]) {
    const h = harness(options);
    const response = await h.route.GET();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'SERVICE_UNAVAILABLE' });
    assert.equal(h.effects.stripeReads, 0);
  }
});

test('preflight: Stripe failures never expose the API key in responses or logs', async () => {
  const h = harness({ stripeFailure: true });
  const logs = [];
  const original = console.error;
  console.error = (...args) => logs.push(args);
  try {
    const response = await h.route.GET();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'SERVICE_UNAVAILABLE' });
    assert.ok(!JSON.stringify(logs).includes(h.runtimeConfig.stripeKey));
  } finally { console.error = original; }
});

test('preflight: reports test mode honestly instead of assuming that every deployment is live', async () => {
  const h = harness({ testMode: true });
  const response = await h.route.GET();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).livemode, false);
});

test('preflight: an absent server key fails closed instead of returning an account', async () => {
  const h = harness({ config: { stripeKey: '' } });
  const response = await h.route.GET();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'NOT_CONFIGURED' });
  assert.equal(h.effects.stripeReads, 0);
});
