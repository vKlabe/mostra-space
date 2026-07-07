import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

type Gallery = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
};

type CreateEventBody = {
  galleryId?: unknown;
  title?: unknown;
  description?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  durationMinutes?: unknown;
  timezone?: unknown;
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
    .select("id, role")
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

  await admin
    .from("account_notifications")
    .upsert(rows, {
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
  });
}
