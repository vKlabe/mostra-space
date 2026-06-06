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

export async function PATCH(request: Request, { params }: RouteParams) {
  const { templateId } = await params;

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

  const name = cleanText(body.name);
  const slug = cleanText(body.slug);
  const description = cleanNullableText(body.description);
  const unitySceneKey = cleanText(body.unitySceneKey);
  const isFree = body.isFree === true;
  const isActive = body.isActive === true;
  const maxArtworks = Number(body.maxArtworks);

  if (!name) {
    return apiBadRequest("Il nome template e obbligatorio.");
  }

  if (!slug) {
    return apiBadRequest("Lo slug template e obbligatorio.");
  }

  if (!unitySceneKey) {
    return apiBadRequest("La Unity scene key e obbligatoria.");
  }

  if (!Number.isFinite(maxArtworks) || maxArtworks < 1) {
    return apiBadRequest("Il numero massimo opere non e valido.", {
      received: body.maxArtworks,
    });
  }

  const { data: updatedTemplate, error: updateError } = await current.admin
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
    return apiError("Errore aggiornamento template.", {
      status: 500,
      code: "ADMIN_TEMPLATE_UPDATE_FAILED",
      details: updateError,
    });
  }

  return apiSuccess({
    template: updatedTemplate,
  });
}