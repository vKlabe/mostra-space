import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadTs(relativePath, dependencies = {}) {
  const source = readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (name) => dependencies[name], module, module.exports,
  );
  return module.exports;
}

const dates = loadTs("lib/black-week.ts");
const { createBlackWeekCheckout, isBlackWeekCheckoutProtected } = loadTs(
  "lib/billing/black-week-checkout.ts", { "@/lib/black-week": dates },
);
const { getBlackWeekPhase, BLACK_WEEK_START_AT, BLACK_WEEK_END_AT } = dates;

const params = {
  mode: "subscription",
  line_items: [{ price: "price_regular", quantity: 1 }],
  allow_promotion_codes: true,
  metadata: { user_id: "test-user", plan: "pro" },
  subscription_data: { metadata: { user_id: "test-user", plan: "pro" } },
};

function stripeFixture({ plan = "pro", subscriptions = [], sessions = [], couponOverrides = {} } = {}) {
  const offer = dates.BLACK_WEEK_OFFERS[plan];
  const calls = { create: [], expire: [], retrieveCoupon: [] };
  const stripe = {
    subscriptions: { async *list() { yield* subscriptions; } },
    prices: { async retrieve() {
      return {
        product: "prod_regular", unit_amount: offer.regularCents, currency: "eur", active: true,
        recurring: { interval: "month", interval_count: 1 },
      };
    } },
    coupons: { async retrieve(id, options) {
      calls.retrieveCoupon.push({ id, options });
      return {
        id, valid: true, currency: "eur", amount_off: offer.regularCents - offer.offerCents,
        duration: "repeating", duration_in_months: 3, redeem_by: BLACK_WEEK_END_AT / 1000,
        applies_to: { products: ["prod_regular"] }, ...couponOverrides,
      };
    } },
    checkout: { sessions: {
      async *list(query) {
        yield* (query.status ? sessions.filter(({ status }) => status === query.status) : sessions);
      },
      async create(parameters, options) {
        calls.create.push({ parameters, options });
        return { id: "cs_new", url: "https://example.test/new" };
      },
      async expire(id) { calls.expire.push(id); },
    } },
  };
  return { stripe, calls };
}

function checkout(stripe, plan = "pro") {
  return createBlackWeekCheckout(stripe, "cus_test", plan, "price_regular", {
    ...params, metadata: { ...params.metadata, plan },
  });
}

test("the offer opens on November 21 and closes at the end of November in Italy", () => {
  assert.equal(new Date(BLACK_WEEK_START_AT).toISOString(), "2026-11-20T23:00:00.000Z");
  assert.equal(new Date(BLACK_WEEK_END_AT).toISOString(), "2026-11-30T23:00:00.000Z");
  assert.equal(getBlackWeekPhase(BLACK_WEEK_START_AT - 1), "inactive");
  assert.equal(getBlackWeekPhase(BLACK_WEEK_START_AT), "active");
  assert.equal(getBlackWeekPhase(Date.parse("2026-11-21T12:00:00+01:00")), "active");
  assert.equal(getBlackWeekPhase(BLACK_WEEK_END_AT - 1), "active");
  assert.equal(getBlackWeekPhase(BLACK_WEEK_END_AT), "inactive");
  assert.equal(isBlackWeekCheckoutProtected(BLACK_WEEK_START_AT - 1), false);
  assert.equal(isBlackWeekCheckoutProtected(BLACK_WEEK_START_AT), true);
  assert.equal(isBlackWeekCheckoutProtected(BLACK_WEEK_END_AT + 60 * 60 * 1000), false);
});

