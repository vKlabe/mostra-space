import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        authenticated: false,
        isGoogleUser: false,
        hasLocalPassword: false,
        email: null,
      },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, has_local_password")
    .eq("id", user.id)
    .maybeSingle<{ id: string; has_local_password: boolean | null }>();

  if (profileError) {
    return NextResponse.json(
      {
        authenticated: true,
        error: "Errore lettura stato autenticazione account.",
        details: profileError.message,
      },
      { status: 500 }
    );
  }

  const providers = getProviderNames(user);

  return NextResponse.json({
    authenticated: true,
    isGoogleUser: providers.has("google"),
    hasLocalPassword: profile?.has_local_password === true,
    email: user.email || null,
  });
}
