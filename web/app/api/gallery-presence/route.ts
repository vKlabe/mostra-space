import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PresencePayload = {
  galleryId?: unknown;
  roomId?: unknown;
  sessionId?: unknown;
  visitorName?: unknown;
};

type PresenceRow = {
  session_id: string;
  visitor_name: string;
  room_id: string;
  last_seen_at: string;
};

type ProfileRow = {
  display_name: string | null;
  full_name: string | null;
  email: string | null;
};

type CurrentViewer = {
  userId: string | null;
  visitorName: string | null;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanRoomId(value: unknown) {
  const cleaned = cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 80);

  return cleaned || "main";
}

function cleanSessionId(value: unknown) {
  return cleanText(value).slice(0, 120);
}

function normalizeName(value: string | null | undefined) {
  const cleaned = cleanText(value).replace(/\s+/g, " ").slice(0, 40);

  return cleaned || null;
}

function nameFromEmail(value: string | null | undefined) {
  const email = cleanText(value);

  if (!email || !email.includes("@")) {
    return null;
  }

  return normalizeName(email.split("@")[0].replace(/[._-]+/g, " "));
}

function cleanVisitorName(value: unknown) {
  return normalizeName(typeof value === "string" ? value : null) || "Ospite";
}

async function getCurrentViewer(
  admin: ReturnType<typeof createAdminClient>
): Promise<CurrentViewer> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        userId: null,
        visitorName: null,
      };
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, full_name, email")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    const visitorName =
      normalizeName(profile?.display_name) ||
      normalizeName(profile?.full_name) ||
      nameFromEmail(profile?.email) ||
      nameFromEmail(user.email) ||
      "Utente";

    return {
      userId: user.id,
      visitorName,
    };
  } catch {
    return {
      userId: null,
      visitorName: null,
    };
  }
}

async function ensurePublishedGallery(
  admin: ReturnType<typeof createAdminClient>,
  galleryId: string
) {
  const { data: gallery, error } = await admin
    .from("galleries")
    .select("id, status")
    .eq("id", galleryId)
    .eq("status", "published")
    .single();

  if (error || !gallery) {
    return false;
  }

  return true;
}

async function readPresence({
  admin,
  galleryId,
  roomId,
}: {
  admin: ReturnType<typeof createAdminClient>;
  galleryId: string;
  roomId: string;
}) {
  const activeSince = new Date(Date.now() - 60_000).toISOString();

  const { data: activeRows, error: activeRowsError } = await admin
    .from("gallery_presence")
    .select("session_id, visitor_name, room_id, last_seen_at")
    .eq("gallery_id", galleryId)
    .gte("last_seen_at", activeSince)
    .order("last_seen_at", { ascending: false });

  if (activeRowsError) {
    return {
      error: activeRowsError,
      galleryCount: 0,
      roomCount: 0,
      activeVisitors: [] as Array<{
        sessionId: string;
        visitorName: string;
        roomId: string;
        lastSeenAt: string;
      }>,
    };
  }

  const safeRows = (activeRows || []) as PresenceRow[];

  return {
    error: null,
    galleryCount: safeRows.length,
    roomCount: safeRows.filter((row) => row.room_id === roomId).length,
    activeVisitors: safeRows.slice(0, 24).map((row) => ({
      sessionId: row.session_id,
      visitorName: row.visitor_name,
      roomId: row.room_id,
      lastSeenAt: row.last_seen_at,
    })),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const galleryId = cleanText(url.searchParams.get("galleryId"));
  const roomId = cleanRoomId(url.searchParams.get("roomId"));

  if (!galleryId) {
    return NextResponse.json(
      { error: "galleryId mancante." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const galleryExists = await ensurePublishedGallery(admin, galleryId);

  if (!galleryExists) {
    return NextResponse.json(
      { error: "Galleria non trovata o non pubblicata." },
      { status: 404 }
    );
  }

  const presence = await readPresence({ admin, galleryId, roomId });

  if (presence.error) {
    return NextResponse.json(
      {
        error: "Errore lettura presenze.",
        details: presence.error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    presence,
  });
}

export async function POST(request: Request) {
  let body: PresencePayload;

  try {
    body = (await request.json()) as PresencePayload;
  } catch {
    return NextResponse.json(
      { error: "Payload non valido." },
      { status: 400 }
    );
  }

  const galleryId = cleanText(body.galleryId);
  const roomId = cleanRoomId(body.roomId);
  const sessionId = cleanSessionId(body.sessionId);
  const fallbackVisitorName = cleanVisitorName(body.visitorName);

  if (!galleryId || !sessionId) {
    return NextResponse.json(
      { error: "galleryId e sessionId sono obbligatori." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const galleryExists = await ensurePublishedGallery(admin, galleryId);

  if (!galleryExists) {
    return NextResponse.json(
      { error: "Galleria non trovata o non pubblicata." },
      { status: 404 }
    );
  }

  const viewer = await getCurrentViewer(admin);
  const userId = viewer.userId;
  const visitorName = viewer.visitorName || fallbackVisitorName;
  const now = new Date().toISOString();

  const { error: upsertError } = await admin.from("gallery_presence").upsert(
    {
      gallery_id: galleryId,
      room_id: roomId,
      session_id: sessionId,
      user_id: userId,
      visitor_name: visitorName,
      last_seen_at: now,
    },
    {
      onConflict: "gallery_id,session_id",
    }
  );

  if (upsertError) {
    return NextResponse.json(
      {
        error: "Errore aggiornamento presenza.",
        details: upsertError.message,
      },
      { status: 500 }
    );
  }

  const oldPresenceLimit = new Date(Date.now() - 5 * 60_000).toISOString();

  await admin
    .from("gallery_presence")
    .delete()
    .eq("gallery_id", galleryId)
    .lt("last_seen_at", oldPresenceLimit);

  const presence = await readPresence({ admin, galleryId, roomId });

  if (presence.error) {
    return NextResponse.json(
      {
        error: "Errore lettura presenze.",
        details: presence.error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    presence: {
      ...presence,
      viewerName: visitorName,
      viewerUserId: userId,
    },
  });
}
