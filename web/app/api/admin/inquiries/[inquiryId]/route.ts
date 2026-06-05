import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

type AdminProfile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

const validStatuses: InquiryStatus[] = ["new", "read", "closed"];

function isValidStatus(value: unknown): value is InquiryStatus {
  return (
    typeof value === "string" && validStatuses.includes(value as InquiryStatus)
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
  const { inquiryId } = await params;

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
      { error: "Stato richiesta non valido." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: updatedInquiry, error: updateError } = await admin
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
    return NextResponse.json(
      {
        error: "Errore aggiornamento richiesta.",
        details: updateError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    inquiry: updatedInquiry,
  });
}