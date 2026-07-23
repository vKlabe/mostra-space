import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizePlanName, type PlanName } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
  plan: PlanName | string | null;
};

type OwnerPlanProfile = {
  id: string;
  plan: PlanName | string | null;
};

type Gallery = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
};

type LiveGuidedVisitAccessMode =
  | "public"
  | "password"
  | "invite_only"
  | "private_link";

type LiveGuidedVisitVoiceMode =
  | "owner_speaks"
  | "everyone_speaks"
  | "request_to_speak";

type LiveGuidedVisitPayload = {
  enabled: boolean;
  accessMode: LiveGuidedVisitAccessMode;
  voiceMode: LiveGuidedVisitVoiceMode;
  maxParticipants: number | null;
  password: string | null;
};

type CreateEventBody = {
  galleryId?: unknown;
  title?: unknown;
  description?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  durationMinutes?: unknown;
  timezone?: unknown;
  liveGuidedVisit?: unknown;
};

type FollowRow = {
  follower_id: string;
};

type FavoriteGalleryRow = {
  user_id: string;
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

function cleanDurationMinutes(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 60;
  }

  if (numberValue < 15) {
    return 15;
  }

  if (numberValue > 240) {
    return 240;
  }

  return Math.round(numberValue);
}

function cleanMaxParticipants(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  if (numberValue < 2) {
    return 2;
  }

  if (numberValue > 1000) {
    return 1000;
  }

  return Math.round(numberValue);
}

function parseDate(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function cleanAccessMode(value: unknown): LiveGuidedVisitAccessMode {
  if (
    value === "public" ||
    value === "password" ||
    value === "invite_only" ||
    value === "private_link"
  ) {
    return value;
  }

  return "public";
}

function cleanVoiceMode(value: unknown): LiveGuidedVisitVoiceMode {
  if (
    value === "owner_speaks" ||
    value === "everyone_speaks" ||
    value === "request_to_speak"
  ) {
    return value;
  }

  return "owner_speaks";
}

function parseLiveGuidedVisit(value: unknown): LiveGuidedVisitPayload {
  if (!value || typeof value !== "object") {
    return {
      enabled: false,
      accessMode: "public",
      voiceMode: "owner_speaks",
      maxParticipants: null,
      password: null,
    };
  }

  const payload = value as Record<string, unknown>;
  const enabled = payload.enabled === true;

  return {
    enabled,
    accessMode: cleanAccessMode(payload.accessMode),
    voiceMode: cleanVoiceMode(payload.voiceMode),
    maxParticipants: cleanMaxParticipants(payload.maxParticipants),
    password: cleanNullableText(payload.password),
  };
}

function hashLivePassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

function buildLiveRoomName(galleryId: string, eventId: string) {
  return `gallery-${galleryId}-event-${eventId}`;
}

function getDefaultParticipantRole(voiceMode: LiveGuidedVisitVoiceMode) {
  if (voiceMode === "everyone_speaks") {
    return "speaker";
  }

  if (voiceMode === "request_to_speak") {
    return "listener_can_request";
  }

  return "listener";
}

async function requireEventCreator() {
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
      user: null,
      profile: null,
      admin,
    };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, plan")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    return {
      ok: false,
      status: 404,
      error: "Profilo non trovato.",
      user,
      profile: null,
      admin,
    };
  }

  const canCreateEvent =
    profile.role === "gallerist" || profile.role === "admin";

  if (!canCreateEvent) {
    return {
      ok: false,
      status: 403,
      error: "Solo galleristi e admin possono creare eventi.",
      user,
      profile,
      admin,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    user,
    profile,
    admin,
  };
}

async function completeExpiredEvents(
  admin: ReturnType<typeof createAdminClient>,
  galleryId?: string
) {
  let query = admin
    .from("gallery_events")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in("status", ["scheduled", "live"])
    .lte("ends_at", new Date().toISOString());

  if (galleryId) {
    query = query.eq("gallery_id", galleryId);
  }

  await query;
}

