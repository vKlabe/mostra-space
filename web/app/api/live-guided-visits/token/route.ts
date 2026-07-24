import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizePlanName, type PlanName } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProfileRole = "user" | "gallerist" | "admin";

type AccessMode = "public" | "password" | "invite_only" | "private_link";
type VoiceMode = "owner_only" | "everyone" | "request_to_speak";
type ParticipantRole =
  | "admin"
  | "owner"
  | "moderator"
  | "speaker"
  | "listener_can_request"
  | "listener";

type TokenRequestBody = {
  liveEventId?: unknown;
  password?: unknown;
  privateToken?: unknown;
  inviteToken?: unknown;
  displayName?: unknown;
  sessionId?: unknown;
};

type LiveGuidedVisit = {
  id: string;
  gallery_id: string;
  gallery_event_id: string | null;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string | null;
  access_mode: string | null;
  password_hash: string | null;
  private_token: string | null;
  voice_mode: string | null;
  is_active: boolean;
  max_participants: number | null;
  room_name: string | null;
};

type Gallery = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
};

type GalleryEvent = {
  id: string;
  gallery_id: string;
  owner_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  timezone: string | null;
  status: "scheduled" | "live" | "completed" | "cancelled";
};

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: ProfileRole;
  plan: PlanName | string | null;
};

type LiveSettings = {
  gallery_id: string;
  is_enabled?: boolean | null;
  voice_enabled?: boolean | null;
  institution_only?: boolean | null;
  allow_guests?: boolean | null;
  requires_login?: boolean | null;
  owner_plan_required?: PlanName | string | null;
};

type ModeratorRow = {
  role: "moderator" | "speaker" | string;
};

type InviteRow = {
  id: string;
  role: "owner" | "moderator" | "speaker" | "listener" | string;
  status: "invited" | "accepted" | "revoked" | string;
};

type BlockRow = {
  id: string;
};

type ParticipantOverrideRow = {
  id: string;
  role: string | null;
  can_publish_audio: boolean | null;
  microphone_blocked: boolean | null;
};

const JOIN_EARLY_MINUTES = 10;
const JOIN_LATE_GRACE_MINUTES = 15;
const MAX_TOKEN_TTL_SECONDS = 2 * 60 * 60;
const MIN_TOKEN_TTL_SECONDS = 5 * 60;

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

function cleanSessionId(value: unknown) {
  const text = cleanText(value, 120);

  if (/^[a-zA-Z0-9:_-]{8,120}$/.test(text)) {
    return text;
  }

  return "";
}

