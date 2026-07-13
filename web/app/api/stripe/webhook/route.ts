import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlanName, type PlanName } from "@/lib/plans";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

type PaidPlan = Exclude<PlanName, "free">;

type ProfileRole = "user" | "gallerist" | "admin";

type ProfileLookup = {
  id: string;
  role: ProfileRole;
};

type ProfileUpdate = {
  plan?: PlanName;
  role?: ProfileRole;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_price_id?: string | null;
  stripe_current_period_end?: string | null;
  stripe_cancel_at_period_end?: boolean;
  stripe_cancel_at?: string | null;
  stripe_canceled_at?: string | null;
  stripe_last_event_id?: string | null;
  stripe_last_event_type?: string | null;
  stripe_last_event_at?: string | null;
};

type WebhookLogStatus = "received" | "processing" | "processed" | "failed";

type GalleryTemplatePurchaseTemplate = {
  id: string;
  available_from_plan: string | null;
  marketplace_price_cents: number | null;
  marketplace_currency: string | null;
};

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);
const DOWNGRADE_STATUSES = new Set(["unpaid", "incomplete_expired"]);

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
  }

  return secret;
}

function unixToIso(value: number | null | undefined) {
  if (!value) {
    return null;
  }

  return new Date(value * 1000).toISOString();
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

  if (priceId === process.env.STRIPE_PRICE_DIAMOND) {
    return "diamond";
  }

  if (priceId === process.env.STRIPE_PRICE_INSTITUTION) {
    return "institution";
  }

  return null;
}

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
) {
  if (!customer) {
    return null;
  }

  if (typeof customer === "string") {
    return customer;
  }

  return customer.id;
}

function getSubscriptionId(subscription: string | Stripe.Subscription | null) {
  if (!subscription) {
    return null;
  }

  if (typeof subscription === "string") {
    return subscription;
  }

  return subscription.id;
}

function getPaymentIntentId(
  paymentIntent: string | Stripe.PaymentIntent | null
) {
  if (!paymentIntent) {
    return null;
  }

  if (typeof paymentIntent === "string") {
    return paymentIntent;
  }

  return paymentIntent.id;
}

function getFirstSubscriptionItem(subscription: Stripe.Subscription) {
  return subscription.items.data[0] as
    | (Stripe.SubscriptionItem & {
        current_period_end?: number | null;
      })
    | undefined;
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const firstItem = getFirstSubscriptionItem(subscription);

  return unixToIso(firstItem?.current_period_end);
}

function getFirstPriceId(subscription: Stripe.Subscription) {
  return getFirstSubscriptionItem(subscription)?.price?.id || null;
}

function getCancelAt(subscription: Stripe.Subscription) {
  const subscriptionWithCancel = subscription as Stripe.Subscription & {
    cancel_at?: number | null;
  };

  return unixToIso(subscriptionWithCancel.cancel_at);
}

function getCanceledAt(subscription: Stripe.Subscription) {
  const subscriptionWithCancel = subscription as Stripe.Subscription & {
    canceled_at?: number | null;
  };

  return unixToIso(subscriptionWithCancel.canceled_at);
}

function getCancelAtPeriodEnd(subscription: Stripe.Subscription) {
  const subscriptionWithCancel = subscription as Stripe.Subscription & {
    cancel_at_period_end?: boolean | null;
  };

  return Boolean(subscriptionWithCancel.cancel_at_period_end);
}

function getEventObject(event: Stripe.Event) {
  return event.data.object as Stripe.Checkout.Session | Stripe.Subscription;
}

function getEventCustomerId(event: Stripe.Event) {
  const object = getEventObject(event);

  if ("customer" in object) {
    return getCustomerId(object.customer);
  }

  return null;
}

function getEventSubscriptionId(event: Stripe.Event) {
  const object = getEventObject(event);

  if ("subscription" in object) {
    return getSubscriptionId(object.subscription);
  }

  if ("id" in object && object.object === "subscription") {
    return object.id;
  }

  return null;
}