async function createEventNotifications({
  admin,
  eventId,
  ownerId,
  galleryId,
  galleryTitle,
  eventTitle,
  startsAt,
}: {
  admin: ReturnType<typeof createAdminClient>;
  eventId: string;
  ownerId: string;
  galleryId: string;
  galleryTitle: string;
  eventTitle: string;
  startsAt: Date;
}) {
  const { data: followerRows } = await admin
    .from("account_follows")
    .select("follower_id")
    .eq("following_id", ownerId);

  const followerIds = ((followerRows || []) as FollowRow[]).map(
    (row) => row.follower_id
  );

  const { data: favoriteRows } = await admin
    .from("favorite_galleries")
    .select("user_id")
    .eq("gallery_id", galleryId);

  const favoriteUserIds = ((favoriteRows || []) as FavoriteGalleryRow[]).map(
    (row) => row.user_id
  );

  const recipientIds = Array.from(
    new Set([...followerIds, ...favoriteUserIds].filter((id) => id !== ownerId))
  );

  if (recipientIds.length === 0) {
    return;
  }

  const now = new Date();
  const threeDaysBefore = new Date(startsAt.getTime() - 3 * 24 * 60 * 60 * 1000);
  const thirtyMinutesBefore = new Date(startsAt.getTime() - 30 * 60 * 1000);

  const rows = recipientIds.flatMap((userId) => {
    const notifications = [
      {
        user_id: userId,
        type: "event_created",
        title: "Nuovo evento in calendario",
        message: `${eventTitle} · ${galleryTitle}`,
        event_id: eventId,
        gallery_id: galleryId,
        actor_profile_id: ownerId,
        scheduled_for: now.toISOString(),
      },
    ];

    if (threeDaysBefore > now) {
      notifications.push({
        user_id: userId,
        type: "event_3_days_before",
        title: "Evento tra 3 giorni",
        message: `${eventTitle} · ${galleryTitle}`,
        event_id: eventId,
        gallery_id: galleryId,
        actor_profile_id: ownerId,
        scheduled_for: threeDaysBefore.toISOString(),
      });
    }

    if (thirtyMinutesBefore > now) {
      notifications.push({
        user_id: userId,
        type: "event_30_minutes_before",
        title: "Evento tra 30 minuti",
        message: `${eventTitle} · ${galleryTitle}`,
        event_id: eventId,
        gallery_id: galleryId,
        actor_profile_id: ownerId,
        scheduled_for: thirtyMinutesBefore.toISOString(),
      });
    }

    return notifications;
  });

  if (rows.length === 0) {
    return;
  }

  await admin.from("account_notifications").upsert(rows, {
    onConflict: "user_id,event_id,type",
    ignoreDuplicates: true,
  });
}

