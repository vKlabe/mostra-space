import {
  apiBadRequest,
  apiError,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api/responses";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";

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

const validStatuses: GalleryStatus[] = ["draft", "published", "archived"];

function isValidStatus(value: unknown): value is GalleryStatus {
  return (
    typeof value === "string" && validStatuses.includes(value as GalleryStatus)
  );
}

async function requireCurrentAdmin() {
  const current = await requireAdminApi();

  if (!current.ok) {
    if (current.status === 401) {
      return {
        ok: false,
        current,
        response: apiUnauthorized(current.error),
      };
    }

    return {
      ok: false,
      current,
      response: apiForbidden(current.error),
    };
  }

  return {
    ok: true,
    current,
    response: null,
  };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { galleryId } = await params;

  if (!galleryId) {
    return apiBadRequest("Gallery ID mancante.");
  }

  const permission = await requireCurrentAdmin();

  if (!permission.ok) {
    return permission.response ?? apiForbidden("Accesso admin non autorizzato.");
  }

  const current = permission.current;
  const admin = current?.admin;

  if (!admin) {
    return apiForbidden("Accesso admin non autorizzato.");
  }

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return apiBadRequest("Payload non valido.");
  }

  if (!isValidStatus(body.status)) {
    return apiBadRequest("Stato galleria non valido.", {
      acceptedValues: validStatuses,
      received: body.status,
    });
  }

  const updatePayload: {
    status: GalleryStatus;
    published_at?: string | null;
    updated_at: string;
  } = {
    status: body.status,
    updated_at: new Date().toISOString(),
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
    return apiError("Errore aggiornamento galleria.", {
      status: 500,
      code: "ADMIN_GALLERY_UPDATE_FAILED",
      details: updateError,
    });
  }

  return apiSuccess({
    gallery: updatedGallery,
  });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { galleryId } = await params;

  if (!galleryId) {
    return apiBadRequest("Gallery ID mancante.");
  }

  const permission = await requireCurrentAdmin();

  if (!permission.ok) {
    return permission.response ?? apiForbidden("Accesso admin non autorizzato.");
  }

  const current = permission.current;
  const admin = current?.admin;

  if (!admin) {
    return apiForbidden("Accesso admin non autorizzato.");
  }

  const { data: gallery, error: galleryError } = await admin
    .from("galleries")
    .select("id, title, slug, status, owner_id")
    .eq("id", galleryId)
    .single();

  if (galleryError || !gallery) {
    return apiError("Galleria non trovata.", {
      status: 404,
      code: "ADMIN_GALLERY_NOT_FOUND",
      details: galleryError,
    });
  }

  const { error: showcaseError } = await admin
    .from("public_gallery_slots")
    .update({
      gallery_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("gallery_id", galleryId);

  if (showcaseError) {
    return apiError("Errore rimozione galleria dalla vetrina pubblica.", {
      status: 500,
      code: "ADMIN_GALLERY_SHOWCASE_CLEANUP_FAILED",
      details: showcaseError,
    });
  }

  const { error: galleryArtworksError } = await admin
    .from("gallery_artworks")
    .delete()
    .eq("gallery_id", galleryId);

  if (galleryArtworksError) {
    return apiError("Errore rimozione allestimento galleria.", {
      status: 500,
      code: "ADMIN_GALLERY_ARTWORKS_CLEANUP_FAILED",
      details: galleryArtworksError,
    });
  }

  const { error: inquiriesError } = await admin
    .from("gallery_inquiries")
    .delete()
    .eq("gallery_id", galleryId);

  if (inquiriesError) {
    return apiError("Errore rimozione richieste collegate alla galleria.", {
      status: 500,
      code: "ADMIN_GALLERY_INQUIRIES_CLEANUP_FAILED",
      details: inquiriesError,
    });
  }

  const { error: deleteError } = await admin
    .from("galleries")
    .delete()
    .eq("id", galleryId);

  if (deleteError) {
    return apiError("Errore eliminazione galleria.", {
      status: 500,
      code: "ADMIN_GALLERY_DELETE_FAILED",
      details: deleteError,
    });
  }

  return apiSuccess({
    deletedGalleryId: gallery.id,
    deletedGalleryTitle: gallery.title,
    deletedGallerySlug: gallery.slug,
  });
}