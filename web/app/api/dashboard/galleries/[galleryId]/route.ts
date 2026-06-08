import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canUseTemplateByPlan, normalizePlanName } from "@/lib/plans";

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
  templateId?: unknown;
};

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
  plan: string | null;
};

type GalleryPermissionRecord = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  template_id: string | null;
};

type TemplateRecord = {
  id: string;
  name: string;
  is_active: boolean;
  available_from_plan: string | null;
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
      profile: null,
      gallery: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, plan")
    .eq("id", user.id)
    .single<Profile>();

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select("id, owner_id, title, slug, status, template_id")
    .eq("id", galleryId)
    .single<GalleryPermissionRecord>();

  if (galleryError || !gallery) {
    return {
      ok: false,
      status: 404,
      error: "Gallery not found",
      user,
      profile,
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
      profile,
      gallery,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    user,
    profile,
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

  const supabase = await createClient();

  const permission = await getUserAndGalleryPermission(supabase, galleryId);

  if (!permission.ok || !permission.gallery || !permission.profile) {
    return NextResponse.json(
      { error: permission.error },
      { status: permission.status }
    );
  }

  const updatePayload: Record<string, unknown> = {};

  const wantsDetailsUpdate =
    body.title !== undefined ||
    body.slug !== undefined ||
    body.description !== undefined;

  const wantsCoverUpdate = body.coverImageUrl !== undefined;
  const templateId = cleanText(body.templateId);
  const wantsTemplateUpdate = templateId.length > 0;

  if (!wantsDetailsUpdate && !wantsCoverUpdate && !wantsTemplateUpdate) {
    return NextResponse.json(
      { error: "Nessuna modifica ricevuta." },
      { status: 400 }
    );
  }

  if (wantsDetailsUpdate) {
    const title =
      body.title !== undefined
        ? cleanText(body.title)
        : permission.gallery.title;

    const rawSlug =
      body.slug !== undefined
        ? cleanText(body.slug)
        : permission.gallery.slug;

    const slug = slugify(rawSlug || title);
    const description =
      body.description !== undefined
        ? cleanNullableText(body.description)
        : undefined;

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

    updatePayload.title = title;
    updatePayload.slug = slug;

    if (body.description !== undefined) {
      updatePayload.description = description;
    }
  }

  if (wantsCoverUpdate) {
    updatePayload.cover_image_url = cleanNullableText(body.coverImageUrl);
  }

  if (wantsTemplateUpdate) {
    if (templateId === permission.gallery.template_id) {
      return NextResponse.json(
        { error: "Questo template è già assegnato alla galleria." },
        { status: 400 }
      );
    }

    const { data: template, error: templateError } = await supabase
      .from("gallery_templates")
      .select("id, name, is_active, available_from_plan")
      .eq("id", templateId)
      .single<TemplateRecord>();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template non trovato." },
        { status: 404 }
      );
    }

    if (!template.is_active) {
      return NextResponse.json(
        { error: "Questo template non è attivo." },
        { status: 403 }
      );
    }

    const isAdmin = permission.profile.role === "admin";

    if (!isAdmin) {
      const plan = normalizePlanName(permission.profile.plan);
      const templateCheck = canUseTemplateByPlan(
        plan,
        template.available_from_plan || "free"
      );

      if (!templateCheck.allowed) {
        return NextResponse.json(
          {
            error:
              templateCheck.reason ||
              "Questo template non è disponibile per il tuo piano.",
            upgradeTo: templateCheck.upgradeTo,
          },
          { status: 403 }
        );
      }
    }

    updatePayload.template_id = template.id;
  }

  updatePayload.updated_at = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("galleries")
    .update(updatePayload)
    .eq("id", permission.gallery.id)
    .select(
      "id, title, slug, description, cover_image_url, template_id, status, updated_at"
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