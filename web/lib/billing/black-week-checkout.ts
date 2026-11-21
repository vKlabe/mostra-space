import type Stripe from "stripe";
import {
  BLACK_WEEK_END_AT,
  BLACK_WEEK_MONTHS,
  BLACK_WEEK_OFFERS,
  BLACK_WEEK_START_AT,
  getBlackWeekPhase,
  type BlackWeekPlan,
} from "@/lib/black-week";

const CAMPAIGN = "black-week-2026";
const SESSION_MINIMUM_SECONDS = 30 * 60;
const SESSION_MAXIMUM_SECONDS = 24 * 60 * 60;
const SESSION_CLOCK_MARGIN_SECONDS = 10;
const LIVE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  "active", "trialing", "past_due", "unpaid", "paused", "incomplete",
]);

const DEFAULT_COUPONS = {
  pro: "mostra_black_week_2026_pro",
  business: "mostra_black_week_2026_business",
} as const;

type CheckoutPlan = BlackWeekPlan | "diamond";

export class BlackWeekCheckoutError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function isBlackWeekCheckoutProtected(now = Date.now()) {
  const lastExpiry = BLACK_WEEK_END_AT +
    (SESSION_MINIMUM_SECONDS + SESSION_CLOCK_MARGIN_SECONDS) * 1000;
  return now >= BLACK_WEEK_START_AT && now < lastExpiry;
}

function getCouponId(plan: BlackWeekPlan) {
  if (plan === "pro") {
    return process.env.STRIPE_BLACK_WEEK_PRO_COUPON || DEFAULT_COUPONS.pro;
  }
  return process.env.STRIPE_BLACK_WEEK_BUSINESS_COUPON || DEFAULT_COUPONS.business;
}

function getCheckoutExpiry(now: number) {
  const timestamp = Math.ceil(now / 1000);
  const earliestExpiry = timestamp + SESSION_MINIMUM_SECONDS + SESSION_CLOCK_MARGIN_SECONDS;
  const latestExpiry = timestamp + SESSION_MAXIMUM_SECONDS - SESSION_CLOCK_MARGIN_SECONDS;
  // Stripe requires at least 30 minutes per session. The coupon's redeem_by
  // still ends the discount at midnight, including in an open Checkout tab.
  return Math.max(earliestExpiry, Math.min(BLACK_WEEK_END_AT / 1000, latestExpiry));
}

function getProductId(product: Stripe.Price["product"]) {
  return typeof product === "string" ? product : product.id;
}

async function validateCoupon(stripe: Stripe, priceId: string, plan: BlackWeekPlan) {
  const couponId = getCouponId(plan);
  const unavailable = new BlackWeekCheckoutError("L’offerta Black Week è temporaneamente non disponibile.", 503);
  const [price, coupon] = await Promise.all([
    stripe.prices.retrieve(priceId),
    stripe.coupons.retrieve(couponId, { expand: ["applies_to"] }),
  ]).catch(() => { throw unavailable; });
  const offer = BLACK_WEEK_OFFERS[plan];

  if (
    !price.active || price.currency !== "eur" || price.unit_amount !== offer.regularCents ||
    price.recurring?.interval !== "month" || price.recurring.interval_count !== 1 ||
    coupon.deleted || !coupon.valid || coupon.currency !== "eur" ||
    coupon.amount_off !== offer.regularCents - offer.offerCents ||
    coupon.duration !== "repeating" || coupon.duration_in_months !== BLACK_WEEK_MONTHS ||
    coupon.redeem_by !== BLACK_WEEK_END_AT / 1000 ||
    coupon.applies_to?.products.length !== 1 ||
    !coupon.applies_to.products.includes(getProductId(price.product))
  ) {
    throw unavailable;
  }

  return coupon.id;
}

async function expireCheckout(stripe: Stripe, sessionId: string) {
  try {
    await stripe.checkout.sessions.expire(sessionId);
  } catch (error) {
    if (!(error instanceof Error) || !("statusCode" in error) || error.statusCode !== 400) {
      throw error;
    }
    throw new BlackWeekCheckoutError("La sessione di pagamento è cambiata. Riprova tra poco.", 409);
  }
}

