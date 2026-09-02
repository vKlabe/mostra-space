import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function POST() {
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

  const metadata = user.user_metadata || {};

  const accountType =
    cleanText(metadata.account_type).toLowerCase() === "gallerist"
      ? "gallerist"
      : "visitor";

  const firstName = cleanText(metadata.first_name);
  const lastName = cleanText(metadata.last_name);
  const metadataFullName = cleanText(metadata.full_name);
  const googleName = cleanText(metadata.name);
  const fullName =
    metadataFullName || googleName || `${firstName} ${lastName}`.trim() || null;

  const displayName =
    cleanText(metadata.display_name) || fullName || user.email || null;

  const avatarUrl =
    cleanText(metadata.avatar_url) || cleanText(metadata.picture) || null;

  const admin = createAdminClient();

  const { data: existingProfile, error: existingProfileError } = await admin
    .from("profiles")
    .select("id, email, role, plan, avatar_url")
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

  const nextRole =
    existingProfile?.role === "admin"
      ? "admin"
      : accountType === "gallerist"
        ? "gallerist"
        : existingProfile?.role || "user";

  const payload = {
    id: user.id,
    email: user.email || existingProfile?.email || "",
    full_name: fullName,
    display_name: displayName,
    avatar_url: existingProfile?.avatar_url || avatarUrl,
    role: nextRole,
    plan: existingProfile?.plan || "free",
  };

  const { data: profile, error: upsertError } = await admin
    .from("profiles")
    .upsert(payload, {
      onConflict: "id",
    })
    .select("id, email, full_name, display_name, avatar_url, role, plan, created_at")
    .single();

  if (upsertError || !profile) {
    return NextResponse.json(
      {
        success: false,
        error: "Errore aggiornamento profilo.",
        details: upsertError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    profile,
    accountType,
  });
}
