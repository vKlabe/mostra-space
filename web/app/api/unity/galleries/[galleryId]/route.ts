import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getArtworkViewerUrl } from "@/lib/artworks/imageUrls";

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

type ProfileRecord = {
  id: string;
  role: "user" | "gallerist" | "admin";
  plan: string | null;
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

type GalleryArtworkRecord = {
  id: string;
  gallery_id: string;
  artwork_id: string;

  display_width_cm: number | string | null;
  display_height_cm: number | string | null;

  frame_enabled: boolean | null;
  frame_color: string | null;
  frame_width_cm: number | string | null;
  frame_depth_cm: number | string | null;

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

function normalizePlan(value: string | null | undefined) {
  const cleaned = (value || "free").trim().toLowerCase();

  if (
    cleaned === "pro" ||
    cleaned === "business" ||
    cleaned === "diamond" ||
    cleaned === "institution"
  ) {
    return cleaned;
  }

  return "free";
}

function canUseAdvancedMode(plan: string, role?: string | null) {
  if (role === "admin") {
    return true;
  }

  return (
    plan === "pro" ||
    plan === "business" ||
    plan === "diamond" ||
    plan === "institution"
  );
}

function isDevTokenValid(request: Request) {
  const expectedToken = process.env.ARTPORTAL_UNITY_DEV_TOKEN;
  const receivedToken = request.headers.get("x-artportal-dev-token");

  if (!expectedToken || !receivedToken) {
    return false;
  }

  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return receivedToken === expectedToken;
}

export async function GET(request: Request, context: RouteContext) {
  const { galleryId } = await context.params;
  const mode = parseMode(request);
  const devTokenOk = isDevTokenValid(request);

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

  let profile: ProfileRecord | null = null;

  if (user) {
    const { data: profileData } = await admin
      .from("profiles")
      .select("id, role, plan")
      .eq("id", user.id)
      .single<ProfileRecord>();

    profile = profileData || null;
  }

  let isAllowed = false;

  if (mode === "visitor") {
    isAllowed = gallery.status === "published";
  }

  if (mode === "editor") {
    if (devTokenOk) {
      isAllowed = true;
    }

    if (!isAllowed && user) {
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

      display_width_cm,
      display_height_cm,

      frame_enabled,
      frame_color,
      frame_width_cm,
      frame_depth_cm,

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

      const unityImageUrl = getArtworkViewerUrl(artwork);

if (!unityImageUrl) {
  return null;
}

      const artworkWidthCm = toNumber(artwork.width_cm, 0);
      const artworkHeightCm = toNumber(artwork.height_cm, 0);
      const artworkDepthCm = toNumber(artwork.depth_cm, 0);

      const displayWidthCm =
        toNumber(item.display_width_cm, 0) ||
        artworkWidthCm ||
        50;

      const displayHeightCm =
        toNumber(item.display_height_cm, 0) ||
        artworkHeightCm ||
        50;

      const frameEnabled = item.frame_enabled === true;
      const frameColor = item.frame_color || "#000000";

      const frameWidthCm = frameEnabled
        ? Math.max(0, toNumber(item.frame_width_cm, 0))
        : 0;

      const frameDepthCm = Math.max(0, toNumber(item.frame_depth_cm, 2));

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
        imageUrl: unityImageUrl,
originalImageUrl: artwork.image_url || "",
thumbnailUrl: artwork.thumbnail_url || "",
optimizedUrl: artwork.optimized_url || "",
webglUrl: artwork.webgl_url || "",

        isForSale: artwork.is_for_sale === true,
        isPublic: artwork.is_public === true,

        artworkWidthCm,
        artworkHeightCm,
        artworkDepthCm,

        widthCm: displayWidthCm,
        heightCm: displayHeightCm,
        depthCm: artworkDepthCm,

        displayWidthCm,
        displayHeightCm,

        frameEnabled,
        frameColor,
        frameWidthCm,
        frameDepthCm,

        positionX: toNumber(item.position_x, 0),
        positionY: toNumber(item.position_y, 1.6),
        positionZ: toNumber(item.position_z, 0),

        rotationX: toNumber(item.rotation_x, 0),
        rotationY: toNumber(item.rotation_y, 0),
        rotationZ: toNumber(item.rotation_z, 0),

        scaleX: toNumber(item.scale_x, 1),
        scaleY: toNumber(item.scale_y, 1),
        scaleZ: toNumber(item.scale_z, 1),

        wallKey: item.wall_key || "",
        sortOrder: item.sort_order || 0,
      };
    })
    .filter(Boolean);

  const plan = devTokenOk
    ? "institution"
    : normalizePlan(profile?.plan);

  const role = devTokenOk ? "admin" : profile?.role || "visitor";

  const editorPermissions = {
    plan,
    role,
    isAdmin: role === "admin",
    isOwner: Boolean(user && gallery.owner_id === user.id),
    isLocalDev: devTokenOk,
    canUseAdvancedMode: canUseAdvancedMode(plan, role),
  };

  return NextResponse.json({
    galleryId: gallery.id,
    slug: gallery.slug,
    title: gallery.title,
    description: gallery.description || "",
    status: gallery.status,
    unitySceneKey,
    mode,
    editorPermissions,
    artworks,
  });
}
