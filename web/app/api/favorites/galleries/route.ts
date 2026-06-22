import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FavoriteGalleryPayload = {
  galleryId?: unknown;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function isValidUuid(value: string) {
  return (
    value.length === 36 &&
    value.includes("-") &&
    /^[0-9a-f-]+$/i.test(value)
  );
}

async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    user,
    error,
  };
}

export async function GET(request: Request) {
  const { user, error } = await getCurrentUser();

  if (error || !user) {
    return NextResponse.json(
      {
        success: false,
        error: "Utente non autenticato.",
      },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const galleryId = cleanText(searchParams.get("galleryId"));

  if (!galleryId || !isValidUuid(galleryId)) {
    return NextResponse.json(
      {
        success: false,
        error: "galleryId non valido.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error: favoriteError } = await admin
    .from("favorite_galleries")
    .select("id, gallery_id, created_at")
    .eq("user_id", user.id)
    .eq("gallery_id", galleryId)
    .maybeSingle();

  if (favoriteError) {
    return NextResponse.json(
      {
        success: false,
        error: "Errore lettura preferito.",
        details: favoriteError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    isFavorite: Boolean(data),
    favorite: data || null,
  });
}

export async function POST(request: Request) {
  const { user, error } = await getCurrentUser();

  if (error || !user) {
    return NextResponse.json(
      {
        success: false,
        error: "Utente non autenticato.",
      },
      { status: 401 }
    );
  }

  let body: FavoriteGalleryPayload;

  try {
    body = (await request.json()) as FavoriteGalleryPayload;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Payload non valido.",
      },
      { status: 400 }
    );
  }

  const galleryId = cleanText(body.galleryId);

  if (!galleryId || !isValidUuid(galleryId)) {
    return NextResponse.json(
      {
        success: false,
        error: "galleryId non valido.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error: upsertError } = await admin
    .from("favorite_galleries")
    .upsert(
      {
        user_id: user.id,
        gallery_id: galleryId,
      },
      {
        onConflict: "user_id,gallery_id",
      }
    )
    .select("id, gallery_id, created_at")
    .single();

  if (upsertError || !data) {
    return NextResponse.json(
      {
        success: false,
        error: "Errore salvataggio preferito.",
        details: upsertError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    isFavorite: true,
    favorite: data,
  });
}

export async function DELETE(request: Request) {
  const { user, error } = await getCurrentUser();

  if (error || !user) {
    return NextResponse.json(
      {
        success: false,
        error: "Utente non autenticato.",
      },
      { status: 401 }
    );
  }

  let body: FavoriteGalleryPayload;

  try {
    body = (await request.json()) as FavoriteGalleryPayload;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Payload non valido.",
      },
      { status: 400 }
    );
  }

  const galleryId = cleanText(body.galleryId);

  if (!galleryId || !isValidUuid(galleryId)) {
    return NextResponse.json(
      {
        success: false,
        error: "galleryId non valido.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { error: deleteError } = await admin
    .from("favorite_galleries")
    .delete()
    .eq("user_id", user.id)
    .eq("gallery_id", galleryId);

  if (deleteError) {
    return NextResponse.json(
      {
        success: false,
        error: "Errore rimozione preferito.",
        details: deleteError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    isFavorite: false,
  });
}