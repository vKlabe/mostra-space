import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import GalleryCatalogPdfDocument, {
  type PdfCatalogArtwork,
  type PdfCatalogGallery,
  type PdfCatalogSettings,
} from "@/components/catalog/GalleryCatalogPdfDocument";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    galleryId: string;
  }>;
};

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: "user" | "gallerist" | "admin";
};

type Gallery = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  cover_image_url: string | null;
};

type ArtworkRelation = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
  technique: string | null;
  dimensions: string | null;
  description: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  optimized_url: string | null;
  webgl_url: string | null;
  price: number | string | null;
  currency: string | null;
  is_for_sale: boolean | null;
  is_public: boolean | null;
  width_cm: number | string | null;
  height_cm: number | string | null;
  depth_cm: number | string | null;
};

type GalleryArtworkRow = {
  id: string;
  gallery_id: string;
  artwork_id: string;
  sort_order: number | null;
  artworks: ArtworkRelation | ArtworkRelation[] | null;
};

type CatalogSettingsRecord = {
  id: string;
  gallery_id: string;
  title: string | null;
  subtitle: string | null;
  curator_name: string | null;
  gallery_name: string | null;
  intro_text: string | null;
  contact_email: string | null;
  website: string | null;
  layout_variant: string | null;
  include_descriptions: boolean;
  include_prices: boolean;
  include_public_link: boolean;
  include_private_artworks: boolean;
};

