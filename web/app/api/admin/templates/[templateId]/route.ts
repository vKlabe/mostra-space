import {
  apiBadRequest,
  apiError,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api/responses";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import type { PlanName } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TemplatePlan = PlanName;

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
  availableFromPlan?: unknown;
  isFree?: unknown;
  isActive?: unknown;
  maxArtworks?: unknown;
  previewImageUrl?: unknown;
  isFeatured?: unknown;
  sortOrder?: unknown;
};

const validTemplatePlans: TemplatePlan[] = [
  "free",
  "pro",
  "business",
  "diamond",
  "institution",
];

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

function isValidTemplatePlan(value: unknown): value is TemplatePlan {
  return (
    typeof value === "string" &&
    validTemplatePlans.includes(value as TemplatePlan)
  );
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
  const previewImageUrl = cleanNullableText(body.previewImageUrl);
  const isActive = body.isActive === true;
  const isFeatured = body.isFeatured === true;
  const maxArtworks = Number(body.maxArtworks);
  const sortOrder = Number(body.sortOrder ?? 100);

  const availableFromPlan: TemplatePlan = isValidTemplatePlan(
    body.availableFromPlan
  )
    ? body.availableFromPlan
    : body.isFree === true
      ? "free"
      : "pro";

  const isFree = availableFromPlan === "free";

  if (!name) {
    return apiBadRequest("Il nome template è obbligatorio.");
  }

  if (!slug) {
    return apiBadRequest("Lo slug template è obbligatorio.");
  }

  if (!unitySceneKey) {
    return apiBadRequest("La Unity scene key è obbligatoria.");
  }

  if (!Number.isFinite(maxArtworks) || maxArtworks < 1) {
    return apiBadRequest("Il numero massimo opere non è valido.", {
      received: body.maxArtworks,
    });
  }

  if (!Number.isFinite(sortOrder) || sortOrder < 0) {
    return apiBadRequest("L’ordine di visualizzazione non è valido.", {
      received: body.sortOrder,
    });
  }

  const { data: updatedTemplate, error: updateError } = await current.admin
    .from("gallery_templates")
    .update({
      name,
      slug,
      description,
      unity_scene_key: unitySceneKey,
      available_from_plan: availableFromPlan,
      is_free: isFree,
      is_active: isActive,
      max_artworks: maxArtworks,
      preview_image_url: previewImageUrl,
      is_featured: isFeatured,
      sort_order: sortOrder,
    })
    .eq("id", templateId)
    .select(
      "id, name, slug, description, unity_scene_key, available_from_plan, is_free, is_active, max_artworks, preview_image_url, is_featured, sort_order, created_at"
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