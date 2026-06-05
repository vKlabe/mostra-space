import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    galleryId: string;
  }>;
};

type UpdateGalleryPayload = {
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  coverImageUrl?: unknown;
};

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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getUserAndGalleryPermission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  galleryId: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
      user: null,
      gallery: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select("id, owner_id, title, slug, status")
    .eq("id", galleryId)
    .single();

  if (galleryError || !gallery) {
    return {
      ok: false,
      status: 404,
      error: "Gallery not found",
      user,
      gallery: null,
    };
  }

  const isAdmin = profile?.role === "admin";
  const isOwner = gallery.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
      user,
      gallery,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    user,
    gallery,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { galleryId } = await context.params;

  if (!galleryId) {
    return NextResponse.json(
      { error: "Missing galleryId" },
      { status: 400 }
    );
  }

  let body: UpdateGalleryPayload;

  try {
    body = (await request.json()) as UpdateGalleryPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const title = cleanText(body.title);
  const rawSlug = cleanText(body.slug);
  const slug = slugify(rawSlug || title);
  const description = cleanNullableText(body.description);
  const coverImageUrl = cleanNullableText(body.coverImageUrl);

  if (!title) {
    return NextResponse.json(
      { error: "Il titolo e obbligatorio." },
      { status: 400 }
    );
  }

  if (!slug) {
    return NextResponse.json(
      { error: "Lo slug pubblico e obbligatorio." },
      { status: 400 }
    );
  }

  if (slug.length < 3) {
    return NextResponse.json(
      { error: "Lo slug deve contenere almeno 3 caratteri." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const permission = await getUserAndGalleryPermission(supabase, galleryId);

  if (!permission.ok || !permission.gallery) {
    return NextResponse.json(
      { error: permission.error },
      { status: permission.status }
    );
  }

  const { data: existingSlugOwner, error: existingSlugError } = await supabase
    .from("galleries")
    .select("id")
    .eq("slug", slug)
    .neq("id", permission.gallery.id)
    .maybeSingle();

  if (existingSlugError) {
    return NextResponse.json(
      {
        error: "Errore controllo slug.",
        details: existingSlugError.message,
      },
      { status: 500 }
    );
  }

  if (existingSlugOwner) {
    return NextResponse.json(
      { error: "Questo slug e gia usato da un altra galleria." },
      { status: 409 }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("galleries")
    .update({
      title,
      slug,
      description,
      cover_image_url: coverImageUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", permission.gallery.id)
    .select(
      "id, title, slug, description, cover_image_url, status, updated_at"
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
    gallery: updated,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { galleryId } = await context.params;

  if (!galleryId) {
    return NextResponse.json(
      { error: "Missing galleryId" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const permission = await getUserAndGalleryPermission(supabase, galleryId);

  if (!permission.ok || !permission.gallery) {
    return NextResponse.json(
      { error: permission.error },
      { status: permission.status }
    );
  }

  if (permission.gallery.status === "published") {
    return NextResponse.json(
      {
        error:
          "Non puoi eliminare una galleria pubblicata. Riportala prima in bozza oppure archiviala.",
      },
      { status: 409 }
    );
  }

  const { error: deleteLinksError } = await supabase
    .from("gallery_artworks")
    .delete()
    .eq("gallery_id", permission.gallery.id);

  if (deleteLinksError) {
    return NextResponse.json(
      {
        error: "Errore eliminazione allestimento galleria.",
        details: deleteLinksError.message,
      },
      { status: 500 }
    );
  }

  const { error: deleteGalleryError } = await supabase
    .from("galleries")
    .delete()
    .eq("id", permission.gallery.id);

  if (deleteGalleryError) {
    return NextResponse.json(
      {
        error: "Errore eliminazione galleria.",
        details: deleteGalleryError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    deletedGalleryId: permission.gallery.id,
  });
}