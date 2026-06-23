import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_ORDER, normalizePlanName, type PlanName } from "@/lib/plans";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

type PaidPlan = Exclude<PlanName, "free">;

type ProfileUpdate = {
  plan?: PlanName;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_price_id?: string | null;
  stripe_current_period_end?: string | null;
};

const ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

const DOWNGRADE_STATUSES = new Set([
  "canceled",
  "unpaid",
  "incomplete_expired",
]);

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
  }

  return secret;
}

function getPlanByPriceId(priceId: string | null | undefined): PaidPlan | null {
  if (!priceId) {
    return null;
  }

  if (priceId === process.env.STRIPE_PRICE_PRO) {
    return "pro";
  }

  if (priceId === process.env.STRIPE_PRICE_BUSINESS) {
    return "business";
  }

  if (priceId === process.env.STRIPE_PRICE_INSTITUTION) {
    return "institution";
  }

  return null;
}

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (!customer) {
    return null;
  }

  if (typeof customer === "string") {
    return customer;
  }

  return customer.id;
}

function getSubscriptionId(
  subscription: string | Stripe.Subscription | null
) {
  if (!subscription) {
    return null;
  }

  if (typeof subscription === "string") {
    return subscription;
  }

  return subscription.id;
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const subscriptionWithPeriod = subscription as Stripe.Subscription & {
    current_period_end?: number | null;
  };

  const currentPeriodEnd = subscriptionWithPeriod.current_period_end;

  if (!currentPeriodEnd) {
    return null;
  }

  return new Date(currentPeriodEnd * 1000).toISOString();
}

function getFirstPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price?.id || null;
}

async function findUserIdForStripeData({
  userId,
  customerId,
  subscriptionId,
}: {
  userId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}) {
  if (userId) {
    return userId;
  }

  const admin = createAdminClient();

  if (customerId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle<{ id: string }>();

    if (data?.id) {
      return data.id;
    }
  }

  if (subscriptionId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle<{ id: string }>();

    if (data?.id) {
      return data.id;
    }
  }

  return null;
}

async function updateProfileFromSubscription(subscription: Stripe.Subscription) {
  const customerId = getCustomerId(subscription.customer);
  const subscriptionId = subscription.id;
  const priceId = getFirstPriceId(subscription);
  const paidPlan = getPlanByPriceId(priceId);
  const metadataPlan = normalizePlanName(subscription.metadata?.plan);
  const metadataUserId = subscription.metadata?.user_id || null;

  const userId = await findUserIdForStripeData({
    userId: metadataUserId,
    customerId,
    subscriptionId,
  });

  if (!userId) {
    console.warn("Stripe webhook: no user found for subscription", {
      customerId,
      subscriptionId,
    });

    return;
  }

  const update: ProfileUpdate = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_subscription_status: subscription.status,
    stripe_price_id: priceId,
    stripe_current_period_end: getCurrentPeriodEnd(subscription),
  };

  if (paidPlan && ACTIVE_STATUSES.has(subscription.status)) {
    update.plan = paidPlan;
  } else if (DOWNGRADE_STATUSES.has(subscription.status)) {
    update.plan = "free";
  } else if (
    paidPlan &&
    PLAN_ORDER.indexOf(metadataPlan) >= PLAN_ORDER.indexOf("pro")
  ) {
    update.plan = paidPlan;
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", userId);

  if (error) {
    throw new Error(`Supabase profile update failed: ${error.message}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripe = getStripe();

  const subscriptionId = getSubscriptionId(session.subscription);

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await updateProfileFromSubscription(subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = getCustomerId(subscription.customer);
  const subscriptionId = subscription.id;
  const metadataUserId = subscription.metadata?.user_id || null;

  const userId = await findUserIdForStripeData({
    userId: metadataUserId,
    customerId,
    subscriptionId,
  });

  if (!userId) {
    console.warn("Stripe webhook: no user found for deleted subscription", {
      customerId,
      subscriptionId,
    });

    return;
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({
      plan: "free",
      stripe_subscription_status: "canceled",
      stripe_subscription_id: subscriptionId,
      stripe_price_id: getFirstPriceId(subscription),
      stripe_current_period_end: getCurrentPeriodEnd(subscription),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Supabase downgrade failed: ${error.message}`);
  }
}

export async function POST(request: Request) {
  const stripe = getStripe();

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getWebhookSecret()
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook verification failed.";

    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session
      );
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      await updateProfileFromSubscription(
        event.data.object as Stripe.Subscription
      );
    }

    if (event.type === "customer.subscription.deleted") {
      await handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handler failed.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}