import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ModerationAction =
  | "mute_for_all"
  | "block_microphone"
  | "allow_microphone"
  | "make_listener"
  | "remove_participant";

type ModerationBody = {
  liveEventId?: unknown;
  galleryId?: unknown;
  roomName?: unknown;
  action?: unknown;
  targetIdentity?: unknown;
  targetName?: unknown;
  targetAudioTrackSid?: unknown;
};

type Profile = {
  id: string;
  email: string | null;
  role: "user" | "gallerist" | "admin";
};

type Gallery = {
  id: string;
  owner_id: string;
  title: string;
};

type LiveGuidedVisit = {
  id: string;
  gallery_id: string;
  gallery_event_id: string | null;
  room_name: string | null;
  is_active: boolean;
};

type ModeratorRow = {
  role: "moderator" | "speaker" | string;
};

function cleanText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function cleanUuid(value: unknown) {
  const text = cleanText(value, 80);

  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      text
    )
  ) {
    return text;
  }

  return "";
}

function cleanIdentity(value: unknown) {
  const text = cleanText(value, 160);

  if (/^[a-zA-Z0-9:_@.\-]{3,160}$/.test(text)) {
    return text;
  }

  return "";
}

function cleanTrackSid(value: unknown) {
  const text = cleanText(value, 120);

  if (/^[a-zA-Z0-9_\-]{3,120}$/.test(text)) {
    return text;
  }

  return "";
}

function normalizeAction(value: unknown): ModerationAction | null {
  if (
    value === "mute_for_all" ||
    value === "block_microphone" ||
    value === "allow_microphone" ||
    value === "make_listener" ||
    value === "remove_participant"
  ) {
    return value;
  }

  return null;
}

function normalizeLiveKitHttpUrl(value: string) {
  const rawUrl = value.trim().replace(/\/+$/, "");

  if (rawUrl.startsWith("https://") || rawUrl.startsWith("http://")) {
    return rawUrl;
  }

  if (rawUrl.startsWith("wss://")) {
    return `https://${rawUrl.slice("wss://".length)}`;
  }

  if (rawUrl.startsWith("ws://")) {
    return `http://${rawUrl.slice("ws://".length)}`;
  }

  return rawUrl;
}

function getLiveKitCredentials() {
  const rawHttpUrl =
    process.env.LIVEKIT_HTTP_URL ||
    process.env.LIVEKIT_SERVER_URL ||
    process.env.LIVEKIT_URL ||
    process.env.LIVEKIT_WS_URL ||
    "";

  const httpUrl = normalizeLiveKitHttpUrl(rawHttpUrl);

  return {
    apiKey: process.env.LIVEKIT_API_KEY || "",
    apiSecret: process.env.LIVEKIT_API_SECRET || "",
    httpUrl,
  };
}

function redactUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname}`;
  } catch {
    return value ? "configured-but-invalid" : "missing";
  }
}

function getMetadataForRole(params: {
  role: "speaker" | "listener";
  canPublishAudio: boolean;
  targetName: string;
}) {
  return JSON.stringify({
    role: params.role,
    canPublishAudio: params.canPublishAudio,
    moderatedAt: new Date().toISOString(),
    displayName: params.targetName || null,
  });
}

async function upsertParticipantOverride(params: {
  admin: ReturnType<typeof createAdminClient>;
  galleryId: string;
  liveEventId: string;
  targetIdentity: string;
  targetName: string;
  role: "speaker" | "listener";
  canPublishAudio: boolean;
  microphoneBlocked: boolean;
  createdBy: string;
}) {
  const {
    admin,
    galleryId,
    liveEventId,
    targetIdentity,
    targetName,
    role,
    canPublishAudio,
    microphoneBlocked,
    createdBy,
  } = params;

  const userIdMatch = targetIdentity.match(/^user:([0-9a-f-]{36})$/i);
  const targetUserId = userIdMatch?.[1] || null;

  const overridePayload = {
    gallery_id: galleryId,
    event_id: liveEventId,
    user_id: targetUserId,
    participant_identity: targetIdentity,
    display_name: targetName || null,
    role,
    can_publish_audio: canPublishAudio,
    microphone_blocked: microphoneBlocked,
    updated_by: createdBy,
    updated_at: new Date().toISOString(),
  };

  const { data: existingByIdentity, error: existingByIdentityError } = await admin
    .from("gallery_live_event_participant_overrides")
    .select("id")
    .eq("event_id", liveEventId)
    .eq("participant_identity", targetIdentity)
    .maybeSingle();

  if (existingByIdentityError) {
    throw new Error(existingByIdentityError.message);
  }

  let existingId = (existingByIdentity as { id: string } | null)?.id || null;

  if (!existingId && targetUserId) {
    const { data: existingByUser, error: existingByUserError } = await admin
      .from("gallery_live_event_participant_overrides")
      .select("id")
      .eq("event_id", liveEventId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (existingByUserError) {
      throw new Error(existingByUserError.message);
    }

    existingId = (existingByUser as { id: string } | null)?.id || null;
  }

  if (existingId) {
    const { error } = await admin
      .from("gallery_live_event_participant_overrides")
      .update(overridePayload)
      .eq("id", existingId);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await admin
    .from("gallery_live_event_participant_overrides")
    .insert({
      ...overridePayload,
      created_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(error.message);
  }
}

function getClientErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Errore moderazione LiveKit.";

  if (message.toLowerCase().includes("fetch failed")) {
    return "RoomService LiveKit non raggiungibile. Imposta LIVEKIT_HTTP_URL con https://..., non wss://..., e ridistribuisci su Vercel.";
  }

  return message;
}

export async function POST(request: Request) {
  const admin = createAdminClient();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Devi accedere per moderare la voice room." },
      { status: 401 }
    );
  }

  let body: ModerationBody;

  try {
    body = (await request.json()) as ModerationBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Payload non valido." },
      { status: 400 }
    );
  }

  const liveEventId = cleanUuid(body.liveEventId);
  const galleryId = cleanUuid(body.galleryId);
  const action = normalizeAction(body.action);
  const targetIdentity = cleanIdentity(body.targetIdentity);
  const targetName = cleanText(body.targetName, 120);
  const targetAudioTrackSid = cleanTrackSid(body.targetAudioTrackSid);
  const requestedRoomName = cleanText(body.roomName, 220);

  if (!liveEventId || !galleryId || !action || !targetIdentity) {
    return NextResponse.json(
      { success: false, error: "Dati moderazione mancanti." },
      { status: 400 }
    );
  }

  const { data: profileData, error: profileError } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileData || null) as unknown as Profile | null;

  if (profileError || !profile) {
    return NextResponse.json(
      { success: false, error: "Profilo moderatore non trovato." },
      { status: 404 }
    );
  }

  const { data: liveEventData, error: liveEventError } = await admin
    .from("gallery_live_events")
    .select("id, gallery_id, gallery_event_id, room_name, is_active")
    .eq("id", liveEventId)
    .maybeSingle();

  const liveEvent = (liveEventData || null) as unknown as LiveGuidedVisit | null;

  if (liveEventError || !liveEvent || liveEvent.gallery_id !== galleryId) {
    return NextResponse.json(
      { success: false, error: "Live guided visit non trovata." },
      { status: 404 }
    );
  }

  if (!liveEvent.is_active) {
    return NextResponse.json(
      { success: false, error: "Questa Live guided visit non è attiva." },
      { status: 403 }
    );
  }

  const { data: galleryData, error: galleryError } = await admin
    .from("galleries")
    .select("id, owner_id, title")
    .eq("id", galleryId)
    .maybeSingle();

  const gallery = (galleryData || null) as unknown as Gallery | null;

  if (galleryError || !gallery) {
    return NextResponse.json(
      { success: false, error: "Galleria non trovata." },
      { status: 404 }
    );
  }

  const { data: moderatorData } = await admin
    .from("gallery_live_moderators")
    .select("role")
    .eq("gallery_id", gallery.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const moderator = (moderatorData || null) as unknown as ModeratorRow | null;
  const isAdmin = profile.role === "admin";
  const isOwner = gallery.owner_id === user.id;
  const isModerator = moderator?.role === "moderator";

  if (!isAdmin && !isOwner && !isModerator) {
    return NextResponse.json(
      { success: false, error: "Non puoi moderare questa voice room." },
      { status: 403 }
    );
  }

  if (targetIdentity === `user:${user.id}`) {
    return NextResponse.json(
      { success: false, error: "Non puoi moderare te stesso da qui." },
      { status: 400 }
    );
  }

  const credentials = getLiveKitCredentials();

  if (!credentials.apiKey || !credentials.apiSecret || !credentials.httpUrl) {
    return NextResponse.json(
      {
        success: false,
        error:
          "LiveKit non configurato. Imposta LIVEKIT_API_KEY, LIVEKIT_API_SECRET e LIVEKIT_HTTP_URL.",
      },
      { status: 500 }
    );
  }

  if (!credentials.httpUrl.startsWith("https://") && !credentials.httpUrl.startsWith("http://")) {
    return NextResponse.json(
      {
        success: false,
        error:
          "LIVEKIT_HTTP_URL non valido. Per la moderazione server usa https://..., non wss://....",
      },
      { status: 500 }
    );
  }

  const roomName = liveEvent.room_name || requestedRoomName;

  if (!roomName) {
    return NextResponse.json(
      { success: false, error: "Room LiveKit mancante." },
      { status: 400 }
    );
  }

  const roomService = new RoomServiceClient(
    credentials.httpUrl,
    credentials.apiKey,
    credentials.apiSecret
  );

  try {
    if (action === "mute_for_all") {
      if (!targetAudioTrackSid) {
        return NextResponse.json(
          { success: false, error: "Track audio non disponibile per questo partecipante." },
          { status: 400 }
        );
      }

      await roomService.mutePublishedTrack(
        roomName,
        targetIdentity,
        targetAudioTrackSid,
        true
      );

      return NextResponse.json({
        success: true,
        message: "Partecipante mutato per tutti.",
      });
    }

    if (action === "block_microphone") {
      if (targetAudioTrackSid) {
        await roomService.mutePublishedTrack(
          roomName,
          targetIdentity,
          targetAudioTrackSid,
          true
        );
      }

      await roomService.updateParticipant(roomName, targetIdentity, {
        metadata: getMetadataForRole({
          role: "listener",
          canPublishAudio: false,
          targetName,
        }),
        permission: {
          canPublish: false,
          canSubscribe: true,
          canPublishData: true,
        },
      });

      await upsertParticipantOverride({
        admin,
        galleryId: gallery.id,
        liveEventId: liveEvent.id,
        targetIdentity,
        targetName,
        role: "listener",
        canPublishAudio: false,
        microphoneBlocked: true,
        createdBy: user.id,
      });

      return NextResponse.json({
        success: true,
        message: "Microfono bloccato per il partecipante.",
      });
    }

    if (action === "allow_microphone") {
      await roomService.updateParticipant(roomName, targetIdentity, {
        metadata: getMetadataForRole({
          role: "speaker",
          canPublishAudio: true,
          targetName,
        }),
        permission: {
          canPublish: true,
          canSubscribe: true,
          canPublishData: true,
        },
      });

      await upsertParticipantOverride({
        admin,
        galleryId: gallery.id,
        liveEventId: liveEvent.id,
        targetIdentity,
        targetName,
        role: "speaker",
        canPublishAudio: true,
        microphoneBlocked: false,
        createdBy: user.id,
      });

      return NextResponse.json({
        success: true,
        message: "Partecipante abilitato come speaker.",
      });
    }

    if (action === "make_listener") {
      if (targetAudioTrackSid) {
        await roomService.mutePublishedTrack(
          roomName,
          targetIdentity,
          targetAudioTrackSid,
          true
        );
      }

      await roomService.updateParticipant(roomName, targetIdentity, {
        metadata: getMetadataForRole({
          role: "listener",
          canPublishAudio: false,
          targetName,
        }),
        permission: {
          canPublish: false,
          canSubscribe: true,
          canPublishData: true,
        },
      });

      await upsertParticipantOverride({
        admin,
        galleryId: gallery.id,
        liveEventId: liveEvent.id,
        targetIdentity,
        targetName,
        role: "listener",
        canPublishAudio: false,
        microphoneBlocked: false,
        createdBy: user.id,
      });

      return NextResponse.json({
        success: true,
        message: "Partecipante riportato in solo ascolto.",
      });
    }

    if (action === "remove_participant") {
      await roomService.removeParticipant(roomName, targetIdentity);

      return NextResponse.json({
        success: true,
        message: "Partecipante rimosso dalla voice room.",
      });
    }
  } catch (error) {
    console.error("[Live guided visits moderation]", {
      action,
      liveEventId,
      galleryId,
      roomName,
      targetIdentity,
      liveKitHttpUrl: redactUrl(credentials.httpUrl),
      error: error instanceof Error ? error.message : error,
    });

    return NextResponse.json(
      {
        success: false,
        error: getClientErrorMessage(error),
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: false, error: "Azione moderazione non valida." },
    { status: 400 }
  );
}
