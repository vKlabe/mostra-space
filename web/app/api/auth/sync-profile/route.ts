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

function getProviderNames(user: {
  app_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string | null }> | null;
}) {
  const providers = new Set<string>();

  const primaryProvider = user.app_metadata?.provider;
  if (typeof primaryProvider === "string") {
    providers.add(primaryProvider.toLowerCase());
  }

  const appProviders = user.app_metadata?.providers;
  if (Array.isArray(appProviders)) {
    for (const provider of appProviders) {
      if (typeof provider === "string") {
        providers.add(provider.toLowerCase());
      }
    }
  }

  for (const identity of user.identities || []) {
    if (identity.provider) {
      providers.add(identity.provider.toLowerCase());
    }
  }

  return providers;
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

  const providers = getProviderNames(user);
  const hasEmailProvider = providers.has("email");

  const admin = createAdminClient();

  const { data: existingProfile, error: existingProfileError } = await admin
    .from("profiles")
    .select(
      "id, email, role, plan, avatar_url, avatar_customized, has_local_password"
    )
    .eq("id", user.id)
    .maybeSingle<{
      id: string;
      email: string | null;
      role: "user" | "gallerist" | "admin";
      plan: string | null;
      avatar_url: string | null;
      avatar_customized: boolean | null;
      has_local_password: boolean | null;
    }>();

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

  // Importante: una volta true, non torna mai false durante un login Google.
  // Gli account email/password vengono riconosciuti automaticamente come true.
  const hasLocalPassword =
    existingProfile?.has_local_password === true || hasEmailProvider;

  // Se l’utente ha già scelto o rimosso manualmente l’avatar, Google non deve
  // più sovrascrivere quella scelta. Se non ha mai personalizzato l’avatar,
  // manteniamo l’avatar esistente oppure importiamo quello del provider.
  const avatarCustomized = existingProfile?.avatar_customized === true;
  const nextAvatarUrl = avatarCustomized
    ? existingProfile?.avatar_url || null
    : existingProfile?.avatar_url || avatarUrl;

  const payload = {
    id: user.id,
    email: user.email || existingProfile?.email || "",
    full_name: fullName,
    display_name: displayName,
    avatar_url: nextAvatarUrl,
    avatar_customized: avatarCustomized,
    role: nextRole,
    plan: existingProfile?.plan || "free",
    has_local_password: hasLocalPassword,
  };

  const { data: profile, error: upsertError } = await admin
    .from("profiles")
    .upsert(payload, {
      onConflict: "id",
    })
    .select(
      "id, email, full_name, display_name, avatar_url, avatar_customized, role, plan, has_local_password, created_at"
    )
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
