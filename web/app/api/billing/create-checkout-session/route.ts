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

type StripeCheckoutPlan = Extract<PlanName, "pro" | "business" | "diamond">;

type CheckoutPayload = {
  plan?: string;
};

type Profile = {
  id: string;
  email: string | null;
  role: "user" | "gallerist" | "admin";
  plan: PlanName;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
};

const STRIPE_CHECKOUT_PLANS: StripeCheckoutPlan[] = [
  "pro",
  "business",
  "diamond",
];

const EXISTING_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
]);

function isStripeCheckoutPlan(value: unknown): value is StripeCheckoutPlan {
  return (
    typeof value === "string" &&
    STRIPE_CHECKOUT_PLANS.includes(value as StripeCheckoutPlan)
  );
}

function getStripePriceId(plan: StripeCheckoutPlan) {
  if (plan === "pro") {
    return process.env.STRIPE_PRICE_PRO || null;
  }

  if (plan === "business") {
    return process.env.STRIPE_PRICE_BUSINESS || null;
  }

  if (plan === "diamond") {
    return process.env.STRIPE_PRICE_DIAMOND || null;
  }

  return null;
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Errore sconosciuto.";
}

export async function POST(request: Request) {
  try {
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

    if (!isStripeCheckoutPlan(targetPlan)) {
      return NextResponse.json(
        {
          error:
            "Piano non valido per il checkout Stripe. I piani personalizzati richiedono contatto diretto.",
        },
        { status: 400 }
      );
    }

    const priceId = getStripePriceId(targetPlan);

    if (!priceId) {
      return NextResponse.json(
        {
          error: `Price ID Stripe mancante per il piano ${targetPlan}.`,
          details:
            targetPlan === "diamond"
              ? "Aggiungi STRIPE_PRICE_DIAMOND in .env.local e su Vercel."
              : "Controlla le variabili STRIPE_PRICE_PRO / STRIPE_PRICE_BUSINESS.",
        },
        { status: 500 }
      );
    }

    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select(
        "id, email, role, plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_status"
      )
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

    if (
      profile.stripe_subscription_id &&
      profile.stripe_subscription_status &&
      EXISTING_SUBSCRIPTION_STATUSES.has(profile.stripe_subscription_status)
    ) {
      return NextResponse.json(
        {
          error:
            "Hai già un abbonamento Stripe attivo. Usa il portale abbonamento per gestire cambio piano, metodo di pagamento o cancellazione.",
          currentPlan,
          targetPlan,
          action: "manage_subscription",
        },
        { status: 409 }
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
  } catch (error) {
    console.error("Create checkout session failed:", error);

    return NextResponse.json(
      {
        error: "Errore interno creazione checkout Stripe.",
        details: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}