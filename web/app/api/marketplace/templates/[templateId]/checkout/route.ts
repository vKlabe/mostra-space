import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    templateId: string;
  }>;
};

type MarketplaceTemplate = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  preview_image_url: string | null;
  is_active: boolean;
  available_from_plan: string | null;
  marketplace_price_cents: number | null;
  marketplace_currency: string | null;
  marketplace_is_active: boolean;
  marketplace_description: string | null;
  marketplace_preview_image_url: string | null;
};

type Profile = {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
};

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  return new Stripe(secretKey);
}

function getAppUrl() {
  const rawUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  return rawUrl.replace(/\/$/, "");
}

function cleanCurrency(value: string | null | undefined) {
  const cleaned = (value || "eur").trim().toLowerCase();

  return cleaned || "eur";
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { templateId } = await params;

  if (!templateId) {
    return NextResponse.json(
      { error: "Template non valido." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const stripe = getStripeClient();
  const appUrl = getAppUrl();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Devi accedere per acquistare un template." },
      { status: 401 }
    );
  }

  const { data: templateData, error: templateError } = await admin
    .from("gallery_templates")
    .select(
      [
        "id",
        "name",
        "slug",
        "description",
        "preview_image_url",
        "is_active",
        "available_from_plan",
        "marketplace_price_cents",
        "marketplace_currency",
        "marketplace_is_active",
        "marketplace_description",
        "marketplace_preview_image_url",
      ].join(", ")
    )
    .eq("id", templateId)
    .maybeSingle();

  const template = templateData as unknown as MarketplaceTemplate | null;

  if (templateError) {
    return NextResponse.json(
      { error: "Errore caricamento template." },
      { status: 500 }
    );
  }

  if (!template) {
    return NextResponse.json(
      { error: "Template non trovato." },
      { status: 404 }
    );
  }

  if (
    template.available_from_plan !== "marketplace" ||
    template.marketplace_is_active !== true ||
    template.is_active !== true
  ) {
    return NextResponse.json(
      { error: "Questo template non è acquistabile." },
      { status: 400 }
    );
  }

  if (
    !template.marketplace_price_cents ||
    template.marketplace_price_cents <= 0
  ) {
    return NextResponse.json(
      { error: "Prezzo template non valido." },
      { status: 400 }
    );
  }

  const { data: existingPurchase, error: existingPurchaseError } = await admin
    .from("gallery_template_purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("template_id", template.id)
    .eq("status", "paid")
    .maybeSingle();

  if (existingPurchaseError) {
    return NextResponse.json(
      { error: "Errore controllo acquisto template." },
      { status: 500 }
    );
  }

  if (existingPurchase) {
    return NextResponse.json({
      alreadyPurchased: true,
      redirectUrl: "/dashboard/gallerie",
    });
  }

  const { data: profileData } = await admin
    .from("profiles")
    .select("id, email, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as unknown as Profile | null;

  const currency = cleanCurrency(template.marketplace_currency);
  const previewImage =
    template.marketplace_preview_image_url || template.preview_image_url;
  const productDescription =
    template.marketplace_description ||
    template.description ||
    "Template galleria MostraSpace acquistabile singolarmente.";

  const metadata = {
    type: "gallery_template_purchase",
    userId: user.id,
    templateId: template.id,
    templateSlug: template.slug,
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: profile?.stripe_customer_id || undefined,
      customer_email: profile?.stripe_customer_id
        ? undefined
        : profile?.email || user.email || undefined,
      allow_promotion_codes: true,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: template.marketplace_price_cents,
            product_data: {
              name: `Template galleria · ${template.name}`,
              description: productDescription,
              images: previewImage ? [previewImage] : undefined,
              metadata: {
                type: "gallery_template",
                templateId: template.id,
                templateSlug: template.slug,
              },
            },
          },
        },
      ],
      metadata,
      payment_intent_data: {
        metadata,
      },
      success_url: `${appUrl}/marketplace?purchase=success&template=${template.id}`,
      cancel_url: `${appUrl}/marketplace?purchase=cancelled&template=${template.id}`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Errore creazione checkout Stripe.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}