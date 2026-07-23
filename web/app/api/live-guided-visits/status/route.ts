import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Gallery = {
  id: string;
  owner_id: string;
  title: string | null;
  slug: string | null;
  status: "draft" | "published" | "archived";
};

type OwnerProfile = {
  id: string;
  role: "user" | "gallerist" | "admin";
  plan: string | null;
};

type LiveGuidedVisitRecord = {
  id: string;
  gallery_id: string;
  gallery_event_id: string | null;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  access_mode: "public" | "password" | "invite_only" | "private_link";
  voice_mode: "owner_only" | "everyone" | "request_to_speak";
  max_participants: number | null;
  room_name: string | null;
  is_active: boolean;
};

type GalleryEventRecord = {
  id: string;
  status: "scheduled" | "live" | "completed" | "cancelled";
};

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeAccessMode(
  value: unknown
): LiveGuidedVisitRecord["access_mode"] {
  if (
    value === "password" ||
    value === "invite_only" ||
    value === "private_link" ||
    value === "public"
  ) {
    return value;
  }

  return "public";
}

function normalizeVoiceMode(
  value: unknown
): LiveGuidedVisitRecord["voice_mode"] {
  if (
    value === "everyone" ||
    value === "request_to_speak" ||
    value === "owner_only"
  ) {
    return value;
  }

  return "owner_only";
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function toPublicLiveEvent(
  event: LiveGuidedVisitRecord,
  now: Date,
  calendarStatus: GalleryEventRecord["status"] | null
) {
  const startsAt = new Date(event.starts_at);
  const endsAt = new Date(event.ends_at);
  const joinOpensAt = addMinutes(startsAt, -10);
  const joinClosesAt = addMinutes(endsAt, 15);
  const isJoinWindowOpen = now >= joinOpensAt && now <= joinClosesAt;
  const isLiveNow = now >= startsAt && now <= endsAt;

  return {
    id: event.id,
    galleryId: event.gallery_id,
    galleryEventId: event.gallery_event_id,
    title: event.title,
    description: event.description,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    timezone: event.timezone,
    accessMode: normalizeAccessMode(event.access_mode),
    voiceMode: normalizeVoiceMode(event.voice_mode),
    maxParticipants: event.max_participants,
    roomName: event.room_name,
    calendarStatus,
    isActive: event.is_active,
    isLiveNow,
    isJoinWindowOpen,
    joinOpensAt: joinOpensAt.toISOString(),
    joinClosesAt: joinClosesAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const galleryId = cleanText(url.searchParams.get("galleryId"));

  if (!galleryId) {
    return NextResponse.json(
      { success: false, error: "GalleryId mancante." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const now = new Date();
  const cutoff = addMinutes(now, -15).toISOString();

  const { data: galleryData, error: galleryError } = await admin
    .from("galleries")
    .select("id, owner_id, title, slug, status")
    .eq("id", galleryId)
    .maybeSingle();

  const gallery = galleryData as unknown as Gallery | null;

  if (galleryError || !gallery) {
    return NextResponse.json(
      { success: false, error: "Galleria non trovata." },
      { status: 404 }
    );
  }

  const { data: ownerData } = await admin
    .from("profiles")
    .select("id, role, plan")
    .eq("id", gallery.owner_id)
    .maybeSingle();

  const owner = ownerData as unknown as OwnerProfile | null;
  const ownerPlan = owner?.plan || "free";
  const isInstitutionGallery = ownerPlan === "institution";

  const { data: settingsData } = await admin
    .from("gallery_live_settings")
    .select(
      "gallery_id, voice_enabled, voice_access_mode, voice_schedule_mode, owner_plan_required, max_participants"
    )
    .eq("gallery_id", gallery.id)
    .maybeSingle();

  const settings = settingsData as unknown as {
    gallery_id: string;
    voice_enabled: boolean;
    voice_access_mode: string;
    voice_schedule_mode: string;
    owner_plan_required: string;
    max_participants: number | null;
  } | null;

  const { data: liveEventsData, error: liveEventsError } = await admin
    .from("gallery_live_events")
    .select(
      "id, gallery_id, gallery_event_id, title, description, starts_at, ends_at, timezone, access_mode, voice_mode, max_participants, room_name, is_active"
    )
    .eq("gallery_id", gallery.id)
    .eq("is_active", true)
    .gte("ends_at", cutoff)
    .order("starts_at", { ascending: true })
    .limit(5);

  if (liveEventsError) {
    return NextResponse.json(
      {
        success: false,
        error: "Errore caricamento Live guided visits.",
        details: liveEventsError.message,
      },
      { status: 500 }
    );
  }

  const liveEvents =
    (liveEventsData || []) as unknown as LiveGuidedVisitRecord[];

  const galleryEventIds = Array.from(
    new Set(
      liveEvents
        .map((event) => event.gallery_event_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: calendarEventsData } =
    galleryEventIds.length > 0
      ? await admin
          .from("gallery_events")
          .select("id, status")
          .in("id", galleryEventIds)
      : { data: [] };

  const calendarStatusById = new Map(
    ((calendarEventsData || []) as unknown as GalleryEventRecord[]).map(
      (event) => [event.id, event.status]
    )
  );

  const publicEvents = liveEvents
    .map((event) => {
      const calendarStatus = event.gallery_event_id
        ? calendarStatusById.get(event.gallery_event_id) || null
        : null;

      return toPublicLiveEvent(event, now, calendarStatus);
    })
    .filter(
      (event) =>
        event.calendarStatus !== "completed" &&
        event.calendarStatus !== "cancelled"
    );

  const currentEvent =
    publicEvents.find((event) => event.isJoinWindowOpen) || null;

  const upcomingEvent =
    publicEvents.find((event) => new Date(event.endsAt) > now) || null;

  return NextResponse.json({
    success: true,
    liveGuidedVisits: {
      enabledForGallery: Boolean(settings?.voice_enabled) && isInstitutionGallery,
      institutionOnly: true,
      ownerPlan,
      ownerPlanRequired: settings?.owner_plan_required || "institution",
      isInstitutionGallery,
      gallery: {
        id: gallery.id,
        title: gallery.title,
        slug: gallery.slug,
        status: gallery.status,
      },
      settings: settings
        ? {
            voiceEnabled: settings.voice_enabled,
            voiceAccessMode: settings.voice_access_mode,
            voiceScheduleMode: settings.voice_schedule_mode,
            maxParticipants: settings.max_participants,
          }
        : null,
      serverNow: now.toISOString(),
      currentEvent,
      upcomingEvent,
      events: publicEvents,
    },
  });
}
