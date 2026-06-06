import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseDimensionCm,
  parseOptionalDepthCm,
} from "@/lib/artworks/dimensions";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    artworkId: string;
  }>;
};

type UpdateArtworkPayload = {
  title?: unknown;
  artistName?: unknown;
  year?: unknown;
  technique?: unknown;
  dimensions?: unknown;
  widthCm?: unknown;
  heightCm?: unknown;
  depthCm?: unknown;
  description?: unknown;
  price?: unknown;
  currency?: unknown;
  isForSale?: unknown;
  isPublic?: unknown;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function cleanBoolean(value: unknown) {
  return value === true;
}

async function getUserAndPermission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  artworkId: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
      user: null,
      artwork: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const { data: artwork, error: artworkError } = await supabase
    .from("artworks")
    .select("id, owner_id, title, image_url, thumbnail_url")
    .eq("id", artworkId)
    .single();

  if (artworkError || !artwork) {
    return {
      ok: false,
      status: 404,
      error: "Artwork not found",
      user,
      artwork: null,
    };
  }

  const isAdmin = profile?.role === "admin";
  const isOwner = artwork.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
      user,
      artwork,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    user,
    artwork,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { artworkId } = await context.params;

  if (!artworkId) {
    return NextResponse.json(
      { error: "Missing artworkId" },
      { status: 400 }
    );
  }

  let body: UpdateArtworkPayload;

  try {
    body = (await request.json()) as UpdateArtworkPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const title = cleanText(body.title);

  if (!title) {
    return NextResponse.json(
      { error: "Il titolo è obbligatorio." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const permission = await getUserAndPermission(supabase, artworkId);

  if (!permission.ok || !permission.artwork) {
    return NextResponse.json(
      { error: permission.error },
      { status: permission.status }
    );
  }

  const widthCm = parseDimensionCm(cleanText(body.widthCm));
  const heightCm = parseDimensionCm(cleanText(body.heightCm));
  const depthCm = parseOptionalDepthCm(cleanText(body.depthCm));

  const { data: updated, error: updateError } = await supabase
    .from("artworks")
    .update({
      title,
      artist_name: cleanNullableText(body.artistName),
      year: cleanNullableText(body.year),
      technique: cleanNullableText(body.technique),
      dimensions: cleanNullableText(body.dimensions),
      width_cm: widthCm,
      height_cm: heightCm,
      depth_cm: depthCm,
      description: cleanNullableText(body.description),
      price: cleanNullableText(body.price),
      currency: cleanNullableText(body.currency) || "EUR",
      is_for_sale: cleanBoolean(body.isForSale),
      is_public: cleanBoolean(body.isPublic),
      updated_at: new Date().toISOString(),
    })
    .eq("id", permission.artwork.id)
    .select(
      `
      id,
      owner_id,
      title,
      artist_name,
      year,
      technique,
      dimensions,
      width_cm,
      height_cm,
      depth_cm,
      description,
      image_url,
      price,
      currency,
      is_for_sale,
      is_public,
      updated_at
      `
    )
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      {
        error: "Update failed",
        details: updateError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    artwork: updated,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { artworkId } = await context.params;

  if (!artworkId) {
    return NextResponse.json(
      { error: "Missing artworkId" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const permission = await getUserAndPermission(supabase, artworkId);

  if (!permission.ok || !permission.artwork) {
    return NextResponse.json(
      { error: permission.error },
      { status: permission.status }
    );
  }

  const { data: linkedRows, error: linkedRowsError } = await supabase
    .from("gallery_artworks")
    .select("id, gallery_id")
    .eq("artwork_id", permission.artwork.id);

  if (linkedRowsError) {
    return NextResponse.json(
      {
        error: "Errore controllo collegamenti galleria.",
        details: linkedRowsError.message,
      },
      { status: 500 }
    );
  }

  if (linkedRows && linkedRows.length > 0) {
    return NextResponse.json(
      {
        error:
          "Questa opera è collegata a una o più gallerie. Rimuovila prima dalle gallerie, poi potrai eliminarla.",
        linkedCount: linkedRows.length,
      },
      { status: 409 }
    );
  }

  const { error: deleteError } = await supabase
    .from("artworks")
    .delete()
    .eq("id", permission.artwork.id);

  if (deleteError) {
    return NextResponse.json(
      {
        error: "Delete failed",
        details: deleteError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    deletedArtworkId: permission.artwork.id,
  });
}