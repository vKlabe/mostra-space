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

export async function PATCH(request: Request, { params }: RouteParams) {
  const { galleryId } = await params;

  const current = await requireAdminApi();

  if (!current.ok) {
    if (current.status === 401) {
      return apiUnauthorized(current.error);
    }

    return apiForbidden(current.error);
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
  } = {
    status: body.status,
  };

  if (body.status === "published") {
    updatePayload.published_at = new Date().toISOString();
  }

  if (body.status === "draft" || body.status === "archived") {
    updatePayload.published_at = null;
  }

  const { data: updatedGallery, error: updateError } = await current.admin
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