function normalizeArtworkRelation(
  value: ArtworkRelation | ArtworkRelation[] | null
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

function toNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getArtworkImageUrl(artwork: ArtworkRelation) {
  return (
    artwork.webgl_url ||
    artwork.optimized_url ||
    artwork.thumbnail_url ||
    artwork.image_url ||
    ""
  );
}

function getAppUrl() {
  const rawUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://mostra.space";

  return rawUrl.replace(/\/$/, "");
}

type CatalogLayoutVariant = "elegant" | "compact" | "price_list";

function normalizeCatalogLayout(
  value: string | null | undefined
): CatalogLayoutVariant {
  if (value === "compact" || value === "price_list" || value === "elegant") {
    return value;
  }

  return "elegant";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

async function imageUrlToJpegDataUrl(url: string) {
  if (!url) {
    return "";
  }

  if (url.startsWith("data:image/jpeg;base64,")) {
    return url;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return "";
    }

    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 84,
        mozjpeg: true,
      })
      .toBuffer();

    return `data:image/jpeg;base64,${outputBuffer.toString("base64")}`;
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { galleryId } = await context.params;

  if (!galleryId) {
    return NextResponse.json(
      { error: "Missing galleryId" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, display_name, full_name, role")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    return NextResponse.json(
      {
        error: "Profilo non trovato.",
        details: profileError?.message || null,
      },
      { status: 404 }
    );
  }

  const { data: gallery, error: galleryError } = await admin
    .from("galleries")
    .select("id, owner_id, title, slug, description, status, cover_image_url")
    .eq("id", galleryId)
    .single<Gallery>();

  if (galleryError || !gallery) {
    return NextResponse.json(
      {
        error: "Galleria non trovata.",
        details: galleryError?.message || null,
      },
      { status: 404 }
    );
  }

  const isAdmin = profile.role === "admin";
  const isOwner = gallery.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json(
      {
        error:
          "Non puoi scaricare il catalogo PDF di una galleria che non gestisci.",
      },
      { status: 403 }
    );
  }

  const { data: catalogSettingsData } = await admin
    .from("gallery_catalog_settings")
    .select(
      [
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
      ].join(", ")
    )
    .eq("gallery_id", gallery.id)
    .maybeSingle<CatalogSettingsRecord>();

  const appUrl = getAppUrl();
  const publicUrl = `${appUrl}/gallerie/${gallery.slug}`;

  const settings: PdfCatalogSettings = {
    title: catalogSettingsData?.title || gallery.title,
    subtitle: catalogSettingsData?.subtitle || "Catalogo mostra",
    curatorName:
      catalogSettingsData?.curator_name ||
      profile.full_name ||
      profile.display_name ||
      "",
    galleryName: catalogSettingsData?.gallery_name || "MostraSpace",
    introText:
      catalogSettingsData?.intro_text || gallery.description || "",
    contactEmail:
      catalogSettingsData?.contact_email || profile.email || user.email || "",
    website: catalogSettingsData?.website || publicUrl,
    layoutVariant: normalizeCatalogLayout(catalogSettingsData?.layout_variant),
    includeDescriptions:
      catalogSettingsData?.include_descriptions ?? true,
    includePrices: catalogSettingsData?.include_prices ?? true,
    includePublicLink:
      catalogSettingsData?.include_public_link ?? true,
    includePrivateArtworks:
      catalogSettingsData?.include_private_artworks ?? true,
  };

  const { data: galleryArtworks, error: galleryArtworksError } = await admin
    .from("gallery_artworks")
    .select(
      `
      id,
      gallery_id,
      artwork_id,
      sort_order,
      artworks (
        id,
        title,
        artist_name,
        year,
        technique,
        dimensions,
        description,
        image_url,
        thumbnail_url,
        optimized_url,
        webgl_url,
        price,
        currency,
        is_for_sale,
        is_public,
        width_cm,
        height_cm,
        depth_cm
      )
    `
    )
    .eq("gallery_id", gallery.id)
    .order("sort_order", { ascending: true });

  if (galleryArtworksError) {
    return NextResponse.json(
      {
        error: "Errore caricamento opere catalogo.",
        details: galleryArtworksError.message,
      },
      { status: 500 }
    );
  }

  const safeGalleryArtworks =
    (galleryArtworks || []) as unknown as GalleryArtworkRow[];

  let artworks: PdfCatalogArtwork[] = safeGalleryArtworks.flatMap((item) => {
    const artwork = normalizeArtworkRelation(item.artworks);

    if (!artwork) {
      return [];
    }

    return [
      {
        galleryArtworkId: item.id,
        artworkId: artwork.id,
        title: artwork.title || "Opera senza titolo",
        artistName: artwork.artist_name || "",
        year: artwork.year || "",
        technique: artwork.technique || "",
        dimensions: artwork.dimensions || "",
        description: artwork.description || "",
        imageUrl: getArtworkImageUrl(artwork),
        price: artwork.price,
        currency: artwork.currency || "EUR",
        isForSale: artwork.is_for_sale === true,
        isPublic: artwork.is_public === true,
        widthCm: toNullableNumber(artwork.width_cm),
        heightCm: toNullableNumber(artwork.height_cm),
        depthCm: toNullableNumber(artwork.depth_cm),
        sortOrder: item.sort_order || 0,
      },
    ];
  });

  if (!settings.includePrivateArtworks) {
    artworks = artworks.filter((artwork) => artwork.isPublic);
  }

  const coverImageUrl = await imageUrlToJpegDataUrl(
    gallery.cover_image_url || artworks[0]?.imageUrl || ""
  );

  const pdfArtworks = await Promise.all(
    artworks.map(async (artwork) => ({
      ...artwork,
      imageUrl: await imageUrlToJpegDataUrl(artwork.imageUrl),
    }))
  );

  const pdfGallery: PdfCatalogGallery = {
    id: gallery.id,
    title: gallery.title,
    slug: gallery.slug,
    description: gallery.description || "",
    coverImageUrl,
    status: gallery.status,
    publicUrl,
  };

  try {
  const pdfDocument = React.createElement(GalleryCatalogPdfDocument, {
    gallery: pdfGallery,
    artworks: pdfArtworks,
    settings,
  }) as unknown as Parameters<typeof renderToBuffer>[0];

  const pdfBuffer = await renderToBuffer(pdfDocument);

  const fileName = `catalogo-${slugify(
    settings.title || gallery.slug || gallery.id
  )}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
} catch (error) {
    return NextResponse.json(
      {
        error: "Errore generazione PDF catalogo.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}