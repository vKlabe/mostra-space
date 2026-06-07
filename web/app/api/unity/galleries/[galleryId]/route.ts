import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    galleryId: string;
  }>;
};

type UnityMode = "visitor" | "editor";

type GalleryStatus = "draft" | "published" | "archived";

type GalleryRecord = {
  id: string;
  owner_id: string;
  template_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  status: GalleryStatus;
  cover_image_url: string | null;
  published_at: string | null;
};

type TemplateRecord = {
  id: string;
  unity_scene_key: string;
};

type ArtworkRecord = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
  technique: string | null;
  dimensions: string | null;
  width_cm: number | string | null;
  height_cm: number | string | null;
  depth_cm: number | string | null;
  description: string | null;
  image_url: string | null;
  price: number | string | null;
  currency: string | null;
  is_for_sale: boolean | null;
  is_public: boolean | null;
};

type GalleryArtworkRecord = {
  id: string;
  gallery_id: string;
  artwork_id: string;

  position_x: number | string | null;
  position_y: number | string | null;
  position_z: number | string | null;

  rotation_x: number | string | null;
  rotation_y: number | string | null;
  rotation_z: number | string | null;

  scale_x: number | string | null;
  scale_y: number | string | null;
  scale_z: number | string | null;

  wall_key: string | null;
  sort_order: number | null;

  display_width_cm: number | string | null;
  display_height_cm: number | string | null;

  frame_enabled: boolean | null;
  frame_color: string | null;
  frame_width_cm: number | string | null;
  frame_depth_cm: number | string | null;

  artworks: ArtworkRecord | ArtworkRecord[] | null;
};

function parseMode(request: Request): UnityMode {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");

  return mode === "editor" ? "editor" : "visitor";
}

function isDevTokenValid(request: Request) {
  const expectedToken = process.env.ARTPORTAL_UNITY_DEV_TOKEN;
  const receivedToken = request.headers.get("x-artportal-dev-token");

  if (!expectedToken || !receivedToken) {
    return false;
  }

  // Il dev token vale solo in locale/sviluppo.
  // In produzione Vercel NODE_ENV è "production", quindi viene sempre rifiutato.
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return receivedToken === expectedToken;
}

