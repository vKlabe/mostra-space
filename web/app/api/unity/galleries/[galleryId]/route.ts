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
  artworks: ArtworkRecord | ArtworkRecord[] | null;
};

function parseMode(request: Request): UnityMode {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");

  return mode === "editor" ? "editor" : "visitor";
}

function toNumber(value: number | string | null | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
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
    if (user) {
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
      artworks (
        id,
        title,
        artist_name,
        year,
        technique,
        dimensions,
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