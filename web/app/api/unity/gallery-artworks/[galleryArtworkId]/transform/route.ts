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

  positionX: number;
  positionY: number;
  positionZ: number;

  rotationX: number;
  rotationY: number;
  rotationZ: number;

  scaleX: number;
  scaleY: number;
  scaleZ: number;
};

function toFiniteNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

  const updatePayload = {
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
      sort_order
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
    },
  });
}