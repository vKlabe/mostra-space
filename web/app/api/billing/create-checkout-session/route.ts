import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PLAN_LIMITS,
  PLAN_ORDER,
  normalizePlanName,
  type PlanName,
} from "@/lib/plans";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

type PaidPlan = Exclude<PlanName, "free">;

type CheckoutPayload = {
  plan?: string;
};

type Profile = {
  id: string;
  email: string | null;
  role: "user" | "gallerist" | "admin";
  plan: PlanName;
  stripe_customer_id: string | null;
};

const PAID_PLANS: PaidPlan[] = ["pro", "business", "institution"];

function isPaidPlan(value: unknown): value is PaidPlan {
  return typeof value === "string" && PAID_PLANS.includes(value as PaidPlan);
}

function getStripePriceId(plan: PaidPlan) {
  if (plan === "pro") {
    return process.env.STRIPE_PRICE_PRO || null;
  }

  if (plan === "business") {
    return process.env.STRIPE_PRICE_BUSINESS || null;
  }

  return process.env.STRIPE_PRICE_INSTITUTION || null;
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Devi effettuare l'accesso per attivare un piano." },
      { status: 401 }
    );
  }

  let body: CheckoutPayload;

  try {
    body = (await request.json()) as CheckoutPayload;
  } catch {
    return NextResponse.json(
      { error: "Richiesta non valida." },
      { status: 400 }
    );
  }

  const targetPlan = normalizePlanName(body.plan);

  if (!isPaidPlan(targetPlan)) {
    return NextResponse.json(
      { error: "Piano non valido per il checkout Stripe." },
      { status: 400 }
    );
  }

  const priceId = getStripePriceId(targetPlan);

  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID Stripe mancante per il piano ${targetPlan}.` },
      { status: 500 }
    );
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, role, plan, stripe_customer_id")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    return NextResponse.json(
      {
        error: "Profilo account non trovato.",
        details: profileError?.message || null,
      },
      { status: 404 }
    );
  }

  const currentPlan = normalizePlanName(profile.plan);
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan);
  const targetPlanIndex = PLAN_ORDER.indexOf(targetPlan);

  if (targetPlanIndex <= currentPlanIndex) {
    return NextResponse.json(
      {
        error: "Questo piano non è un upgrade rispetto al piano attuale.",
        currentPlan,
        targetPlan,
      },
      { status: 400 }
    );
  }

  const stripe = getStripe();

  let stripeCustomerId = profile.stripe_customer_id;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: profile.email || user.email || undefined,
      metadata: {
        user_id: user.id,
      },
    });

    stripeCustomerId = customer.id;

    const { error: updateCustomerError } = await admin
      .from("profiles")
      .update({
        stripe_customer_id: stripeCustomerId,
      })
      .eq("id", user.id);

    if (updateCustomerError) {
      return NextResponse.json(
        {
          error: "Errore salvataggio customer Stripe.",
          details: updateCustomerError.message,
        },
        { status: 500 }
      );
    }
  }

  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    success_url: `${appUrl}/dashboard?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing?stripe=cancelled`,
    client_reference_id: user.id,
    metadata: {
      user_id: user.id,
      plan: targetPlan,
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan: targetPlan,
      },
    },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe non ha restituito un URL di checkout." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: session.url,
    plan: targetPlan,
    planLabel: PLAN_LIMITS[targetPlan].label,
  });
}