import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    galleryId: string;
  }>;
};

type GalleryStatus = "draft" | "published" | "archived";

type RequestBody = {
  status?: unknown;
};

type AdminProfile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

const validStatuses: GalleryStatus[] = ["draft", "published", "archived"];

function isValidStatus(value: unknown): value is GalleryStatus {
  return (
    typeof value === "string" && validStatuses.includes(value as GalleryStatus)
  );
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
  const { galleryId } = await params;

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

  if (!isValidStatus(body.status)) {
    return NextResponse.json(
      { error: "Stato galleria non valido." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const updatePayload: {
    status: GalleryStatus;
    published_at?: string | null;
  } = {
    status: body.status,
  };

  if (body.status === "published") {
    updatePayload.published_at = new Date().toISOString();
  }

  if (body.status === "draft" || body.status === "archived") {
    updatePayload.published_at = null;
  }

  const { data: updatedGallery, error: updateError } = await admin
    .from("galleries")
    .update(updatePayload)
    .eq("id", galleryId)
    .select(
      "id, title, slug, status, owner_id, published_at, created_at, updated_at"
    )
    .single();

  if (updateError || !updatedGallery) {
    return NextResponse.json(
      {
        error: "Errore aggiornamento galleria.",
        details: updateError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    gallery: updatedGallery,
  });
}