import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    galleryArtworkId: string;
  }>;
};

type TransformPayload = {
  galleryArtworkId?: string;
  artworkId?: string;

  positionX?: unknown;
  positionY?: unknown;
  positionZ?: unknown;

  rotationX?: unknown;
  rotationY?: unknown;
  rotationZ?: unknown;

  scaleX?: unknown;
  scaleY?: unknown;
  scaleZ?: unknown;

  wallKey?: unknown;

  displayWidthCm?: unknown;
  displayHeightCm?: unknown;

  frameEnabled?: unknown;
  frameColor?: unknown;
  frameWidthCm?: unknown;
  frameDepthCm?: unknown;
};

function toFiniteNumber(value: unknown, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPositiveNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(
    typeof value === "string" ? value.replace(",", ".").trim() : value
  );

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function toNonNegativeNumber(value: unknown, fallback: number) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(
    typeof value === "string" ? value.replace(",", ".").trim() : value
  );

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.round(parsed * 100) / 100;
}

function cleanWallKey(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function cleanHexColor(value: unknown) {
  if (typeof value !== "string") {
    return "#000000";
  }

  const cleaned = value.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) {
    return cleaned;
  }

  return "#000000";
}

function cleanBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === "1" || value === 1) {
    return true;
  }

  if (value === "false" || value === "0" || value === 0) {
    return false;
  }

  return fallback;
}

function isDevTokenValid(request: Request) {
  const expectedToken = process.env.ARTPORTAL_UNITY_DEV_TOKEN;
  const receivedToken = request.headers.get("x-artportal-dev-token");

  if (!expectedToken || !receivedToken) {
    return false;
  }

  // In produzione non accettiamo il dev token.
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return receivedToken === expectedToken;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { galleryArtworkId } = await context.params;

  if (!galleryArtworkId) {
    return NextResponse.json(
      { error: "Missing galleryArtworkId" },
      { status: 400 }
    );
  }

  let body: TransformPayload;

  try {
    body = (await request.json()) as TransformPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (body.galleryArtworkId && body.galleryArtworkId !== galleryArtworkId) {
    return NextResponse.json(
      {
        error: "galleryArtworkId mismatch",
        routeGalleryArtworkId: galleryArtworkId,
        bodyGalleryArtworkId: body.galleryArtworkId,
      },
      { status: 400 }
    );
  }

  const devTokenOk = isDevTokenValid(request);

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !devTokenOk) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        details:
          "No authenticated user and no valid local Unity dev token provided.",
      },
      { status: 401 }
    );
  }

  const { data: galleryArtwork, error: galleryArtworkError } = await admin
    .from("gallery_artworks")
    .select("id, gallery_id, artwork_id")
    .eq("id", galleryArtworkId)
    .single();

  if (galleryArtworkError || !galleryArtwork) {
    return NextResponse.json(
      {
        error: "Gallery artwork not found",
        details: galleryArtworkError?.message || null,
      },
      { status: 404 }
    );
  }

  const { data: gallery, error: galleryError } = await admin
    .from("galleries")
    .select("id, owner_id, title")
    .eq("id", galleryArtwork.gallery_id)
    .single();

  if (galleryError || !gallery) {
    return NextResponse.json(
      {
        error: "Gallery not found",
        details: galleryError?.message || null,
      },
      { status: 404 }
    );
  }

  let isAllowed = devTokenOk;

  if (!isAllowed && user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    const isOwner = gallery.owner_id === user.id;
    const isAdmin = profile?.role === "admin";

    isAllowed = isOwner || isAdmin;
  }

  if (!isAllowed) {
    return NextResponse.json(
      {
        error: "Forbidden",
        details:
          "You are not allowed to update transforms for this gallery artwork.",
      },
      { status: 403 }
    );
  }

  const updatePayload: {
    position_x: number;
    position_y: number;
    position_z: number;

    rotation_x: number;
    rotation_y: number;
    rotation_z: number;

    scale_x: number;
    scale_y: number;
    scale_z: number;

    wall_key?: string | null;

    display_width_cm?: number | null;
    display_height_cm?: number | null;

    frame_enabled?: boolean;
    frame_color?: string;
    frame_width_cm?: number;
    frame_depth_cm?: number;
  } = {
    position_x: toFiniteNumber(body.positionX, 0),
    position_y: toFiniteNumber(body.positionY, 1.8),
    position_z: toFiniteNumber(body.positionZ, 3.85),

    rotation_x: toFiniteNumber(body.rotationX, 0),
    rotation_y: toFiniteNumber(body.rotationY, 180),
    rotation_z: toFiniteNumber(body.rotationZ, 0),

    scale_x: toFiniteNumber(body.scaleX, 1),
    scale_y: toFiniteNumber(body.scaleY, 1),
    scale_z: toFiniteNumber(body.scaleZ, 1),
  };

  if ("wallKey" in body) {
    updatePayload.wall_key = cleanWallKey(body.wallKey);
  }

  if ("displayWidthCm" in body) {
    updatePayload.display_width_cm = toPositiveNumberOrNull(
      body.displayWidthCm
    );
  }

  if ("displayHeightCm" in body) {
    updatePayload.display_height_cm = toPositiveNumberOrNull(
      body.displayHeightCm
    );
  }

  if ("frameEnabled" in body) {
    updatePayload.frame_enabled = cleanBoolean(body.frameEnabled, false);
  }

  if ("frameColor" in body) {
    updatePayload.frame_color = cleanHexColor(body.frameColor);
  }

  if ("frameWidthCm" in body) {
    updatePayload.frame_width_cm = toNonNegativeNumber(body.frameWidthCm, 0);
  }

  if ("frameDepthCm" in body) {
    updatePayload.frame_depth_cm = toNonNegativeNumber(body.frameDepthCm, 2);
  }

  const { data: updated, error: updateError } = await admin
    .from("gallery_artworks")
    .update(updatePayload)
    .eq("id", galleryArtwork.id)
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
      frame_depth_cm
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
    galleryArtworkId: updated.id,
    galleryId: updated.gallery_id,
    artworkId: updated.artwork_id,

    transform: {
      positionX: Number(updated.position_x),
      positionY: Number(updated.position_y),
      positionZ: Number(updated.position_z),

      rotationX: Number(updated.rotation_x),
      rotationY: Number(updated.rotation_y),
      rotationZ: Number(updated.rotation_z),

      scaleX: Number(updated.scale_x),
      scaleY: Number(updated.scale_y),
      scaleZ: Number(updated.scale_z),

      wallKey: updated.wall_key || "",
    },

    display: {
      displayWidthCm:
        updated.display_width_cm === null ||
        updated.display_width_cm === undefined
          ? null
          : Number(updated.display_width_cm),
      displayHeightCm:
        updated.display_height_cm === null ||
        updated.display_height_cm === undefined
          ? null
          : Number(updated.display_height_cm),
    },

    frame: {
      frameEnabled: updated.frame_enabled === true,
      frameColor: updated.frame_color || "#000000",
      frameWidthCm:
        updated.frame_width_cm === null || updated.frame_width_cm === undefined
          ? 0
          : Number(updated.frame_width_cm),
      frameDepthCm:
        updated.frame_depth_cm === null || updated.frame_depth_cm === undefined
          ? 2
          : Number(updated.frame_depth_cm),
    },
  });
}