export async function POST(request: Request) {
  const current = await requireEventCreator();

  if (!current.ok || !current.user || !current.profile) {
    return NextResponse.json(
      { success: false, error: current.error },
      { status: current.status }
    );
  }

  let body: CreateEventBody;

  try {
    body = (await request.json()) as CreateEventBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Payload non valido." },
      { status: 400 }
    );
  }

  const galleryId = cleanText(body.galleryId);
  const title = cleanText(body.title);
  const description = cleanNullableText(body.description);
  const startsAt = parseDate(body.startsAt);
  const timezone = cleanText(body.timezone) || "Europe/Rome";
  const durationMinutes = cleanDurationMinutes(body.durationMinutes);
  const endsAt =
    parseDate(body.endsAt) ||
    (startsAt
      ? new Date(startsAt.getTime() + durationMinutes * 60 * 1000)
      : null);
  const liveGuidedVisit = parseLiveGuidedVisit(body.liveGuidedVisit);

  if (!galleryId) {
    return NextResponse.json(
      { success: false, error: "Seleziona una galleria." },
      { status: 400 }
    );
  }

  if (!title) {
    return NextResponse.json(
      { success: false, error: "Il titolo evento è obbligatorio." },
      { status: 400 }
    );
  }

  if (!startsAt || !endsAt) {
    return NextResponse.json(
      { success: false, error: "Data evento non valida." },
      { status: 400 }
    );
  }

  if (startsAt <= new Date()) {
    return NextResponse.json(
      { success: false, error: "La data evento deve essere futura." },
      { status: 400 }
    );
  }

  if (endsAt <= startsAt) {
    return NextResponse.json(
      { success: false, error: "La fine evento deve essere successiva all'inizio." },
      { status: 400 }
    );
  }

  if (
    liveGuidedVisit.enabled &&
    liveGuidedVisit.accessMode === "password" &&
    (!liveGuidedVisit.password || liveGuidedVisit.password.length < 4)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Inserisci una password di almeno 4 caratteri per la Live guided visit.",
      },
      { status: 400 }
    );
  }

  const admin = current.admin;

  const { data: gallery, error: galleryError } = await admin
    .from("galleries")
    .select("id, owner_id, title, slug, status")
    .eq("id", galleryId)
    .single<Gallery>();

  if (galleryError || !gallery) {
    return NextResponse.json(
      { success: false, error: "Galleria non trovata." },
      { status: 404 }
    );
  }

  const isAdmin = current.profile.role === "admin";
  const isOwner = gallery.owner_id === current.user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json(
      { success: false, error: "Non puoi creare eventi per questa galleria." },
      { status: 403 }
    );
  }

  const { data: ownerProfile, error: ownerProfileError } = await admin
    .from("profiles")
    .select("id, plan")
    .eq("id", gallery.owner_id)
    .single<OwnerPlanProfile>();

  if (ownerProfileError || !ownerProfile) {
    return NextResponse.json(
      { success: false, error: "Profilo proprietario non trovato." },
      { status: 404 }
    );
  }

  const ownerPlan = normalizePlanName(ownerProfile.plan);

  if (liveGuidedVisit.enabled && ownerPlan !== "institution") {
    return NextResponse.json(
      {
        success: false,
        error:
          "Le Live guided visits sono disponibili solo per gallerie con piano Institution.",
      },
      { status: 403 }
    );
  }

  await completeExpiredEvents(admin, gallery.id);

  const { data: activeEvent, error: activeEventError } = await admin
    .from("gallery_events")
    .select("id, title, starts_at, ends_at")
    .eq("gallery_id", gallery.id)
    .in("status", ["scheduled", "live"])
    .maybeSingle();

  if (activeEventError) {
    return NextResponse.json(
      {
        success: false,
        error: "Errore controllo eventi esistenti.",
        details: activeEventError.message,
      },
      { status: 500 }
    );
  }

  if (activeEvent) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Questa galleria ha già un evento attivo. Termina o elimina l'evento esistente prima di crearne un altro.",
      },
      { status: 409 }
    );
  }

  const { data: createdEvent, error: insertError } = await admin
    .from("gallery_events")
    .insert({
      owner_id: current.user.id,
      gallery_id: gallery.id,
      title,
      description,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      timezone,
      status: "scheduled",
    })
    .select(
      "id, owner_id, gallery_id, title, description, starts_at, ends_at, timezone, status, created_at"
    )
    .single();

  if (insertError || !createdEvent) {
    return NextResponse.json(
      {
        success: false,
        error:
          insertError?.code === "23505"
            ? "Questa galleria ha già un evento attivo."
            : "Errore creazione evento.",
        details: insertError?.message || null,
      },
      { status: insertError?.code === "23505" ? 409 : 500 }
    );
  }

  let createdLiveGuidedVisit = null;

  if (liveGuidedVisit.enabled) {
    const passwordHash =
      liveGuidedVisit.accessMode === "password" && liveGuidedVisit.password
        ? hashLivePassword(liveGuidedVisit.password)
        : null;

    await admin.from("gallery_live_settings").upsert(
      {
        gallery_id: gallery.id,
        is_enabled: true,
        institution_only: true,
        schedule_mode: "events_only",
        access_mode: liveGuidedVisit.accessMode,
        default_participant_role: getDefaultParticipantRole(
          liveGuidedVisit.voiceMode
        ),
        allow_guests: liveGuidedVisit.accessMode !== "invite_only",
        requires_login: liveGuidedVisit.accessMode === "invite_only",
        max_participants: liveGuidedVisit.maxParticipants,
        notes: "Live guided visits enabled from dashboard event creation.",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "gallery_id",
      }
    );

    const { data: liveEvent, error: liveEventError } = await admin
      .from("gallery_live_events")
      .insert({
        gallery_event_id: createdEvent.id,
        gallery_id: gallery.id,
        title,
        description,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        timezone,
        access_mode: liveGuidedVisit.accessMode,
        password_hash: passwordHash,
        voice_mode: liveGuidedVisit.voiceMode,
        is_active: true,
        max_participants: liveGuidedVisit.maxParticipants,
        room_name: buildLiveRoomName(gallery.id, createdEvent.id),
        created_by: current.user.id,
      })
      .select(
        "id, gallery_event_id, gallery_id, title, starts_at, ends_at, access_mode, voice_mode, is_active, max_participants, room_name"
      )
      .single();

    if (liveEventError || !liveEvent) {
      await admin.from("gallery_events").delete().eq("id", createdEvent.id);

      return NextResponse.json(
        {
          success: false,
          error: "Evento non creato: errore creazione Live guided visit.",
          details: liveEventError?.message || null,
        },
        { status: 500 }
      );
    }

    createdLiveGuidedVisit = liveEvent;
  }

  await createEventNotifications({
    admin,
    eventId: createdEvent.id,
    ownerId: current.user.id,
    galleryId: gallery.id,
    galleryTitle: gallery.title,
    eventTitle: createdEvent.title,
    startsAt,
  });

  return NextResponse.json({
    success: true,
    event: createdEvent,
    liveGuidedVisit: createdLiveGuidedVisit,
  });
}
