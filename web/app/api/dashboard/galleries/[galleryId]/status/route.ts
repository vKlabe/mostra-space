import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    galleryId: string;
  }>;
};

type GalleryStatus = "draft" | "published" | "archived";

function isValidStatus(value: unknown): value is GalleryStatus {
  return value === "draft" || value === "published" || value === "archived";
}

export async function PATCH(request: Request, context: RouteContext) {
  const { galleryId } = await context.params;

  if (!galleryId) {
    return NextResponse.json(
      { error: "Missing galleryId" },
      { status: 400 }
    );
  }

  let body: { status?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!isValidStatus(body.status)) {
    return NextResponse.json(
      { error: "Invalid gallery status" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select("id, owner_id, status")
    .eq("id", galleryId)
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

  const isAdmin = profile?.role === "admin";
  const isOwner = gallery.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const nextStatus = body.status;

  const updatePayload =
    nextStatus === "published"
      ? {
          status: nextStatus,
          published_at: new Date().toISOString(),
        }
      : {
          status: nextStatus,
          published_at: null,
        };

  const { data: updated, error: updateError } = await supabase
    .from("galleries")
    .update(updatePayload)
    .eq("id", gallery.id)
    .select("id, status, published_at")
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
    gallery: updated,
  });
}