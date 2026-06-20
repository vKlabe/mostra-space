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

type TemplatePlan = "free" | "pro" | "business" | "institution";

type RequestBody = {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  unitySceneKey?: unknown;
  availableFromPlan?: unknown;
  isActive?: unknown;
  isFeatured?: unknown;
  maxArtworks?: unknown;
  sortOrder?: unknown;
  previewImageUrl?: unknown;
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
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidTemplatePlan(value: unknown): value is TemplatePlan {
  return (
    value === "free" ||
    value === "pro" ||
    value === "business" ||
    value === "institution"
  );
}

export async function POST(request: Request) {
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
  const rawSlug = cleanText(body.slug);
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
    : "free";

  const slug = slugify(rawSlug || name);
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

  const { data: existingTemplate, error: existingTemplateError } =
    await current.admin
      .from("gallery_templates")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

  if (existingTemplateError) {
    return apiError("Errore controllo slug template.", {
      status: 500,
      code: "ADMIN_TEMPLATE_SLUG_CHECK_FAILED",
      details: existingTemplateError,
    });
  }

  if (existingTemplate) {
    return apiBadRequest(
      "Esiste già un template con questo slug. Scegli uno slug diverso."
    );
  }

  const { data: template, error: insertError } = await current.admin
    .from("gallery_templates")
    .insert({
      name,
      slug,
      description,
      unity_scene_key: unitySceneKey,
      available_from_plan: availableFromPlan,
      is_free: isFree,
      is_active: isActive,
      is_featured: isFeatured,
      max_artworks: maxArtworks,
      sort_order: sortOrder,
      preview_image_url: previewImageUrl,
    })
    .select(
      "id, name, slug, description, unity_scene_key, available_from_plan, is_free, is_active, is_featured, max_artworks, sort_order, preview_image_url, created_at"
    )
    .single();

  if (insertError || !template) {
    return apiError("Errore creazione template.", {
      status: 500,
      code: "ADMIN_TEMPLATE_CREATE_FAILED",
      details: insertError,
    });
  }

  return apiSuccess(
    {
      template,
    },
    201
  );
}
