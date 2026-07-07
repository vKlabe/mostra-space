import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProfilePayload = {
  fullName?: unknown;
  displayName?: unknown;
  websiteUrl?: unknown;
  instagramUrl?: unknown;
  bio?: unknown;
  currentPassword?: unknown;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanNullableText(value: unknown, maxLength: number) {
  const cleaned = cleanText(value);

  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, maxLength);
}

function cleanDisplayName(value: unknown) {
  const cleaned = cleanText(value).slice(0, 80);

  return cleaned || null;
}

export async function PATCH(request: Request) {
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

  if (!user.email) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Non riesco a verificare la password perché l'account non ha una email associata.",
      },
      { status: 400 }
    );
  }

  let body: ProfilePayload;

  try {
    body = (await request.json()) as ProfilePayload;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Payload non valido.",
      },
      { status: 400 }
    );
  }

  const currentPassword = cleanText(body.currentPassword);

  if (!currentPassword) {
    return NextResponse.json(
      {
        success: false,
        error: "Inserisci la password attuale per confermare le modifiche.",
      },
      { status: 400 }
    );
  }

  const { error: passwordError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (passwordError) {
    return NextResponse.json(
      {
        success: false,
        error: "Password non corretta. Le modifiche non sono state salvate.",
      },
      { status: 401 }
    );
  }

  const fullName = cleanNullableText(body.fullName, 120);
  const displayName = cleanDisplayName(body.displayName);
  const websiteUrl = cleanNullableText(body.websiteUrl, 200);
  const instagramUrl = cleanNullableText(body.instagramUrl, 200);
  const bio = cleanNullableText(body.bio, 800);

  const admin = createAdminClient();

  const { data: updatedProfile, error: updateError } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      display_name: displayName,
      website_url: websiteUrl,
      instagram_url: instagramUrl,
      bio,
    })
    .eq("id", user.id)
    .select(
      "id, email, full_name, display_name, role, plan, bio, website_url, instagram_url, created_at"
    )
    .single();

  if (updateError || !updatedProfile) {
    return NextResponse.json(
      {
        success: false,
        error: "Errore aggiornamento profilo.",
        details: updateError?.message || null,
      },
      { status: 500 }
    );
  }

  const { error: metadataError } = await admin.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: {
        ...(user.user_metadata || {}),
        full_name: fullName || "",
        display_name: displayName || "",
        website_url: websiteUrl || "",
        instagram_url: instagramUrl || "",
        bio: bio || "",
      },
    }
  );

  if (metadataError) {
    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      warning: "Profilo aggiornato, ma metadata auth non aggiornati.",
      details: metadataError.message,
    });
  }

  return NextResponse.json({
    success: true,
    profile: updatedProfile,
  });
}
