import {
  apiBadRequest,
  apiError,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api/responses";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET_NAME = "gallery-covers";
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

type RouteParams = {
  params: Promise<{
    templateId: string;
  }>;
};

type TemplateRecord = {
  id: string;
  preview_image_url: string | null;
};

function getExtensionFromMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return null;
}

function getStoragePathFromPublicUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const encodedPath = url.pathname.slice(markerIndex + marker.length);

    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const { templateId } = await params;
  const current = await requireAdminApi();

  if (!current.ok) {
    if (current.status === 401) {
      return apiUnauthorized(current.error);
    }

    return apiForbidden(current.error);
  }

  const { data: template, error: templateError } = await current.admin
    .from("gallery_templates")
    .select("id, preview_image_url")
    .eq("id", templateId)
    .maybeSingle<TemplateRecord>();

  if (templateError) {
    return apiError("Errore controllo template.", {
      status: 500,
      code: "ADMIN_TEMPLATE_PREVIEW_LOOKUP_FAILED",
      details: templateError,
    });
  }

  if (!template) {
    return apiNotFound("Template non trovato.");
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return apiBadRequest("Form upload non valido.");
  }

  const fileValue = formData.get("preview_file");

  if (!(fileValue instanceof File)) {
    return apiBadRequest("Seleziona un file immagine.");
  }

  if (fileValue.size <= 0) {
    return apiBadRequest("Il file immagine Ã¨ vuoto.");
  }

  if (fileValue.size > MAX_FILE_SIZE_BYTES) {
    return apiBadRequest("La preview non puÃ² superare 2 MB.", {
      receivedBytes: fileValue.size,
      maxBytes: MAX_FILE_SIZE_BYTES,
    });
  }

  const extension = getExtensionFromMimeType(fileValue.type);

  if (!extension) {
    return apiBadRequest(
      "Formato non supportato. Usa JPG, PNG oppure WEBP."
    );
  }

  const storagePath = `template-previews/${templateId}/${crypto.randomUUID()}.${extension}`;
  const fileBuffer = Buffer.from(await fileValue.arrayBuffer());

  const { error: uploadError } = await current.admin.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: fileValue.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return apiError("Errore upload preview template.", {
      status: 500,
      code: "ADMIN_TEMPLATE_PREVIEW_UPLOAD_FAILED",
      details: uploadError,
    });
  }

  const { data: publicUrlData } = current.admin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  const previewImageUrl = publicUrlData.publicUrl;

  const { data: updatedTemplate, error: updateError } = await current.admin
    .from("gallery_templates")
    .update({
      preview_image_url: previewImageUrl,
    })
    .eq("id", templateId)
    .select("id, preview_image_url")
    .single<TemplateRecord>();

  if (updateError || !updatedTemplate) {
    await current.admin.storage.from(BUCKET_NAME).remove([storagePath]);

    return apiError("Errore salvataggio preview nel template.", {
      status: 500,
      code: "ADMIN_TEMPLATE_PREVIEW_UPDATE_FAILED",
      details: updateError,
    });
  }

  const previousStoragePath = getStoragePathFromPublicUrl(
    template.preview_image_url
  );

  if (previousStoragePath && previousStoragePath !== storagePath) {
    await current.admin.storage
      .from(BUCKET_NAME)
      .remove([previousStoragePath]);
  }

  return apiSuccess({
    template: updatedTemplate,
    previewImageUrl,
  });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { templateId } = await params;
  const current = await requireAdminApi();

  if (!current.ok) {
    if (current.status === 401) {
      return apiUnauthorized(current.error);
    }

    return apiForbidden(current.error);
  }

  const { data: template, error: templateError } = await current.admin
    .from("gallery_templates")
    .select("id, preview_image_url")
    .eq("id", templateId)
    .maybeSingle<TemplateRecord>();

  if (templateError) {
    return apiError("Errore controllo template.", {
      status: 500,
      code: "ADMIN_TEMPLATE_PREVIEW_LOOKUP_FAILED",
      details: templateError,
    });
  }

  if (!template) {
    return apiNotFound("Template non trovato.");
  }

  const { data: updatedTemplate, error: updateError } = await current.admin
    .from("gallery_templates")
    .update({
      preview_image_url: null,
    })
    .eq("id", templateId)
    .select("id, preview_image_url")
    .single<TemplateRecord>();

  if (updateError || !updatedTemplate) {
    return apiError("Errore rimozione preview dal template.", {
      status: 500,
      code: "ADMIN_TEMPLATE_PREVIEW_DELETE_FAILED",
      details: updateError,
    });
  }

  const previousStoragePath = getStoragePathFromPublicUrl(
    template.preview_image_url
  );

  let cleanupWarning: string | null = null;

  if (previousStoragePath) {
    const { error: removeError } = await current.admin.storage
      .from(BUCKET_NAME)
      .remove([previousStoragePath]);

    if (removeError) {
      cleanupWarning = removeError.message;
    }
  }

  return apiSuccess({
    template: updatedTemplate,
    cleanupWarning,
  });
}


