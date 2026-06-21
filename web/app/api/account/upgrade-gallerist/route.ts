import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type UpgradePayload = {
  businessName?: unknown;
  phone?: unknown;
  professionalUrl?: unknown;
  termsAccepted?: unknown;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        success: false,
        error: "Utente non autenticato.",
      },
      { status: 401 }
    );
  }

  let body: UpgradePayload;

  try {
    body = (await request.json()) as UpgradePayload;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Payload non valido.",
      },
      { status: 400 }
    );
  }

  const businessName = cleanText(body.businessName);
  const phone = cleanText(body.phone);
  const professionalUrl = cleanText(body.professionalUrl);
  const termsAccepted = body.termsAccepted === true;

  if (!businessName) {
    return NextResponse.json(
      {
        success: false,
        error: "Inserisci il nome della galleria, dellâ€™artista o dello studio.",
      },
      { status: 400 }
    );
  }

  if (!phone) {
    return NextResponse.json(
      {
        success: false,
        error: "Inserisci un numero di telefono.",
      },
      { status: 400 }
    );
  }

  if (!professionalUrl) {
    return NextResponse.json(
      {
        success: false,
        error: "Inserisci un sito o un profilo social.",
      },
      { status: 400 }
    );
  }

  if (!termsAccepted) {
    return NextResponse.json(
      {
        success: false,
        error: "Devi accettare termini e responsabilitÃ  per lâ€™upgrade account.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: existingProfile, error: existingProfileError } = await admin
    .from("profiles")
    .select("id, email, full_name, display_name, role, plan, website_url")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    return NextResponse.json(
      {
        success: false,
        error: "Errore lettura profilo.",
        details: existingProfileError.message,
      },
      { status: 500 }
    );
  }

  const nextRole = existingProfile?.role === "admin" ? "admin" : "gallerist";

  const { error: metadataError } = await admin.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: {
        ...(user.user_metadata || {}),
        account_type: "gallerist",
        business_name: businessName,
        phone,
        professional_url: professionalUrl,
        upgraded_to_gallerist_at: new Date().toISOString(),
      },
    }
  );

  if (metadataError) {
    return NextResponse.json(
      {
        success: false,
        error: "Errore aggiornamento metadata utente.",
        details: metadataError.message,
      },
      { status: 500 }
    );
  }

  const { data: profile, error: updateError } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email || existingProfile?.email || "",
        full_name:
          existingProfile?.full_name ||
          cleanText(user.user_metadata?.full_name) ||
          "",
        display_name: businessName,
        role: nextRole,
        plan: existingProfile?.plan || "free",
        website_url: professionalUrl,
      },
      {
        onConflict: "id",
      }
    )
    .select("id, email, full_name, display_name, role, plan, website_url")
    .single();

  if (updateError || !profile) {
    return NextResponse.json(
      {
        success: false,
        error: "Errore upgrade account.",
        details: updateError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    profile,
  });
}
