import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    inquiryId: string;
  }>;
};

type GalleryRelation = {
  id: string;
  owner_id: string;
};

type InquiryRecord = {
  id: string;
  gallery_id: string;
  galleries: GalleryRelation | GalleryRelation[] | null;
};

function normalizeGalleryRelation(
  value: GalleryRelation | GalleryRelation[] | null
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { inquiryId } = await context.params;

  if (!inquiryId) {
    return NextResponse.json(
      { error: "Missing inquiryId" },
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
      galleries (
        id,
        owner_id
      )
    `
    )
    .eq("id", inquiryId)
    .single<InquiryRecord>();

  if (inquiryError || !inquiry) {
    return NextResponse.json(
      {
        error: "Richiesta non trovata.",
        details: inquiryError?.message || null,
      },
      { status: 404 }
    );
  }

  const gallery = normalizeGalleryRelation(inquiry.galleries);

  const isAdmin = profile?.role === "admin";
  const isOwner = gallery?.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const { error: deleteError } = await admin
    .from("gallery_inquiries")
    .delete()
    .eq("id", inquiry.id);

  if (deleteError) {
    return NextResponse.json(
      {
        error: "Errore eliminazione richiesta.",
        details: deleteError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    deletedInquiryId: inquiry.id,
  });
}