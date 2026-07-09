import {
  apiBadRequest,
  apiError,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api/responses";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { deleteUserAccount } from "@/lib/account/deleteAccount";
import type { PlanName } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    userId: string;
  }>;
};

type UserRole = "user" | "gallerist" | "admin";
type UserPlan = PlanName;

type RequestBody = {
  role?: unknown;
  plan?: unknown;
};

const validRoles: UserRole[] = ["user", "gallerist", "admin"];
const validPlans: UserPlan[] = [
  "free",
  "pro",
  "business",
  "diamond",
  "institution",
];

function isValidRole(value: unknown): value is UserRole {
  return typeof value === "string" && validRoles.includes(value as UserRole);
}

function isValidPlan(value: unknown): value is UserPlan {
  return typeof value === "string" && validPlans.includes(value as UserPlan);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { userId } = await params;

  const current = await requireAdminApi();

  if (!current.ok) {
    if (current.status === 401) {
      return apiUnauthorized(current.error);
    }

    return apiForbidden(current.error);
  }

  const admin = current.admin;

  if (!admin) {
    return apiForbidden("Accesso admin non autorizzato.");
  }

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return apiBadRequest("Payload non valido.");
  }

  if (!isValidRole(body.role)) {
    return apiBadRequest("Ruolo non valido.", {
      acceptedValues: validRoles,
      received: body.role,
    });
  }

  if (!isValidPlan(body.plan)) {
    return apiBadRequest("Piano non valido.", {
      acceptedValues: validPlans,
      received: body.plan,
    });
  }

  if (userId === current.user.id && body.role !== "admin") {
    return apiBadRequest(
      "Non puoi togliere il ruolo admin al tuo stesso account da questa schermata."
    );
  }

  const { data: updatedProfile, error: updateError } = await admin
    .from("profiles")
    .update({
      role: body.role,
      plan: body.plan,
    })
    .eq("id", userId)
    .select("id, email, display_name, full_name, role, plan")
    .single();

  if (updateError || !updatedProfile) {
    return apiError("Errore aggiornamento utente.", {
      status: 500,
      code: "ADMIN_USER_UPDATE_FAILED",
      details: updateError,
    });
  }

  return apiSuccess({
    profile: updatedProfile,
  });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { userId } = await params;

  if (!userId) {
    return apiBadRequest("User ID mancante.");
  }

  const current = await requireAdminApi();

  if (!current.ok) {
    if (current.status === 401) {
      return apiUnauthorized(current.error);
    }

    return apiForbidden(current.error);
  }

  const admin = current.admin;

  if (!admin) {
    return apiForbidden("Accesso admin non autorizzato.");
  }

  if (userId === current.user.id) {
    return apiBadRequest(
      "Non puoi cancellare il tuo stesso account dalla control room admin. Usa la pagina Account oppure un altro admin."
    );
  }

  const { data: targetProfile, error: targetError } = await admin
    .from("profiles")
    .select("id, email, display_name, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (targetError) {
    return apiError("Errore lettura utente da eliminare.", {
      status: 500,
      code: "ADMIN_USER_DELETE_LOOKUP_FAILED",
      details: targetError,
    });
  }

  if (!targetProfile) {
    return apiError("Utente non trovato.", {
      status: 404,
      code: "ADMIN_USER_NOT_FOUND",
    });
  }

  try {
    const result = await deleteUserAccount({
      admin,
      userId,
      deleteAuthUser: true,
    });

    return apiSuccess({
      deletedUserId: userId,
      deletedProfile: targetProfile,
      cleanup: {
        galleries: result.galleryIds.length,
        artworks: result.artworkIds.length,
        events: result.eventIds.length,
        steps: result.steps,
      },
    });
  } catch (error) {
    return apiError("Errore eliminazione account.", {
      status: 500,
      code: "ADMIN_USER_DELETE_FAILED",
      details: error instanceof Error ? error.message : error,
    });
  }
}