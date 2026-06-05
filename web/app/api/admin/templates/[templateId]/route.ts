import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    templateId: string;
  }>;
};

type RequestBody = {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  unitySceneKey?: unknown;
  isFree?: unknown;
  isActive?: unknown;
  maxArtworks?: unknown;
};

type AdminProfile = {
  id: string;
  role: "user" | "gallerist" | "admin";
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

async function getCurrentAdminProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
      error: "Unauthorized",
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single<AdminProfile>();

  if (error || !profile) {
    return {
      user,
      profile: null,
      error: "Profilo non trovato.",
    };
  }

  if (profile.role !== "admin") {
    return {
      user,
      profile,
      error: "Accesso negato.",
    };
  }

  return {
    user,
    profile,
    error: null,
  };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { templateId } = await params;

  const current = await getCurrentAdminProfile();

  if (!current.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (current.error || !current.profile || current.profile.role !== "admin") {
    return NextResponse.json(
      { error: current.error || "Accesso negato." },
      { status: 403 }
    );
  }

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Payload non valido." },
      { status: 400 }
    );
  }

  const name = cleanText(body.name);
  const slug = cleanText(body.slug);
  const description = cleanNullableText(body.description);
  const unitySceneKey = cleanText(body.unitySceneKey);
  const isFree = body.isFree === true;
  const isActive = body.isActive === true;
  const maxArtworks = Number(body.maxArtworks);

  if (!name) {
    return NextResponse.json(
      { error: "Il nome template e obbligatorio." },
      { status: 400 }
    );
  }

  if (!slug) {
    return NextResponse.json(
      { error: "Lo slug template e obbligatorio." },
      { status: 400 }
    );
  }

  if (!unitySceneKey) {
    return NextResponse.json(
      { error: "La Unity scene key e obbligatoria." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(maxArtworks) || maxArtworks < 1) {
    return NextResponse.json(
      { error: "Il numero massimo opere non e valido." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: updatedTemplate, error: updateError } = await admin
    .from("gallery_templates")
    .update({
      name,
      slug,
      description,
      unity_scene_key: unitySceneKey,
      is_free: isFree,
      is_active: isActive,
      max_artworks: maxArtworks,
    })
    .eq("id", templateId)
    .select(
      "id, name, slug, description, unity_scene_key, is_free, is_active, max_artworks, created_at"
    )
    .single();

  if (updateError || !updatedTemplate) {
    return NextResponse.json(
      {
        error: "Errore aggiornamento template.",
        details: updateError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    template: updatedTemplate,
  });
}