function toNumber(value: number | string | null | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullablePositiveNumber(value: number | string | null | undefined) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function toNullableNonNegativeNumber(value: number | string | null | undefined) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function normalizeArtworkRelation(
  value: ArtworkRecord | ArtworkRecord[] | null
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

function formatPrice(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

function normalizeHexColor(value: string | null | undefined) {
  if (!value) {
    return "#000000";
  }

  const cleaned = value.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) {
    return cleaned;
  }

  return "#000000";
}

export async function GET(request: Request, context: RouteContext) {
  const { galleryId } = await context.params;
  const mode = parseMode(request);

  if (!galleryId) {
    return NextResponse.json(
      { error: "Missing galleryId" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const devTokenOk = isDevTokenValid(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: gallery, error: galleryError } = await admin
    .from("galleries")
    .select(
      "id, owner_id, template_id, title, slug, description, status, cover_image_url, published_at"
    )
    .eq("id", galleryId)
    .single<GalleryRecord>();

  if (galleryError || !gallery) {
    return NextResponse.json(
      {
        error: "Gallery not found",
        details: galleryError?.message || null,
      },
      { status: 404 }
    );
  }

  let isAllowed = false;

  if (mode === "visitor") {
    isAllowed = gallery.status === "published";
  }

  if (mode === "editor") {
    if (devTokenOk) {
      isAllowed = true;
    } else if (user) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

      const isOwner = gallery.owner_id === user.id;
      const isAdmin = profile?.role === "admin";

      isAllowed = isOwner || isAdmin;
    }
  }

  if (!isAllowed) {
    return NextResponse.json(
      {
        error:
          mode === "visitor"
            ? "Gallery is not published"
            : "You are not allowed to edit this gallery",
        mode,
        galleryStatus: gallery.status,
        devTokenEnabled:
          process.env.NODE_ENV !== "production" &&
          Boolean(process.env.ARTPORTAL_UNITY_DEV_TOKEN),
        devTokenReceived: Boolean(request.headers.get("x-artportal-dev-token")),
        userReceived: Boolean(user),
      },
      { status: mode === "visitor" ? 404 : 403 }
    );
  }

  let unitySceneKey = "basic_room";

  if (gallery.template_id) {
    const { data: template } = await admin
      .from("gallery_templates")
      .select("id, unity_scene_key")
      .eq("id", gallery.template_id)
      .single<TemplateRecord>();

    if (template?.unity_scene_key) {
      unitySceneKey = template.unity_scene_key;
    }
  }

  const { data: galleryArtworks, error: galleryArtworksError } = await admin
    .from("gallery_artworks")
    .select(
      `
      id,
      gallery_id,
      artwork_id,

      position_x,
      position_y,
      position_z,

      rotation_x,
      rotation_y,
      rotation_z,

      scale_x,
      scale_y,
      scale_z,

      wall_key,
      sort_order,

      display_width_cm,
      display_height_cm,

      frame_enabled,
      frame_color,
      frame_width_cm,
      frame_depth_cm,

      artworks (
        id,
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
        is_public
      )
    `
    )
    .eq("gallery_id", gallery.id)
    .order("sort_order", { ascending: true });

  if (galleryArtworksError) {
    return NextResponse.json(
      {
        error: "Gallery artworks loading failed",
        details: galleryArtworksError.message,
      },
      { status: 500 }
    );
  }

  const safeGalleryArtworks =
    (galleryArtworks || []) as unknown as GalleryArtworkRecord[];

  const artworks = safeGalleryArtworks
    .map((item) => {
      const artwork = normalizeArtworkRelation(item.artworks);

      if (!artwork) {
        return null;
      }

      if (mode === "visitor" && artwork.is_public !== true) {
        return null;
      }

      if (!artwork.image_url) {
        return null;
      }

      const artworkWidthCm = toNullablePositiveNumber(artwork.width_cm);
      const artworkHeightCm = toNullablePositiveNumber(artwork.height_cm);
      const artworkDepthCm = toNullableNonNegativeNumber(artwork.depth_cm);

      const displayWidthCm =
        toNullablePositiveNumber(item.display_width_cm) ||
        artworkWidthCm ||
        50;

      const displayHeightCm =
        toNullablePositiveNumber(item.display_height_cm) ||
        artworkHeightCm ||
        50;

      const frameEnabled = item.frame_enabled === true;
      const frameColor = normalizeHexColor(item.frame_color);
      const frameWidthCm = toNullableNonNegativeNumber(item.frame_width_cm) ?? 0;
      const frameDepthCm = toNullableNonNegativeNumber(item.frame_depth_cm) ?? 2;

      return {
        galleryArtworkId: item.id,
        artworkId: artwork.id,

        title: artwork.title,
        artistName: artwork.artist_name || "",
        year: artwork.year || "",
        technique: artwork.technique || "",
        dimensions: artwork.dimensions || "",
        price: formatPrice(artwork.price),
        currency: artwork.currency || "EUR",
        description: artwork.description || "",
        imageUrl: artwork.image_url || "",

        isForSale: artwork.is_for_sale === true,
        isPublic: artwork.is_public === true,

        artworkWidthCm,
        artworkHeightCm,
        artworkDepthCm,

        widthCm: artworkWidthCm || 50,
        heightCm: artworkHeightCm || 50,
        depthCm: artworkDepthCm || 0,

        displayWidthCm,
        displayHeightCm,

        frameEnabled,
        frameColor,
        frameWidthCm,
        frameDepthCm,

        positionX: toNumber(item.position_x, 0),
        positionY: toNumber(item.position_y, 1.8),
        positionZ: toNumber(item.position_z, 3.85),

        rotationX: toNumber(item.rotation_x, 0),
        rotationY: toNumber(item.rotation_y, 180),
        rotationZ: toNumber(item.rotation_z, 0),

        scaleX: toNumber(item.scale_x, 1),
        scaleY: toNumber(item.scale_y, 1),
        scaleZ: toNumber(item.scale_z, 1),

        wallKey: item.wall_key || "",
        sortOrder: item.sort_order || 0,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    galleryId: gallery.id,
    slug: gallery.slug,
    title: gallery.title,
    description: gallery.description || "",
    status: gallery.status,
    unitySceneKey,
    mode,
    artworks,
  });
}