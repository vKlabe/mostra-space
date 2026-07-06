import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseDimensionCm,
  parseOptionalDepthCm,
} from "@/lib/artworks/dimensions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    artworkId: string;
  }>;
};

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

type ArtworkPermissionRow = {
  id: string;
  owner_id: string;
  title: string;
  image_url: string | null;
  thumbnail_url: string | null;
  storage_path: string | null;
};

type UpdateArtworkPayload = {
  title?: unknown;

  artistName?: unknown;
  artist_name?: unknown;

  year?: unknown;
  technique?: unknown;
  dimensions?: unknown;

  widthCm?: unknown;
  width_cm?: unknown;

  heightCm?: unknown;
  height_cm?: unknown;

  depthCm?: unknown;
  depth_cm?: unknown;

  description?: unknown;

  price?: unknown;
  currency?: unknown;

  isForSale?: unknown;
  is_for_sale?: unknown;

  isPublic?: unknown;
  is_public?: unknown;
};

type ArtworkUpdate = {
  title?: string;
  artist_name?: string | null;
  year?: string | null;
  technique?: string | null;
  dimensions?: string | null;
  width_cm?: number | null;
  height_cm?: number | null;
  depth_cm?: number | null;
  description?: string | null;
  price?: number | null;
  currency?: string;
  is_for_sale?: boolean;
  is_public?: boolean;
  updated_at: string;
};

function hasOwn(object: object, key: string) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function getFirstDefined(...values: unknown[]) {
  for (const value of values) {
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

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
  return (
    value === true ||
    value === "true" ||
    value === "on" ||
    value === "1"
  );
}

function cleanPrice(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim().replace(",", ".");

  if (!cleaned) {
    return null;
  }

  const numberValue = Number(cleaned);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return null;
  }

  return numberValue;
}

function cleanCurrency(value: unknown) {
  const cleaned = cleanText(value).toUpperCase();

  if (!cleaned) {
    return "EUR";
  }

  return cleaned.slice(0, 3);
}

async function getUserAndPermission(artworkId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
      user: null,
      admin,
      artwork: null,
    };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    return {
      ok: false,
      status: 404,
      error: "Profilo non trovato.",
      user,
      admin,
      artwork: null,
    };
  }

  const canManage =
    profile.role === "gallerist" || profile.role === "admin";

  if (!canManage) {
    return {
      ok: false,
      status: 403,
      error: "Solo i galleristi possono modificare opere.",
      user,
      admin,
      artwork: null,
    };
  }

  const { data: artwork, error: artworkError } = await admin
    .from("artworks")
    .select(
      "id, owner_id, title, image_url, thumbnail_url, storage_path"
    )
    .eq("id", artworkId)
    .single<ArtworkPermissionRow>();

  if (artworkError || !artwork) {
    return {
      ok: false,
      status: 404,
      error: "Opera non trovata.",
      user,
      admin,
      artwork: null,
    };
  }

  const isAdmin = profile.role === "admin";
  const isOwner = artwork.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return {
      ok: false,
      status: 403,
      error: "Non hai i permessi per modificare questa opera.",
      user,
      admin,
      artwork,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    user,
    admin,
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
      { error: "JSON non valido." },
      { status: 400 }
    );
  }

  const title = cleanText(body.title);

  if (!title) {
    return NextResponse.json(
      { error: "Il titolo dell'opera è obbligatorio." },
      { status: 400 }
    );
  }

  const permission = await getUserAndPermission(artworkId);

  if (!permission.ok || !permission.artwork) {
    return NextResponse.json(
      { error: permission.error },
      { status: permission.status }
    );
  }

  const updatePayload: ArtworkUpdate = {
    title,
    updated_at: new Date().toISOString(),
  };

  if (hasOwn(body, "artistName") || hasOwn(body, "artist_name")) {
    updatePayload.artist_name = cleanNullableText(
      getFirstDefined(body.artistName, body.artist_name)
    );
  }

  if (hasOwn(body, "year")) {
    updatePayload.year = cleanNullableText(body.year);
  }

  if (hasOwn(body, "technique")) {
    updatePayload.technique = cleanNullableText(body.technique);
  }

  if (hasOwn(body, "dimensions")) {
    updatePayload.dimensions = cleanNullableText(body.dimensions);
  }

  if (hasOwn(body, "widthCm") || hasOwn(body, "width_cm")) {
    updatePayload.width_cm = parseDimensionCm(
      cleanText(getFirstDefined(body.widthCm, body.width_cm))
    );
  }

  if (hasOwn(body, "heightCm") || hasOwn(body, "height_cm")) {
    updatePayload.height_cm = parseDimensionCm(
      cleanText(getFirstDefined(body.heightCm, body.height_cm))
    );
  }

  if (hasOwn(body, "depthCm") || hasOwn(body, "depth_cm")) {
    updatePayload.depth_cm = parseOptionalDepthCm(
      cleanText(getFirstDefined(body.depthCm, body.depth_cm))
    );
  }

  if (hasOwn(body, "description")) {
    updatePayload.description = cleanNullableText(body.description);
  }

  if (hasOwn(body, "price")) {
    updatePayload.price = cleanPrice(body.price);
  }

  if (hasOwn(body, "currency")) {
    updatePayload.currency = cleanCurrency(body.currency);
  }

  if (hasOwn(body, "isForSale") || hasOwn(body, "is_for_sale")) {
    updatePayload.is_for_sale = cleanBoolean(
      getFirstDefined(body.isForSale, body.is_for_sale)
    );
  }

  if (hasOwn(body, "isPublic") || hasOwn(body, "is_public")) {
    updatePayload.is_public = cleanBoolean(
      getFirstDefined(body.isPublic, body.is_public)
    );
  }

  const { data: updated, error: updateError } = await permission.admin
    .from("artworks")
    .update(updatePayload)
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
      thumbnail_url,
      storage_path,
      file_size_bytes,
      price,
      currency,
      is_for_sale,
      is_public,
      created_at,
      updated_at
      `
    )
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      {
        error: "Errore aggiornamento opera.",
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

  const permission = await getUserAndPermission(artworkId);

  if (!permission.ok || !permission.artwork) {
    return NextResponse.json(
      { error: permission.error },
      { status: permission.status }
    );
  }

  const { error: galleryArtworkDeleteError } = await permission.admin
    .from("gallery_artworks")
    .delete()
    .eq("artwork_id", permission.artwork.id);

  if (galleryArtworkDeleteError) {
    return NextResponse.json(
      {
        error: "Errore rimozione opera dalle gallerie.",
        details: galleryArtworkDeleteError.message,
      },
      { status: 500 }
    );
  }

  const { error: artworkDeleteError } = await permission.admin
    .from("artworks")
    .delete()
    .eq("id", permission.artwork.id);

  if (artworkDeleteError) {
    return NextResponse.json(
      {
        error: "Errore eliminazione opera.",
        details: artworkDeleteError.message,
      },
      { status: 500 }
    );
  }

  let storageWarning: string | null = null;

  if (permission.artwork.storage_path) {
    const { error: storageError } = await permission.admin.storage
      .from("artworks")
      .remove([permission.artwork.storage_path]);

    if (storageError) {
      storageWarning = storageError.message;
    }
  }

  return NextResponse.json({
    success: true,
    deletedArtworkId: permission.artwork.id,
    storageWarning,
  });
}