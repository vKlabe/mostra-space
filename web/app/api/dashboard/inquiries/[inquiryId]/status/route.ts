import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    inquiryId: string;
  }>;
};

type InquiryStatus = "new" | "read" | "closed";

function isValidStatus(value: unknown): value is InquiryStatus {
  return value === "new" || value === "read" || value === "closed";
}

export async function PATCH(request: Request, context: RouteContext) {
  const { inquiryId } = await context.params;

  if (!inquiryId) {
    return NextResponse.json(
      { error: "Missing inquiryId" },
      { status: 400 }
    );
  }

  let body: { status?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!isValidStatus(body.status)) {
    return NextResponse.json(
      { error: "Status richiesta non valido." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const { data: inquiry, error: inquiryError } = await admin
    .from("gallery_inquiries")
    .select(
      `
      id,
      gallery_id,
      status,
      galleries (
        id,
        owner_id
      )
    `
    )
    .eq("id", inquiryId)
    .single();

  if (inquiryError || !inquiry) {
    return NextResponse.json(
      {
        error: "Richiesta non trovata.",
        details: inquiryError?.message || null,
      },
      { status: 404 }
    );
  }

  const galleryRelation = Array.isArray(inquiry.galleries)
    ? inquiry.galleries[0]
    : inquiry.galleries;

  const isAdmin = profile?.role === "admin";
  const isOwner = galleryRelation?.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const { data: updated, error: updateError } = await admin
    .from("gallery_inquiries")
    .update({
      status: body.status,
    })
    .eq("id", inquiry.id)
    .select("id, status")
    .single();

  if (updateError || !updated) {
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
    inquiry: updated,
  });
}