for (const plan of ["pro", "business"]) {
  test(`${plan} uses an automatic, product-scoped coupon on the existing recurring price`, async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: BLACK_WEEK_START_AT });
    const { stripe, calls } = stripeFixture({ plan });
    await checkout(stripe, plan);
    const [call] = calls.create;
    assert.deepEqual(call.parameters.discounts, [{ coupon: calls.retrieveCoupon[0].id }]);
    assert.equal(call.parameters.allow_promotion_codes, undefined);
    assert.deepEqual(call.parameters.line_items, params.line_items);
    assert.equal(call.parameters.subscription_data.metadata.campaign, "black-week-2026");
    assert.equal(call.parameters.subscription_data.metadata.user_id, "test-user");
    assert.ok(call.parameters.expires_at - Date.now() / 1000 <= 24 * 60 * 60);
    assert.equal(call.options.idempotencyKey, "black-week-2026:cus_test:first");
  });
}

test("Diamond and requests at the end of the campaign use regular Checkout", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: BLACK_WEEK_START_AT });
  const { stripe, calls } = stripeFixture();
  await checkout(stripe, "diamond");
  t.mock.timers.setTime(BLACK_WEEK_END_AT);
  await checkout(stripe);
  assert.deepEqual(calls.retrieveCoupon, []);
  for (const { parameters } of calls.create) {
    assert.equal(parameters.discounts, undefined);
    assert.equal(parameters.allow_promotion_codes, true);
  }
});

test("Checkout fails closed with a coupon belonging to a different product", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: BLACK_WEEK_START_AT });
  const { stripe, calls } = stripeFixture({ couponOverrides: { applies_to: { products: ["prod_other"] } } });
  await assert.rejects(checkout(stripe), { status: 503 });
  assert.equal(calls.create.length, 0);
});

test("Stripe subscriptions take precedence over stale FREE profile data", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: BLACK_WEEK_START_AT });
  const { stripe, calls } = stripeFixture({ subscriptions: [{ id: "sub_open", status: "active", metadata: {} }] });
  await assert.rejects(checkout(stripe), { status: 409 });
  assert.equal(calls.create.length, 0);
});

test("a customer cannot use the offer again after canceling a campaign subscription", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: BLACK_WEEK_START_AT });
  const subscription = { id: "sub_ended", status: "canceled", metadata: { campaign: "black-week-2026" } };
  const { stripe, calls } = stripeFixture({ subscriptions: [subscription] });
  await assert.rejects(checkout(stripe), { status: 409 });
  assert.equal(calls.create.length, 0);
});

test("a repeat click resumes the promo Checkout and closes older unpaid subscription links", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: BLACK_WEEK_START_AT });
  const session = {
    id: "cs_open", mode: "subscription", status: "open", expires_at: Date.now() / 1000 + 1800,
    url: "https://example.test/resume", metadata: { plan: "pro", campaign: "black-week-2026" },
  };
  const oldSession = { id: "cs_old", mode: "subscription", status: "open" };
  const templateSession = { id: "cs_template", mode: "payment", status: "open" };
  const { stripe, calls } = stripeFixture({ sessions: [session, oldSession, templateSession] });
  assert.equal(await checkout(stripe), session);
  assert.deepEqual(calls.create, []);
  assert.deepEqual(calls.expire, ["cs_old"]);
});

test("an expired or changed checkout is replaced using its predecessor as a shared idempotency key", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: BLACK_WEEK_END_AT - 60 * 60 * 1000 });
  const sessions = [{ id: "cs_old", mode: "subscription", status: "open", metadata: { plan: "pro" } }];
  const { stripe, calls } = stripeFixture({ sessions });
  await checkout(stripe);
  assert.deepEqual(calls.expire, ["cs_old"]);
  assert.equal(calls.create[0].parameters.expires_at, BLACK_WEEK_END_AT / 1000);
  assert.equal(calls.create[0].options.idempotencyKey, "black-week-2026:cus_test:cs_old");
});

test("a recently completed session cannot be raced before its subscription is in Stripe's list", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: BLACK_WEEK_START_AT });
  const sessions = [{ id: "cs_done", mode: "subscription", status: "complete", subscription: "sub_pending" }];
  const { stripe, calls } = stripeFixture({ sessions });
  await assert.rejects(checkout(stripe), { status: 409 });
  assert.equal(calls.create.length, 0);
});

