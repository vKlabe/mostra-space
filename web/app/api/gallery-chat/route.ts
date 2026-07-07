import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const maxMessageLength = 500;
const recentWindowSeconds = 10;
const maxMessagesPerWindow = 3;
const duplicateWindowSeconds = 30;
const chatMessageRetentionHours = 24;

type ChatPayload = {
  galleryId?: unknown;
  roomId?: unknown;
  sessionId?: unknown;
  visitorName?: unknown;
  message?: unknown;
};

type ChatMessageRow = {
  id: string;
  gallery_id: string;
  room_id: string;
  session_id: string;
  user_id: string | null;
  visitor_name: string;
  message: string;
  created_at: string;
};

type RecentMessageRow = {
  id: string;
  message: string;
  created_at: string;
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

function cleanMessage(value: unknown) {
  return cleanText(value).replace(/\s+/g, " ").slice(0, maxMessageLength);
}

function secondsAgo(seconds: number) {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
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

async function cleanupOldMessages({
  admin,
  galleryId,
}: {
  admin: ReturnType<typeof createAdminClient>;
  galleryId: string;
}) {
  const retentionLimit = hoursAgo(chatMessageRetentionHours);

  await admin
    .from("gallery_chat_messages")
    .delete()
    .eq("gallery_id", galleryId)
    .lt("created_at", retentionLimit);
}

function toPublicMessage(row: ChatMessageRow) {
  return {
    id: row.id,
    galleryId: row.gallery_id,
    roomId: row.room_id,
    sessionId: row.session_id,
    userId: row.user_id,
    visitorName: row.visitor_name,
    message: row.message,
    createdAt: row.created_at,
  };
}

async function checkChatRateLimit({
  admin,
  galleryId,
  roomId,
  sessionId,
  message,
}: {
  admin: ReturnType<typeof createAdminClient>;
  galleryId: string;
  roomId: string;
  sessionId: string;
  message: string;
}) {
  const { data: recentRows, error: recentError } = await admin
    .from("gallery_chat_messages")
    .select("id, message, created_at")
    .eq("gallery_id", galleryId)
    .eq("room_id", roomId)
    .eq("session_id", sessionId)
    .gte("created_at", secondsAgo(recentWindowSeconds))
    .order("created_at", { ascending: false })
    .limit(10);

  if (recentError) {
    return {
      allowed: false,
      status: 500,
      error: "Errore controllo invio messaggio.",
      details: recentError.message,
    };
  }

  const recentMessages = (recentRows || []) as RecentMessageRow[];

  if (recentMessages.length >= maxMessagesPerWindow) {
    return {
      allowed: false,
      status: 429,
      error: "Stai scrivendo troppo velocemente. Aspetta qualche secondo.",
      details: null,
    };
  }

  const lastMessage = recentMessages[0];

  if (lastMessage) {
    const lastMessageAt = new Date(lastMessage.created_at).getTime();
    const millisecondsSinceLastMessage = Date.now() - lastMessageAt;

    if (millisecondsSinceLastMessage >= 0 && millisecondsSinceLastMessage < 2500) {
      return {
        allowed: false,
        status: 429,
        error: "Aspetta un attimo prima di inviare un altro messaggio.",
        details: null,
      };
    }
  }

  const { data: duplicateRows, error: duplicateError } = await admin
    .from("gallery_chat_messages")
    .select("id, message, created_at")
    .eq("gallery_id", galleryId)
    .eq("room_id", roomId)
    .eq("session_id", sessionId)
    .eq("message", message)
    .gte("created_at", secondsAgo(duplicateWindowSeconds))
    .limit(1);

  if (duplicateError) {
    return {
      allowed: false,
      status: 500,
      error: "Errore controllo messaggio duplicato.",
      details: duplicateError.message,
    };
  }

  if ((duplicateRows || []).length > 0) {
    return {
      allowed: false,
      status: 429,
      error: "Hai già inviato questo messaggio. Scrivine uno diverso.",
      details: null,
    };
  }

  return {
    allowed: true,
    status: 200,
    error: null,
    details: null,
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

  await cleanupOldMessages({ admin, galleryId });

  const { data: rows, error: messagesError } = await admin
    .from("gallery_chat_messages")
    .select(
      "id, gallery_id, room_id, session_id, user_id, visitor_name, message, created_at"
    )
    .eq("gallery_id", galleryId)
    .eq("room_id", roomId)
    .gte("created_at", hoursAgo(chatMessageRetentionHours))
    .order("created_at", { ascending: false })
    .limit(50);

  if (messagesError) {
    return NextResponse.json(
      {
        error: "Errore lettura chat.",
        details: messagesError.message,
      },
      { status: 500 }
    );
  }

  const safeRows = ((rows || []) as ChatMessageRow[]).reverse();

  return NextResponse.json({
    success: true,
    messages: safeRows.map(toPublicMessage),
    retentionHours: chatMessageRetentionHours,
  });
}

export async function POST(request: Request) {
  let body: ChatPayload;

  try {
    body = (await request.json()) as ChatPayload;
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
  const message = cleanMessage(body.message);

  if (!galleryId || !sessionId) {
    return NextResponse.json(
      { error: "galleryId e sessionId sono obbligatori." },
      { status: 400 }
    );
  }

  if (!message) {
    return NextResponse.json(
      { error: "Il messaggio non può essere vuoto." },
      { status: 400 }
    );
  }

  if (message.length > maxMessageLength) {
    return NextResponse.json(
      { error: `Il messaggio non può superare ${maxMessageLength} caratteri.` },
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

  await cleanupOldMessages({ admin, galleryId });

  const rateLimit = await checkChatRateLimit({
    admin,
    galleryId,
    roomId,
    sessionId,
    message,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: rateLimit.error,
        details: rateLimit.details,
      },
      { status: rateLimit.status }
    );
  }

  const viewer = await getCurrentViewer(admin);
  const userId = viewer.userId;
  const visitorName = viewer.visitorName || fallbackVisitorName;

  const { data: insertedMessage, error: insertError } = await admin
    .from("gallery_chat_messages")
    .insert({
      gallery_id: galleryId,
      room_id: roomId,
      session_id: sessionId,
      user_id: userId,
      visitor_name: visitorName,
      message,
    })
    .select(
      "id, gallery_id, room_id, session_id, user_id, visitor_name, message, created_at"
    )
    .single();

  if (insertError || !insertedMessage) {
    return NextResponse.json(
      {
        error: "Errore invio messaggio.",
        details: insertError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: toPublicMessage(insertedMessage as ChatMessageRow),
    viewerName: visitorName,
    retentionHours: chatMessageRetentionHours,
  });
}
