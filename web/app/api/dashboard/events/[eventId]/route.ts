import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

type GalleryEvent = {
  id: string;
  owner_id: string;
  gallery_id: string;
  title: string;
  status: "scheduled" | "live" | "completed" | "cancelled";
};

function isAllowedStatus(value: unknown): value is "completed" | "cancelled" {
  return value === "completed" || value === "cancelled";
}

async function requireEventPermission(eventId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
      admin,
      event: null,
      profile: null,
      user: null,
    };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    return {
      ok: false,
      status: 404,
      error: "Profilo non trovato.",
      admin,
      event: null,
      profile: null,
      user,
    };
  }

  const { data: event, error: eventError } = await admin
    .from("gallery_events")
    .select("id, owner_id, gallery_id, title, status")
    .eq("id", eventId)
    .single<GalleryEvent>();

  if (eventError || !event) {
    return {
      ok: false,
      status: 404,
      error: "Evento non trovato.",
      admin,
      event: null,
      profile,
      user,
    };
  }

  const isAdmin = profile.role === "admin";
  const isOwner = event.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return {
      ok: false,
      status: 403,
      error: "Non puoi modificare questo evento.",
      admin,
      event,
      profile,
      user,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    admin,
    event,
    profile,
    user,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { eventId } = await context.params;

  if (!eventId) {
    return NextResponse.json(
      { success: false, error: "Event ID mancante." },
      { status: 400 }
    );
  }

  const permission = await requireEventPermission(eventId);

  if (!permission.ok || !permission.event) {
    return NextResponse.json(
      { success: false, error: permission.error },
      { status: permission.status }
    );
  }

  let body: { status?: unknown };

  try {
    body = (await request.json()) as { status?: unknown };
  } catch {
    return NextResponse.json(
      { success: false, error: "Payload non valido." },
      { status: 400 }
    );
  }

  if (!isAllowedStatus(body.status)) {
    return NextResponse.json(
      { success: false, error: "Stato evento non valido." },
      { status: 400 }
    );
  }

  const nextStatus = body.status;
  const now = new Date().toISOString();

  const { data: updatedEvent, error: updateError } = await permission.admin
    .from("gallery_events")
    .update({
      status: nextStatus,
      completed_at: nextStatus === "completed" ? now : null,
      cancelled_at: nextStatus === "cancelled" ? now : null,
      updated_at: now,
    })
    .eq("id", permission.event.id)
    .select(
      "id, owner_id, gallery_id, title, starts_at, ends_at, status, updated_at"
    )
    .single();

  if (updateError || !updatedEvent) {
    return NextResponse.json(
      {
        success: false,
        error: "Errore aggiornamento evento.",
        details: updateError?.message || null,
      },
      { status: 500 }
    );
  }

  await permission.admin
    .from("gallery_live_events")
    .update({
      is_active: false,
      updated_at: now,
    })
    .eq("gallery_event_id", permission.event.id);

  return NextResponse.json({
    success: true,
    event: updatedEvent,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { eventId } = await context.params;

  if (!eventId) {
    return NextResponse.json(
      { success: false, error: "Event ID mancante." },
      { status: 400 }
    );
  }

  const permission = await requireEventPermission(eventId);

  if (!permission.ok || !permission.event) {
    return NextResponse.json(
      { success: false, error: permission.error },
      { status: permission.status }
    );
  }

  await permission.admin
    .from("gallery_live_events")
    .delete()
    .eq("gallery_event_id", permission.event.id);

  const { error: deleteError } = await permission.admin
    .from("gallery_events")
    .delete()
    .eq("id", permission.event.id);

  if (deleteError) {
    return NextResponse.json(
      {
        success: false,
        error: "Errore eliminazione evento.",
        details: deleteError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    deletedEventId: permission.event.id,
  });
}
