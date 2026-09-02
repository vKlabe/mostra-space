import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createGalleryPublishedNotifications } from "@/lib/notifications/socialNotifications";
import { validateGalleryForPublish } from "@/lib/gallery/validateGalleryForPublish";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    galleryId: string;
  }>;
};

type GalleryStatus = "draft" | "published" | "archived";

type GalleryRecord = {
  id: string;
  owner_id: string;
  title: string | null;
  slug: string | null;
  status: GalleryStatus;
  cover_image_url: string | null;
};

type ArtworkForPublish = {
  id: string;
  title: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  width_cm: number | string | null;
  height_cm: number | string | null;
};

type GalleryArtworkForPublish = {
  id: string;
  gallery_id: string;
  artwork_id: string;
  wall_key: string | null;
  display_width_cm: number | string | null;
  display_height_cm: number | string | null;
  frame_width_cm: number | string | null;
  frame_depth_cm: number | string | null;
  artworks: ArtworkForPublish | ArtworkForPublish[] | null;
};

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
    .select("id, owner_id, title, slug, status, cover_image_url")
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

  const isAdmin = profile?.role === "admin";
  const isOwner = gallery.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const nextStatus = body.status;

  let validation = null;

  if (nextStatus === "published") {
    const { data: galleryArtworks, error: galleryArtworksError } =
      await supabase
        .from("gallery_artworks")
        .select(
          `
          id,
          gallery_id,
          artwork_id,
          wall_key,
          display_width_cm,
          display_height_cm,
          frame_width_cm,
          frame_depth_cm,
          artworks (
            id,
            title,
            image_url,
            thumbnail_url,
            width_cm,
            height_cm
          )
        `
        )
        .eq("gallery_id", gallery.id);

    if (galleryArtworksError) {
      return NextResponse.json(
        {
          error: "Errore validazione galleria.",
          details: galleryArtworksError.message,
        },
        { status: 500 }
      );
    }

    validation = validateGalleryForPublish({
      gallery,
      galleryArtworks:
        ((galleryArtworks || []) as unknown as GalleryArtworkForPublish[]),
    });

    if (!validation.canPublish) {
      return NextResponse.json(
        {
          error: "Non puoi pubblicare ancora questa galleria.",
          message:
            "La galleria non è pronta per la pubblicazione. Correggi gli errori indicati e riprova.",
          validation,
        },
        { status: 400 }
      );
    }
  }

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

  if (nextStatus === "published" && gallery.status !== "published") {
    try {
      const admin = createAdminClient();
      await createGalleryPublishedNotifications({
        admin,
        ownerId: gallery.owner_id,
        galleryId: gallery.id,
        galleryTitle: gallery.title,
        gallerySlug: gallery.slug,
      });
    } catch (notificationError) {
      // Publication must never fail because a social notification could not be created.
      console.error(
        "Gallery published but follower notifications failed",
        notificationError
      );
    }
  }

  return NextResponse.json({
    success: true,
    gallery: updated,
    validation,
  });
}