test("in the final 30 minutes Checkout uses the Stripe lifetime minimum and the exact coupon cutoff", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: BLACK_WEEK_END_AT - 5 * 60 * 1000 });
  const { stripe, calls } = stripeFixture();
  await checkout(stripe);
  assert.ok(calls.create[0].parameters.expires_at - Date.now() / 1000 >= 30 * 60);
  assert.equal(calls.create[0].parameters.discounts[0].coupon, calls.retrieveCoupon[0].id);
});

test("two different plans racing on the same customer share the Stripe idempotency key", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: BLACK_WEEK_START_AT });
  const { stripe } = stripeFixture();
  let key;
  stripe.checkout.sessions.create = async (_parameters, options) => {
    if (!key) {
      key = options.idempotencyKey;
      return { id: "cs_first" };
    }
    assert.equal(options.idempotencyKey, key);
    throw Object.assign(new Error("Parameters differ"), { type: "StripeIdempotencyError" });
  };
  const outcomes = await Promise.allSettled([checkout(stripe), checkout(stripe, "diamond")]);
  assert.deepEqual(outcomes.map(({ status }) => status).sort(), ["fulfilled", "rejected"]);
  assert.equal(outcomes.find(({ status }) => status === "rejected").reason.status, 409);
});

test("the billing endpoint gives only signed-in FREE accounts the campaign checkout", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: BLACK_WEEK_START_AT });
  const previousPrice = process.env.STRIPE_PRICE_BUSINESS;
  process.env.STRIPE_PRICE_BUSINESS = "price_regular_business";
  t.after(() => {
    if (previousPrice === undefined) delete process.env.STRIPE_PRICE_BUSINESS;
    else process.env.STRIPE_PRICE_BUSINESS = previousPrice;
  });

  const calls = [];
  let user = { id: "user_test" };
  const profile = { ...user, plan: "free", stripe_customer_id: "cus_test" };
  const supabase = { auth: { getUser: async () => ({ data: { user } }) } };
  const admin = { from(table) {
    const query = {
      select: () => query, eq: () => query, gt: () => query,
      single: async () => ({ data: profile }), maybeSingle: async () => ({ data: null }),
    };
    assert.ok(["profiles", "premio_grants"].includes(table));
    return query;
  } };
  const stripe = { checkout: { sessions: { async create(input) {
    calls.push({ mode: "ordinary", input });
    return { url: "https://example.test/ordinary" };
  } } } };
  const { POST } = loadTs("app/api/billing/create-checkout-session/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/supabase/server": { createClient: async () => supabase },
    "@/lib/supabase/admin": { createAdminClient: () => admin },
    "@/lib/plans": loadTs("lib/plans.ts"),
    "@/lib/stripe/server": { getStripe: () => stripe },
    "@/lib/billing/black-week-checkout": {
      isBlackWeekCheckoutProtected,
      async createBlackWeekCheckout(_stripe, customer, targetPlan, priceId) {
        calls.push({ mode: "campaign", customer, targetPlan, priceId });
        return { url: "https://example.test/campaign" };
      },
    },
  });
  const request = () => new Request("https://example.test/api/billing/create-checkout-session", {
    method: "POST", body: JSON.stringify({ plan: "business" }),
  });

  assert.equal((await POST(request())).status, 200);
  assert.deepEqual(calls[0], {
    mode: "campaign", customer: "cus_test", targetPlan: "business", priceId: "price_regular_business",
  });
  profile.plan = "pro";
  profile.stripe_subscription_id = "sub_current";
  profile.stripe_subscription_status = "active";
  assert.equal((await POST(request())).status, 409);
  assert.equal(calls.length, 1);
  profile.plan = "free";
  profile.stripe_subscription_status = "canceled";
  t.mock.timers.setTime(BLACK_WEEK_START_AT - 1);
  assert.equal((await POST(request())).status, 200);
  assert.equal(calls[1].mode, "ordinary");
  assert.equal(calls[1].input.allow_promotion_codes, true);
  user = null;
  assert.equal((await POST(request())).status, 401);
  assert.equal(calls.length, 2);
});
