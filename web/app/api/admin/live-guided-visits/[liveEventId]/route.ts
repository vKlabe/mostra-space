import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    liveEventId: string;
  }>;
};

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

type LiveGuidedVisit = {
  id: string;
  gallery_event_id: string | null;
  title: string;
};

type UpdateLiveGuidedVisitBody = {
  action?: unknown;
  accessMode?: unknown;
  voiceMode?: unknown;
  maxParticipants?: unknown;
};

type AccessMode = "public" | "password" | "invite_only" | "private_link";
type VoiceMode = "owner_only" | "everyone" | "request_to_speak";

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanMaxParticipants(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 50;
  }

  if (numberValue < 1) {
    return 1;
  }

  if (numberValue > 500) {
    return 500;
  }

  return Math.round(numberValue);
}

function normalizeAccessMode(value: unknown): AccessMode | null {
  if (
    value === "public" ||
    value === "password" ||
    value === "invite_only" ||
    value === "private_link"
  ) {
    return value;
  }

  return null;
}

function normalizeVoiceMode(value: unknown): VoiceMode | null {
  if (
    value === "owner_only" ||
    value === "everyone" ||
    value === "request_to_speak"
  ) {
    return value;
  }

  return null;
}

async function requireAdminUser() {
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
      user: null,
      profile: null,
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
      error: "Profilo admin non trovato.",
      admin,
      user,
      profile: null,
    };
  }

  if (profile.role !== "admin") {
    return {
      ok: false,
      status: 403,
      error: "Solo admin può gestire le Live guided visits.",
      admin,
      user,
      profile,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    admin,
    user,
    profile,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { liveEventId } = await context.params;

  if (!liveEventId) {
    return NextResponse.json(
      { success: false, error: "Live event ID mancante." },
      { status: 400 }
    );
  }

  const current = await requireAdminUser();

  if (!current.ok) {
    return NextResponse.json(
      { success: false, error: current.error },
      { status: current.status }
    );
  }

  let body: UpdateLiveGuidedVisitBody;

  try {
    body = (await request.json()) as UpdateLiveGuidedVisitBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Payload non valido." },
      { status: 400 }
    );
  }

  const action = cleanText(body.action);

  const { data: liveEvent, error: liveEventError } = await current.admin
    .from("gallery_live_events")
    .select("id, gallery_event_id, title")
    .eq("id", liveEventId)
    .single<LiveGuidedVisit>();

  if (liveEventError || !liveEvent) {
    return NextResponse.json(
      {
        success: false,
        error: "Live guided visit non trovata.",
        details: liveEventError?.message || null,
      },
      { status: 404 }
    );
  }

  if (action === "activate" || action === "deactivate") {
    const { data: updatedLiveEvent, error: updateError } = await current.admin
      .from("gallery_live_events")
      .update({
        is_active: action === "activate",
        updated_at: new Date().toISOString(),
      })
      .eq("id", liveEvent.id)
      .select("id, is_active, updated_at")
      .single();

    if (updateError || !updatedLiveEvent) {
      return NextResponse.json(
        {
          success: false,
          error: "Errore aggiornamento stato live.",
          details: updateError?.message || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      liveEvent: updatedLiveEvent,
    });
  }

  if (action === "update-controls") {
    const accessMode = normalizeAccessMode(body.accessMode);
    const voiceMode = normalizeVoiceMode(body.voiceMode);

    if (!accessMode) {
      return NextResponse.json(
        { success: false, error: "Modalità accesso non valida." },
        { status: 400 }
      );
    }

    if (!voiceMode) {
      return NextResponse.json(
        { success: false, error: "Modalità voce non valida." },
        { status: 400 }
      );
    }

    const { data: updatedLiveEvent, error: updateError } = await current.admin
      .from("gallery_live_events")
      .update({
        access_mode: accessMode,
        voice_mode: voiceMode,
        max_participants: cleanMaxParticipants(body.maxParticipants),
        updated_at: new Date().toISOString(),
      })
      .eq("id", liveEvent.id)
      .select(
        "id, access_mode, voice_mode, max_participants, updated_at"
      )
      .single();

    if (updateError || !updatedLiveEvent) {
      return NextResponse.json(
        {
          success: false,
          error: "Errore aggiornamento controlli live.",
          details: updateError?.message || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      liveEvent: updatedLiveEvent,
    });
  }

  if (action === "complete-linked-event" || action === "cancel-linked-event") {
    if (!liveEvent.gallery_event_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Questa Live guided visit non ha un evento calendario collegato.",
        },
        { status: 409 }
      );
    }

    const nextStatus =
      action === "complete-linked-event" ? "completed" : "cancelled";

    const now = new Date().toISOString();

    const { data: updatedEvent, error: updateEventError } = await current.admin
      .from("gallery_events")
      .update({
        status: nextStatus,
        completed_at: nextStatus === "completed" ? now : null,
        cancelled_at: nextStatus === "cancelled" ? now : null,
        updated_at: now,
      })
      .eq("id", liveEvent.gallery_event_id)
      .select("id, status, updated_at")
      .single();

    if (updateEventError || !updatedEvent) {
      return NextResponse.json(
        {
          success: false,
          error: "Errore aggiornamento evento calendario collegato.",
          details: updateEventError?.message || null,
        },
        { status: 500 }
      );
    }

    await current.admin
      .from("gallery_live_events")
      .update({
        is_active: false,
        updated_at: now,
      })
      .eq("id", liveEvent.id);

    return NextResponse.json({
      success: true,
      event: updatedEvent,
    });
  }

  return NextResponse.json(
    { success: false, error: "Azione admin non valida." },
    { status: 400 }
  );
}