export async function createBlackWeekCheckout(
  stripe: Stripe,
  customer: string,
  targetPlan: CheckoutPlan,
  priceId: string,
  params: Stripe.Checkout.SessionCreateParams,
) {
  const sessionList = stripe.checkout.sessions.list({ customer, limit: 50 });
  const earliestOpenSession = Math.floor(Date.now() / 1000) - SESSION_MAXIMUM_SECONDS;
  const openSessions: Stripe.Checkout.Session[] = [];
  let previousSession: Stripe.Checkout.Session | undefined;
  for await (const session of sessionList) {
    if (session.mode === "subscription") {
      previousSession ??= session;
      if (session.status === "open") openSessions.push(session);
    }
    if (previousSession && session.created < earliestOpenSession) break;
  }

  const subscriptionList = stripe.subscriptions.list({ customer, status: "all", limit: 100 });
  const previousSubscription = previousSession?.subscription;
  const previousSubscriptionId = typeof previousSubscription === "string"
    ? previousSubscription : previousSubscription?.id;
  let previousSubscriptionFound = false;
  let previousSubscriptionIncomplete = false;
  let usedOffer = false;
  for await (const subscription of subscriptionList) {
    if (subscription.status === "incomplete" && previousSession?.status === "open" &&
      subscription.id === previousSubscriptionId) {
      previousSubscriptionIncomplete = true;
      continue;
    }
    if (LIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
      throw new BlackWeekCheckoutError("Hai già un abbonamento in corso. Gestiscilo dal tuo account.", 409);
    }
    previousSubscriptionFound ||= subscription.id === previousSubscriptionId;
    if (subscription.metadata.campaign === CAMPAIGN && subscription.status !== "incomplete_expired") {
      usedOffer = true;
    }
  }
  if (previousSession?.status === "complete" && !previousSubscriptionFound) {
    throw new BlackWeekCheckoutError("Stripe sta verificando il pagamento precedente. Riprova tra poco.", 409);
  }

  let promoPlan = targetPlan !== "diamond" && getBlackWeekPhase() === "active" ? targetPlan : null;
  if (promoPlan && usedOffer) {
    throw new BlackWeekCheckoutError("Hai già utilizzato l’offerta Black Week con questo account.", 409);
  }

  const reusableSession = previousSession?.status === "open" &&
    previousSession.metadata?.plan === targetPlan &&
    (previousSession.metadata.campaign || undefined) === (promoPlan ? CAMPAIGN : undefined) &&
    previousSession.url && previousSession.expires_at > Date.now() / 1000
    ? previousSession : undefined;
  if (previousSubscriptionIncomplete && !reusableSession) {
    throw new BlackWeekCheckoutError("Completa prima il pagamento Stripe già in corso.", 409);
  }

  const coupon = promoPlan && !reusableSession
    ? await validateCoupon(stripe, priceId, promoPlan).catch((error) => {
      if (getBlackWeekPhase() !== "active") return null;
      throw error;
    }) : null;

  for (const session of openSessions) {
    if (session.id !== reusableSession?.id) {
      await expireCheckout(stripe, session.id);
    }
  }

  const now = Date.now();
  if (getBlackWeekPhase(now) !== "active" && promoPlan) {
    promoPlan = null;
    if (reusableSession) await expireCheckout(stripe, reusableSession.id);
  } else if (reusableSession) {
    return reusableSession;
  }

  if (promoPlan && coupon) {
    params = {
      ...params,
      allow_promotion_codes: undefined,
      discounts: [{ coupon }],
      expires_at: getCheckoutExpiry(now),
      metadata: { ...params.metadata, campaign: CAMPAIGN },
      subscription_data: {
        ...params.subscription_data,
        metadata: { ...params.subscription_data?.metadata, campaign: CAMPAIGN },
      },
    };
  }

  try {
    return await stripe.checkout.sessions.create(params, {
      idempotencyKey: `${CAMPAIGN}:${customer}:${previousSession?.id || "first"}`,
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "coupon_expired" &&
      getBlackWeekPhase() !== "active") {
      throw new BlackWeekCheckoutError("La Black Week è terminata. Torna ai piani per vedere il prezzo ordinario.", 409);
    }
    if (error instanceof Error && (
      ("type" in error && error.type === "StripeIdempotencyError") ||
      ("code" in error && error.code === "idempotency_key_in_use")
    )) {
      throw new BlackWeekCheckoutError("Hai già un pagamento in apertura. Riprova tra poco.", 409);
    }
    throw error;
  }
}
