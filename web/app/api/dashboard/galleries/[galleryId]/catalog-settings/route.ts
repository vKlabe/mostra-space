import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    galleryId: string;
  }>;
};

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

type GalleryRecord = {
  id: string;
  owner_id: string;
};

type CatalogLayoutVariant = "elegant" | "compact" | "price_list";

type CatalogSettingsPayload = {
  title?: unknown;
  subtitle?: unknown;
  curatorName?: unknown;
  galleryName?: unknown;
  introText?: unknown;
  contactEmail?: unknown;
  website?: unknown;
  layoutVariant?: unknown;
  includeDescriptions?: unknown;
  includePrices?: unknown;
  includePublicLink?: unknown;
  includePrivateArtworks?: unknown;
};

function cleanNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function cleanBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function cleanLayoutVariant(value: unknown): CatalogLayoutVariant {
  if (value === "compact" || value === "price_list" || value === "elegant") {
    return value;
  }

  return "elegant";
}

async function requireGalleryPermission(galleryId: string) {
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
      gallery: null,
      admin,
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
      gallery: null,
      admin,
    };
  }

  const { data: gallery, error: galleryError } = await admin
    .from("galleries")
    .select("id, owner_id")
    .eq("id", galleryId)
    .single<GalleryRecord>();

  if (galleryError || !gallery) {
    return {
      ok: false,
      status: 404,
      error: "Galleria non trovata.",
      gallery: null,
      admin,
    };
  }

  const isAdmin = profile.role === "admin";
  const isOwner = gallery.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return {
      ok: false,
      status: 403,
      error: "Non puoi modificare le impostazioni catalogo di questa galleria.",
      gallery,
      admin,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    gallery,
    admin,
  };
}

const CATALOG_SELECT = [
  "id",
  "gallery_id",
  "title",
  "subtitle",
  "curator_name",
  "gallery_name",
  "intro_text",
  "contact_email",
  "website",
  "layout_variant",
  "include_descriptions",
  "include_prices",
  "include_public_link",
  "include_private_artworks",
  "created_at",
  "updated_at",
].join(", ");

export async function GET(_request: Request, context: RouteContext) {
  const { galleryId } = await context.params;

  if (!galleryId) {
    return NextResponse.json(
      { error: "Missing galleryId" },
      { status: 400 }
    );
  }

  const permission = await requireGalleryPermission(galleryId);

  if (!permission.ok || !permission.gallery) {
    return NextResponse.json(
      { error: permission.error },
      { status: permission.status }
    );
  }

  const { data: settings, error: settingsError } = await permission.admin
    .from("gallery_catalog_settings")
    .select(CATALOG_SELECT)
    .eq("gallery_id", permission.gallery.id)
    .maybeSingle();

  if (settingsError) {
    return NextResponse.json(
      {
        error: "Errore caricamento impostazioni catalogo.",
        details: settingsError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    settings,
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const { galleryId } = await context.params;

  if (!galleryId) {
    return NextResponse.json(
      { error: "Missing galleryId" },
      { status: 400 }
    );
  }

  let body: CatalogSettingsPayload;

  try {
    body = (await request.json()) as CatalogSettingsPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const permission = await requireGalleryPermission(galleryId);

  if (!permission.ok || !permission.gallery) {
    return NextResponse.json(
      { error: permission.error },
      { status: permission.status }
    );
  }

  const payload = {
    gallery_id: permission.gallery.id,

    title: cleanNullableText(body.title),
    subtitle: cleanNullableText(body.subtitle),
    curator_name: cleanNullableText(body.curatorName),
    gallery_name: cleanNullableText(body.galleryName),
    intro_text: cleanNullableText(body.introText),
    contact_email: cleanNullableText(body.contactEmail),
    website: cleanNullableText(body.website),
    layout_variant: cleanLayoutVariant(body.layoutVariant),

    include_descriptions: cleanBoolean(body.includeDescriptions, true),
    include_prices: cleanBoolean(body.includePrices, true),
    include_public_link: cleanBoolean(body.includePublicLink, true),
    include_private_artworks: cleanBoolean(body.includePrivateArtworks, true),
  };

  const { data: settings, error: upsertError } = await permission.admin
    .from("gallery_catalog_settings")
    .upsert(payload, {
      onConflict: "gallery_id",
    })
    .select(CATALOG_SELECT)
    .single();

  if (upsertError || !settings) {
    return NextResponse.json(
      {
        error: "Errore salvataggio impostazioni catalogo.",
        details: upsertError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    settings,
  });
}