function getEventUserId(event: Stripe.Event) {
  const object = getEventObject(event);

  if ("metadata" in object && object.metadata?.user_id) {
    return object.metadata.user_id;
  }

  if ("metadata" in object && object.metadata?.userId) {
    return object.metadata.userId;
  }

  if ("client_reference_id" in object && object.client_reference_id) {
    return object.client_reference_id;
  }

  return null;
}

function isGalleryTemplatePurchaseSession(session: Stripe.Checkout.Session) {
  return session.metadata?.type === "gallery_template_purchase";
}

async function findProfileForStripeData({
  userId,
  customerId,
  subscriptionId,
}: {
  userId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}) {
  const admin = createAdminClient();

  if (userId) {
    const { data } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle<ProfileLookup>();

    if (data?.id) {
      return data;
    }
  }

  if (customerId) {
    const { data } = await admin
      .from("profiles")
      .select("id, role")
      .eq("stripe_customer_id", customerId)
      .maybeSingle<ProfileLookup>();

    if (data?.id) {
      return data;
    }
  }

  if (subscriptionId) {
    const { data } = await admin
      .from("profiles")
      .select("id, role")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle<ProfileLookup>();

    if (data?.id) {
      return data;
    }
  }

  return null;
}

async function registerWebhookEvent(event: Stripe.Event) {
  const admin = createAdminClient();

  const customerId = getEventCustomerId(event);
  const subscriptionId = getEventSubscriptionId(event);
  const userId = getEventUserId(event);

  const { data: existingEvent } = await admin
    .from("stripe_webhook_events")
    .select("stripe_event_id, status")
    .eq("stripe_event_id", event.id)
    .maybeSingle<{
      stripe_event_id: string;
      status: WebhookLogStatus;
    }>();

  if (existingEvent?.status === "processed") {
    return { shouldProcess: false };
  }

  if (!existingEvent) {
    const { error } = await admin.from("stripe_webhook_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      customer_id: customerId,
      subscription_id: subscriptionId,
      user_id: userId,
      status: "received",
      payload: event as unknown as Record<string, unknown>,
    });

    if (error) {
      throw new Error(`Webhook event insert failed: ${error.message}`);
    }
  }

  const { error: processingError } = await admin
    .from("stripe_webhook_events")
    .update({
      status: "processing",
      error_message: null,
    })
    .eq("stripe_event_id", event.id);

  if (processingError) {
    throw new Error(
      `Webhook event processing update failed: ${processingError.message}`
    );
  }

  return { shouldProcess: true };
}

async function markWebhookEvent(
  event: Stripe.Event,
  status: WebhookLogStatus,
  errorMessage?: string | null
) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("stripe_webhook_events")
    .update({
      status,
      error_message: errorMessage || null,
      processed_at: status === "processed" ? new Date().toISOString() : null,
    })
    .eq("stripe_event_id", event.id);

  if (error) {
    throw new Error(`Webhook event status update failed: ${error.message}`);
  }
}