function normalizeAccessMode(value: unknown): AccessMode {
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

function normalizeVoiceMode(value: unknown): VoiceMode {
  if (value === "everyone" || value === "everyone_speaks") {
    return "everyone";
  }

  if (value === "request_to_speak") {
    return "request_to_speak";
  }

  return "owner_only";
}

function getProfileDisplayName(profile: Profile | null, fallbackName: string) {
  return (
    profile?.display_name ||
    profile?.full_name ||
    profile?.email?.split("@")[0] ||
    fallbackName ||
    "Visitor"
  );
}

function verifyLivePassword(password: string, encodedHash: string | null) {
  if (!password || !encodedHash) {
    return false;
  }

  const [algorithm, salt, storedHash] = encodedHash.split(":");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  try {
    const candidateHash = crypto.scryptSync(password, salt, 64).toString("hex");
    const storedBuffer = Buffer.from(storedHash, "hex");
    const candidateBuffer = Buffer.from(candidateHash, "hex");

    if (storedBuffer.length !== candidateBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(storedBuffer, candidateBuffer);
  } catch {
    return false;
  }
}

function buildFallbackRoomName(galleryId: string, liveEventId: string) {
  return `gallery-${galleryId}-live-${liveEventId}`;
}

function getJoinWindow(liveEvent: LiveGuidedVisit) {
  const startsAt = new Date(liveEvent.starts_at);
  const endsAt = new Date(liveEvent.ends_at);

  const opensAt = new Date(startsAt.getTime() - JOIN_EARLY_MINUTES * 60 * 1000);
  const closesAt = new Date(
    endsAt.getTime() + JOIN_LATE_GRACE_MINUTES * 60 * 1000
  );

  return {
    startsAt,
    endsAt,
    opensAt,
    closesAt,
  };
}

function calculateTokenTtlSeconds(liveEvent: LiveGuidedVisit) {
  const now = Date.now();
  const { closesAt } = getJoinWindow(liveEvent);
  const secondsUntilClose = Math.ceil((closesAt.getTime() - now) / 1000);

  return Math.max(
    MIN_TOKEN_TTL_SECONDS,
    Math.min(MAX_TOKEN_TTL_SECONDS, secondsUntilClose)
  );
}

function getParticipantIdentity(userId: string | null, sessionId: string) {
  if (userId) {
    return `user:${userId}`;
  }

  if (sessionId) {
    return `guest:${sessionId}`;
  }

  return `guest:${crypto.randomUUID()}`;
}

function getLiveKitWsUrl() {
  return (
    process.env.LIVEKIT_WS_URL ||
    process.env.NEXT_PUBLIC_LIVEKIT_URL ||
    process.env.LIVEKIT_URL ||
    ""
  );
}

function getLiveKitCredentials() {
  return {
    apiKey: process.env.LIVEKIT_API_KEY || "",
    apiSecret: process.env.LIVEKIT_API_SECRET || "",
    wsUrl: getLiveKitWsUrl(),
  };
}

function isLiveSettingsEnabled(settings: LiveSettings | null) {
  if (!settings) {
    return true;
  }

  if (settings.voice_enabled === false) {
    return false;
  }

  if (settings.is_enabled === false) {
    return false;
  }

  return true;
}

function isPrivileged(params: {
  isAdmin: boolean;
  isOwner: boolean;
  moderatorRole: string | null;
}) {
  return Boolean(params.isAdmin || params.isOwner || params.moderatorRole);
}

function getRoleFromInvite(invite: InviteRow | null): ParticipantRole | null {
  if (!invite || invite.status === "revoked") {
    return null;
  }

  if (invite.role === "owner") {
    return "owner";
  }

  if (invite.role === "moderator") {
    return "moderator";
  }

  if (invite.role === "speaker") {
    return "speaker";
  }

  return "listener";
}

function getParticipantRole(params: {
  isAdmin: boolean;
  isOwner: boolean;
  moderatorRole: string | null;
  inviteRole: ParticipantRole | null;
  voiceMode: VoiceMode;
}): ParticipantRole {
  if (params.isAdmin) {
    return "admin";
  }

  if (params.isOwner) {
    return "owner";
  }

  if (params.moderatorRole === "moderator") {
    return "moderator";
  }

  if (params.moderatorRole === "speaker") {
    return "speaker";
  }

  if (params.inviteRole) {
    return params.inviteRole;
  }

  if (params.voiceMode === "everyone") {
    return "speaker";
  }

  if (params.voiceMode === "request_to_speak") {
    return "listener_can_request";
  }

  return "listener";
}

function canPublishAudioForRole(role: ParticipantRole, voiceMode: VoiceMode) {
  if (
    role === "admin" ||
    role === "owner" ||
    role === "moderator" ||
    role === "speaker"
  ) {
    return true;
  }

  return voiceMode === "everyone";
}

async function findInvite(params: {
  admin: ReturnType<typeof createAdminClient>;
  liveEventId: string;
  inviteToken: string;
  userId: string | null;
  email: string | null;
}) {
  const { admin, liveEventId, inviteToken, userId, email } = params;

  if (inviteToken) {
    const { data } = await admin
      .from("gallery_live_event_invites")
      .select("id, role, status")
      .eq("event_id", liveEventId)
      .eq("invite_token", inviteToken)
      .neq("status", "revoked")
      .maybeSingle();

    return (data || null) as unknown as InviteRow | null;
  }

  if (userId) {
    const { data } = await admin
      .from("gallery_live_event_invites")
      .select("id, role, status")
      .eq("event_id", liveEventId)
      .eq("user_id", userId)
      .neq("status", "revoked")
      .maybeSingle();

    if (data) {
      return data as unknown as InviteRow;
    }
  }

  if (email) {
    const { data } = await admin
      .from("gallery_live_event_invites")
      .select("id, role, status")
      .eq("event_id", liveEventId)
      .eq("email", email.toLowerCase())
      .neq("status", "revoked")
      .maybeSingle();

    if (data) {
      return data as unknown as InviteRow;
    }

    const fallback = await admin
      .from("gallery_live_event_invites")
      .select("id, role, status")
      .eq("event_id", liveEventId)
      .eq("email", email)
      .neq("status", "revoked")
      .maybeSingle();

    return (fallback.data || null) as unknown as InviteRow | null;
  }

  return null;
}

async function isBlocked(params: {
  admin: ReturnType<typeof createAdminClient>;
  galleryId: string;
  userId: string | null;
  email: string | null;
}) {
  const { admin, galleryId, userId, email } = params;

  if (userId) {
    const { data } = await admin
      .from("gallery_live_blocks")
      .select("id")
      .eq("gallery_id", galleryId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      return true;
    }
  }

  if (email) {
    const { data } = await admin
      .from("gallery_live_blocks")
      .select("id")
      .eq("gallery_id", galleryId)
      .eq("email", email.toLowerCase())
      .maybeSingle();

    return Boolean((data || null) as unknown as BlockRow | null);
  }

  return false;
}

async function findParticipantOverride(params: {
  admin: ReturnType<typeof createAdminClient>;
  liveEventId: string;
  userId: string | null;
  participantIdentity: string;
}) {
  const { admin, liveEventId, userId, participantIdentity } = params;

  if (userId) {
    const { data } = await admin
      .from("gallery_live_event_participant_overrides")
      .select("id, role, can_publish_audio, microphone_blocked")
      .eq("event_id", liveEventId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      return data as unknown as ParticipantOverrideRow;
    }
  }

  const { data } = await admin
    .from("gallery_live_event_participant_overrides")
    .select("id, role, can_publish_audio, microphone_blocked")
    .eq("event_id", liveEventId)
    .eq("participant_identity", participantIdentity)
    .maybeSingle();

  return (data || null) as unknown as ParticipantOverrideRow | null;
}

function applyParticipantOverride(params: {
  baseRole: ParticipantRole;
  baseCanPublishAudio: boolean;
  override: ParticipantOverrideRow | null;
}) {
  const { baseRole, baseCanPublishAudio, override } = params;

  if (!override) {
    return {
      participantRole: baseRole,
      canPublishAudio: baseCanPublishAudio,
    };
  }

  if (override.microphone_blocked) {
    return {
      participantRole: "listener" as ParticipantRole,
      canPublishAudio: false,
    };
  }

  if (override.role === "moderator") {
    return {
      participantRole: "moderator" as ParticipantRole,
      canPublishAudio: true,
    };
  }

  if (override.role === "speaker" || override.can_publish_audio === true) {
    return {
      participantRole: "speaker" as ParticipantRole,
      canPublishAudio: true,
    };
  }

  if (override.role === "listener" || override.can_publish_audio === false) {
    return {
      participantRole: "listener" as ParticipantRole,
      canPublishAudio: false,
    };
  }

  return {
    participantRole: baseRole,
    canPublishAudio: baseCanPublishAudio,
  };
}

export async function POST(request: Request) {
  const admin = createAdminClient();
  const supabase = await createClient();

  const credentials = getLiveKitCredentials();

  if (!credentials.apiKey || !credentials.apiSecret || !credentials.wsUrl) {
    return NextResponse.json(
      {
        success: false,
        error:
          "LiveKit non configurato. Imposta LIVEKIT_API_KEY, LIVEKIT_API_SECRET e LIVEKIT_WS_URL.",
      },
      { status: 500 }
    );
  }

  let body: TokenRequestBody;

  try {
    body = (await request.json()) as TokenRequestBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Payload non valido." },
      { status: 400 }
    );
  }

  const liveEventId = cleanUuid(body.liveEventId);
  const password = cleanText(body.password, 200);
  const privateToken = cleanUuid(body.privateToken);
  const inviteToken = cleanUuid(body.inviteToken);
  const displayName = cleanText(body.displayName, 80);
  const sessionId = cleanSessionId(body.sessionId);

  if (!liveEventId) {
    return NextResponse.json(
      { success: false, error: "Live guided visit ID mancante." },
      { status: 400 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || null;
  const userEmail = user?.email || null;

  const { data: profileData } = userId
    ? await admin
        .from("profiles")
        .select("id, email, display_name, full_name, role, plan")
        .eq("id", userId)
        .maybeSingle()
    : { data: null };

  const profile = (profileData || null) as unknown as Profile | null;

  const { data: liveEventData, error: liveEventError } = await admin
    .from("gallery_live_events")
    .select(
      [
        "id",
        "gallery_id",
        "gallery_event_id",
        "title",
        "description",
        "starts_at",
        "ends_at",
        "timezone",
        "access_mode",
        "password_hash",
        "private_token",
        "voice_mode",
        "is_active",
        "max_participants",
        "room_name",
      ].join(", ")
    )
    .eq("id", liveEventId)
    .maybeSingle();

  const liveEvent = (liveEventData || null) as unknown as LiveGuidedVisit | null;

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

  if (!liveEvent.is_active) {
    return NextResponse.json(
      { success: false, error: "Questa Live guided visit non è attiva." },
      { status: 403 }
    );
  }

  const { opensAt, closesAt, startsAt, endsAt } = getJoinWindow(liveEvent);
  const now = new Date();

  if (now < opensAt || now > closesAt) {
    return NextResponse.json(
      {
        success: false,
        error: "La Live guided visit non è disponibile in questo momento.",
        opensAt: opensAt.toISOString(),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        closesAt: closesAt.toISOString(),
      },
      { status: 403 }
    );
  }

  const { data: galleryData, error: galleryError } = await admin
    .from("galleries")
    .select("id, owner_id, title, slug, status")
    .eq("id", liveEvent.gallery_id)
    .maybeSingle();

  const gallery = (galleryData || null) as unknown as Gallery | null;

  if (galleryError || !gallery) {
    return NextResponse.json(
      {
        success: false,
        error: "Galleria collegata non trovata.",
        details: galleryError?.message || null,
      },
      { status: 404 }
    );
  }

  const { data: ownerProfileData } = await admin
    .from("profiles")
    .select("id, email, display_name, full_name, role, plan")
    .eq("id", gallery.owner_id)
    .maybeSingle();

  const ownerProfile = (ownerProfileData || null) as unknown as Profile | null;
  const ownerPlan = normalizePlanName(ownerProfile?.plan);

  const { data: settingsData } = await admin
    .from("gallery_live_settings")
    .select(
      "gallery_id, is_enabled, voice_enabled, institution_only, allow_guests, requires_login, owner_plan_required"
    )
    .eq("gallery_id", gallery.id)
    .maybeSingle();

  const settings = (settingsData || null) as unknown as LiveSettings | null;

  if (!isLiveSettingsEnabled(settings)) {
    return NextResponse.json(
      { success: false, error: "Le Live guided visits sono disattivate per questa galleria." },
      { status: 403 }
    );
  }

  const requiredPlan = normalizePlanName(
    settings?.owner_plan_required || (settings?.institution_only === false ? "free" : "institution")
  );

  if (requiredPlan === "institution" && ownerPlan !== "institution") {
    return NextResponse.json(
      {
        success: false,
        error: "Le Live guided visits sono disponibili solo per gallerie con piano Institution.",
      },
      { status: 403 }
    );
  }

  if (settings?.requires_login && !userId) {
    return NextResponse.json(
      { success: false, error: "Devi accedere per entrare in questa Live guided visit." },
      { status: 401 }
    );
  }

  if (settings?.allow_guests === false && !userId) {
    return NextResponse.json(
      { success: false, error: "Questa Live guided visit non consente accessi guest." },
      { status: 401 }
    );
  }

  let linkedCalendarEvent: GalleryEvent | null = null;

  if (liveEvent.gallery_event_id) {
    const { data: calendarEventData } = await admin
      .from("gallery_events")
      .select("id, gallery_id, owner_id, title, starts_at, ends_at, timezone, status")
      .eq("id", liveEvent.gallery_event_id)
      .maybeSingle();

    linkedCalendarEvent = (calendarEventData || null) as unknown as GalleryEvent | null;

    if (
      !linkedCalendarEvent ||
      linkedCalendarEvent.gallery_id !== gallery.id ||
      linkedCalendarEvent.status === "cancelled" ||
      linkedCalendarEvent.status === "completed"
    ) {
      return NextResponse.json(
        { success: false, error: "L'evento calendario collegato non è disponibile." },
        { status: 403 }
      );
    }
  }

  const isAdmin = profile?.role === "admin";
  const isOwner = Boolean(userId && userId === gallery.owner_id);

  const { data: moderatorData } = userId
    ? await admin
        .from("gallery_live_moderators")
        .select("role")
        .eq("gallery_id", gallery.id)
        .eq("user_id", userId)
        .maybeSingle()
    : { data: null };

  const moderator = (moderatorData || null) as unknown as ModeratorRow | null;
  const moderatorRole = moderator?.role || null;

  if (
    await isBlocked({
      admin,
      galleryId: gallery.id,
      userId,
      email: userEmail || profile?.email || null,
    })
  ) {
    return NextResponse.json(
      { success: false, error: "Non puoi entrare in questa Live guided visit." },
      { status: 403 }
    );
  }

  const accessMode = normalizeAccessMode(liveEvent.access_mode);
  const voiceMode = normalizeVoiceMode(liveEvent.voice_mode);
  const privileged = isPrivileged({ isAdmin, isOwner, moderatorRole });

  const invite = await findInvite({
    admin,
    liveEventId: liveEvent.id,
    inviteToken,
    userId,
    email: userEmail || profile?.email || null,
  });

  const inviteRole = getRoleFromInvite(invite);

  if (accessMode === "password" && !privileged && !inviteRole) {
    const passwordIsValid = verifyLivePassword(password, liveEvent.password_hash);

    if (!passwordIsValid) {
      return NextResponse.json(
        { success: false, error: "Password Live guided visit non valida." },
        { status: 403 }
      );
    }
  }

  if (accessMode === "private_link" && !privileged && !inviteRole) {
    if (!privateToken || privateToken !== liveEvent.private_token) {
      return NextResponse.json(
        { success: false, error: "Link privato Live guided visit non valido." },
        { status: 403 }
      );
    }
  }

  if (accessMode === "invite_only" && !privileged && !inviteRole) {
    return NextResponse.json(
      { success: false, error: "Questa Live guided visit è solo su invito." },
      { status: 403 }
    );
  }

  const baseParticipantRole = getParticipantRole({
    isAdmin,
    isOwner,
    moderatorRole,
    inviteRole,
    voiceMode,
  });

  const baseCanPublishAudio = canPublishAudioForRole(baseParticipantRole, voiceMode);
  const participantIdentity = getParticipantIdentity(userId, sessionId);
  const participantOverride = await findParticipantOverride({
    admin,
    liveEventId: liveEvent.id,
    userId,
    participantIdentity,
  });

  const { participantRole, canPublishAudio } = applyParticipantOverride({
    baseRole: baseParticipantRole,
    baseCanPublishAudio,
    override: participantOverride,
  });

  const participantName = getProfileDisplayName(profile, displayName);
  const roomName = liveEvent.room_name || buildFallbackRoomName(gallery.id, liveEvent.id);
  const tokenTtl = calculateTokenTtlSeconds(liveEvent);

  const metadata = {
    kind: "live_guided_visit",
    galleryId: gallery.id,
    gallerySlug: gallery.slug,
    liveEventId: liveEvent.id,
    galleryEventId: liveEvent.gallery_event_id,
    role: participantRole,
    canPublishAudio,
    accessMode,
    voiceMode,
    profileId: userId,
  };

  const accessToken = new AccessToken(credentials.apiKey, credentials.apiSecret, {
    identity: participantIdentity,
    name: participantName,
    ttl: tokenTtl,
    metadata: JSON.stringify(metadata),
  });

  accessToken.addGrant({
    roomJoin: true,
    room: roomName,
    canSubscribe: true,
    canPublish: canPublishAudio,
    canPublishData: true,
  });

  const token = await accessToken.toJwt();

  if (
    linkedCalendarEvent &&
    linkedCalendarEvent.status === "scheduled" &&
    now >= startsAt &&
    now <= endsAt
  ) {
    await admin
      .from("gallery_events")
      .update({
        status: "live",
        updated_at: now.toISOString(),
      })
      .eq("id", linkedCalendarEvent.id);
  }

  return NextResponse.json({
    success: true,
    token,
    wsUrl: credentials.wsUrl,
    roomName,
    participantIdentity,
    participantName,
    participantRole,
    canPublishAudio,
    accessMode,
    voiceMode,
    liveEvent: {
      id: liveEvent.id,
      title: liveEvent.title,
      startsAt: liveEvent.starts_at,
      endsAt: liveEvent.ends_at,
      timezone: liveEvent.timezone || "Europe/Rome",
      maxParticipants: liveEvent.max_participants,
    },
    gallery: {
      id: gallery.id,
      title: gallery.title,
      slug: gallery.slug,
    },
  });
}
