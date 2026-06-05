import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    userId: string;
  }>;
};

type UserRole = "user" | "gallerist" | "admin";
type UserPlan = "free" | "pro" | "business" | "institution";

type RequestBody = {
  role?: unknown;
  plan?: unknown;
};

type AdminProfile = {
  id: string;
  role: UserRole;
  plan: UserPlan;
};

const validRoles: UserRole[] = ["user", "gallerist", "admin"];
const validPlans: UserPlan[] = ["free", "pro", "business", "institution"];

function isValidRole(value: unknown): value is UserRole {
  return typeof value === "string" && validRoles.includes(value as UserRole);
}

function isValidPlan(value: unknown): value is UserPlan {
  return typeof value === "string" && validPlans.includes(value as UserPlan);
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
    .select("id, role, plan")
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
  const { userId } = await params;

  const current = await getCurrentAdminProfile();

  if (!current.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
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

  if (!isValidRole(body.role)) {
    return NextResponse.json(
      { error: "Ruolo non valido." },
      { status: 400 }
    );
  }

  if (!isValidPlan(body.plan)) {
    return NextResponse.json(
      { error: "Piano non valido." },
      { status: 400 }
    );
  }

  if (userId === current.user.id && body.role !== "admin") {
    return NextResponse.json(
      {
        error:
          "Non puoi togliere il ruolo admin al tuo stesso account da questa schermata.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

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
    return NextResponse.json(
      {
        error: "Errore aggiornamento utente.",
        details: updateError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    profile: updatedProfile,
  });
}