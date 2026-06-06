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
    inquiryId: string;
  }>;
};

type InquiryStatus = "new" | "read" | "closed";

type RequestBody = {
  status?: unknown;
};

const validStatuses: InquiryStatus[] = ["new", "read", "closed"];

function isValidStatus(value: unknown): value is InquiryStatus {
  return (
    typeof value === "string" && validStatuses.includes(value as InquiryStatus)
  );
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { inquiryId } = await params;

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
    return apiBadRequest("Stato richiesta non valido.", {
      acceptedValues: validStatuses,
      received: body.status,
    });
  }

  const { data: updatedInquiry, error: updateError } = await current.admin
    .from("gallery_inquiries")
    .update({
      status: body.status,
    })
    .eq("id", inquiryId)
    .select(
      "id, gallery_id, artwork_id, name, email, message, status, created_at"
    )
    .single();

  if (updateError || !updatedInquiry) {
    return apiError("Errore aggiornamento richiesta.", {
      status: 500,
      code: "ADMIN_INQUIRY_UPDATE_FAILED",
      details: updateError,
    });
  }

  return apiSuccess({
    inquiry: updatedInquiry,
  });
}