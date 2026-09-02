import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
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

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function getRedirectOrigin(request: Request, origin: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (!isLocalEnv && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return origin;
}

async function syncOAuthProfile(user: User) {
  const metadata = user.user_metadata || {};

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
    throw new Error(existingProfileError.message);
  }

  const nextRole =
    existingProfile?.role === "admin"
      ? "admin"
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

  const { error: upsertError } = await admin.from("profiles").upsert(payload, {
    onConflict: "id",
  });

  if (upsertError) {
    throw new Error(upsertError.message);
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeNextPath(searchParams.get("next"));
  const redirectOrigin = getRedirectOrigin(request, origin);

  if (!code) {
    return NextResponse.redirect(
      `${redirectOrigin}/auth/login?error=oauth_missing_code`
    );
  }

  const supabase = await createClient();

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code
  );

  if (exchangeError) {
    return NextResponse.redirect(
      `${redirectOrigin}/auth/login?error=oauth_callback`
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(
      `${redirectOrigin}/auth/login?error=oauth_session`
    );
  }

  try {
    await syncOAuthProfile(user);
  } catch {
    return NextResponse.redirect(
      `${redirectOrigin}/auth/login?error=oauth_profile`
    );
  }

  return NextResponse.redirect(`${redirectOrigin}${next}`);
}
