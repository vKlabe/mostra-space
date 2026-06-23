import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
};

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Devi effettuare l'accesso per gestire l'abbonamento." },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, stripe_customer_id")
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

  if (!profile.stripe_customer_id) {
    return NextResponse.json(
      {
        error:
          "Non hai ancora un customer Stripe collegato. Attiva prima un piano a pagamento.",
      },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/dashboard`,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe non ha restituito un URL per il portale billing." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: session.url,
  });
}