async function updateProfileFromSubscription(
  subscription: Stripe.Subscription,
  event: Stripe.Event
) {
  const customerId = getCustomerId(subscription.customer);
  const subscriptionId = subscription.id;
  const priceId = getFirstPriceId(subscription);
  const paidPlan = getPlanByPriceId(priceId);
  const metadataPlan = normalizePlanName(subscription.metadata?.plan);
  const metadataUserId = subscription.metadata?.user_id || null;

  const profile = await findProfileForStripeData({
    userId: metadataUserId,
    customerId,
    subscriptionId,
  });

  if (!profile) {
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
    stripe_cancel_at_period_end: getCancelAtPeriodEnd(subscription),
    stripe_cancel_at: getCancelAt(subscription),
    stripe_canceled_at: getCanceledAt(subscription),
    stripe_last_event_id: event.id,
    stripe_last_event_type: event.type,
    stripe_last_event_at: new Date().toISOString(),
  };

  if (paidPlan && ACTIVE_STATUSES.has(subscription.status)) {
    update.plan = paidPlan;

    if (profile.role === "user") {
      update.role = "gallerist";
    }
  } else if (DOWNGRADE_STATUSES.has(subscription.status)) {
    update.plan = "free";
  } else if (paidPlan && metadataPlan !== "free") {
    update.plan = paidPlan;

    if (profile.role === "user") {
      update.role = "gallerist";
    }
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", profile.id);

  if (error) {
    throw new Error(`Supabase profile update failed: ${error.message}`);
  }
}

async function handleGalleryTemplatePurchase(
  session: Stripe.Checkout.Session,
  event: Stripe.Event
) {
  const admin = createAdminClient();

  const userId = session.metadata?.userId || session.metadata?.user_id || null;
  const templateId = session.metadata?.templateId || null;

  if (!userId) {
    throw new Error("Marketplace purchase missing userId metadata.");
  }

  if (!templateId) {
    throw new Error("Marketplace purchase missing templateId metadata.");
  }

  if (session.payment_status && session.payment_status !== "paid") {
    console.warn("Stripe webhook: marketplace checkout not paid yet", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
    });

    return;
  }

  const { data: templateData, error: templateError } = await admin
    .from("gallery_templates")
    .select("id, available_from_plan, marketplace_price_cents, marketplace_currency")
    .eq("id", templateId)
    .maybeSingle<GalleryTemplatePurchaseTemplate>();

  if (templateError) {
    throw new Error(
      `Marketplace template lookup failed: ${templateError.message}`
    );
  }

  if (!templateData?.id) {
    throw new Error(`Marketplace template not found: ${templateId}`);
  }

  if (templateData.available_from_plan !== "marketplace") {
    throw new Error(`Template is not a marketplace template: ${templateId}`);
  }

  const customerId = getCustomerId(session.customer);
  const paymentIntentId = getPaymentIntentId(session.payment_intent);
  const amountTotal =
    typeof session.amount_total === "number"
      ? session.amount_total
      : templateData.marketplace_price_cents || 0;
  const currency =
    session.currency || templateData.marketplace_currency || "eur";

  const { error: purchaseError } = await admin
    .from("gallery_template_purchases")
    .upsert(
      {
        user_id: userId,
        template_id: templateId,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: customerId,
        amount_total: amountTotal,
        currency,
        status: "paid",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,template_id",
      }
    );

  if (purchaseError) {
    throw new Error(
      `Marketplace purchase upsert failed: ${purchaseError.message}`
    );
  }

  if (customerId) {
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        stripe_last_event_id: event.id,
        stripe_last_event_type: event.type,
        stripe_last_event_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      throw new Error(
        `Marketplace profile customer update failed: ${profileError.message}`
      );
    }
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  event: Stripe.Event
) {
  if (isGalleryTemplatePurchaseSession(session)) {
    await handleGalleryTemplatePurchase(session, event);
    return;
  }

  const stripe = getStripe();

  const subscriptionId = getSubscriptionId(session.subscription);

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await updateProfileFromSubscription(subscription, event);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  event: Stripe.Event
) {
  const customerId = getCustomerId(subscription.customer);
  const subscriptionId = subscription.id;
  const metadataUserId = subscription.metadata?.user_id || null;

  const profile = await findProfileForStripeData({
    userId: metadataUserId,
    customerId,
    subscriptionId,
  });

  if (!profile) {
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
      stripe_cancel_at_period_end: getCancelAtPeriodEnd(subscription),
      stripe_cancel_at: getCancelAt(subscription),
      stripe_canceled_at: getCanceledAt(subscription),
      stripe_last_event_id: event.id,
      stripe_last_event_type: event.type,
      stripe_last_event_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

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
    const { shouldProcess } = await registerWebhookEvent(event);

    if (!shouldProcess) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session,
        event
      );
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      await updateProfileFromSubscription(
        event.data.object as Stripe.Subscription,
        event
      );
    }

    if (event.type === "customer.subscription.deleted") {
      await handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription,
        event
      );
    }

    await markWebhookEvent(event, "processed");

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handler failed.";

    try {
      await markWebhookEvent(event, "failed", message);
    } catch (logError) {
      console.error("Stripe webhook: failed to update event log", logError);
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}