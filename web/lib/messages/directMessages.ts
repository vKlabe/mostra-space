import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const DIRECT_MESSAGES_TERMS_VERSION = "messaging-v1-2026-09-02";
export const DIRECT_MESSAGE_MAX_LENGTH = 2000;
export const DIRECT_MESSAGE_WITHDRAW_MINUTES = 15;
export const DIRECT_MESSAGE_RETENTION_DAYS = 30;
export const DIRECT_MESSAGE_RATE_WINDOW_SECONDS = 10;
export const DIRECT_MESSAGE_RATE_LIMIT = 5;
export const DIRECT_MESSAGE_MIN_INTERVAL_MS = 800;

export type DirectProfileRow = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  profile_slug: string | null;
  public_profile_enabled: boolean;
};

export type DirectMessagingSettingsRow = {
  user_id: string;
  enabled_at: string;
  adult_confirmed_at: string;
  terms_accepted_at: string;
  terms_version: string;
  read_receipts_enabled: boolean;
};

export type ConversationMemberRow = {
  id: string;
  conversation_id: string;
  profile_id: string | null;
  display_name_snapshot: string;
  avatar_url_snapshot: string | null;
  profile_slug_snapshot: string | null;
  hidden_at: string | null;
  muted_at: string | null;
  created_at: string;
};

export type DirectMessageRow = {
  id: string;
  conversation_id: string;
  sender_member_id: string;
  recipient_member_id: string;
  body: string | null;
  delivered_at: string | null;
  read_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
};

export type DirectConversationAccess = {
  conversationId: string;
  selfMember: ConversationMemberRow;
  peerMember: ConversationMemberRow;
};

export function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function cleanMessageBody(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\r\n/g, "\n").trim();
}

export function getDirectDisplayName(profile: DirectProfileRow | null | undefined) {
  return (
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    profile?.email?.split("@")[0]?.trim() ||
    "Profilo mostra.space"
  );
}

export function buildDirectPairKey(firstProfileId: string, secondProfileId: string) {
  const ordered = [firstProfileId, secondProfileId].sort().join(":");
  return crypto.createHash("sha256").update(`mostraspace-direct:${ordered}`).digest("hex");
}

export function secondsAgo(seconds: number) {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

export async function getDirectRequestContext() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, admin, user };
}

export async function getDirectProfile(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string
) {
  const { data } = await admin
    .from("profiles")
    .select(
      "id, display_name, full_name, email, avatar_url, profile_slug, public_profile_enabled"
    )
    .eq("id", profileId)
    .maybeSingle<DirectProfileRow>();

  return data || null;
}

export async function getMessagingSettings(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string
) {
  const { data } = await admin
    .from("direct_messaging_settings")
    .select(
      "user_id, enabled_at, adult_confirmed_at, terms_accepted_at, terms_version, read_receipts_enabled"
    )
    .eq("user_id", profileId)
    .maybeSingle<DirectMessagingSettingsRow>();

  return data || null;
}

export async function hasMutualFollow(
  admin: ReturnType<typeof createAdminClient>,
  firstProfileId: string,
  secondProfileId: string
) {
  const [{ data: firstToSecond }, { data: secondToFirst }] = await Promise.all([
    admin
      .from("account_follows")
      .select("follower_id")
      .eq("follower_id", firstProfileId)
      .eq("following_id", secondProfileId)
      .maybeSingle(),
    admin
      .from("account_follows")
      .select("follower_id")
      .eq("follower_id", secondProfileId)
      .eq("following_id", firstProfileId)
      .maybeSingle(),
  ]);

  return Boolean(firstToSecond && secondToFirst);
}

export async function getBlockState(
  admin: ReturnType<typeof createAdminClient>,
  currentProfileId: string,
  otherProfileId: string
) {
  const [{ data: byMe }, { data: byThem }] = await Promise.all([
    admin
      .from("direct_user_blocks")
      .select("blocker_id")
      .eq("blocker_id", currentProfileId)
      .eq("blocked_id", otherProfileId)
      .maybeSingle(),
    admin
      .from("direct_user_blocks")
      .select("blocker_id")
      .eq("blocker_id", otherProfileId)
      .eq("blocked_id", currentProfileId)
      .maybeSingle(),
  ]);

  return {
    blockedByMe: Boolean(byMe),
    blockedByThem: Boolean(byThem),
    blocked: Boolean(byMe || byThem),
  };
}

export async function canDirectMessage(
  admin: ReturnType<typeof createAdminClient>,
  currentProfileId: string,
  otherProfileId: string
) {
  if (!currentProfileId || !otherProfileId || currentProfileId === otherProfileId) {
    return {
      allowed: false,
      code: "INVALID_TARGET" as const,
      blockedByMe: false,
      blockedByThem: false,
    };
  }

  const [currentSettings, otherSettings, mutualFollow, blockState] =
    await Promise.all([
      getMessagingSettings(admin, currentProfileId),
      getMessagingSettings(admin, otherProfileId),
      hasMutualFollow(admin, currentProfileId, otherProfileId),
      getBlockState(admin, currentProfileId, otherProfileId),
    ]);

  if (!currentSettings || currentSettings.terms_version !== DIRECT_MESSAGES_TERMS_VERSION) {
    return {
      allowed: false,
      code: "MESSAGING_NOT_ENABLED_SELF" as const,
      ...blockState,
    };
  }

  if (!otherSettings || otherSettings.terms_version !== DIRECT_MESSAGES_TERMS_VERSION) {
    return {
      allowed: false,
      code: "MESSAGING_NOT_ENABLED_PEER" as const,
      ...blockState,
    };
  }

  if (blockState.blocked) {
    return {
      allowed: false,
      code: "MESSAGING_BLOCKED" as const,
      ...blockState,
    };
  }

  if (!mutualFollow) {
    return {
      allowed: false,
      code: "MUTUAL_FOLLOW_REQUIRED" as const,
      ...blockState,
    };
  }

  return {
    allowed: true,
    code: "OK" as const,
    ...blockState,
  };
}

export async function getConversationAccess(
  admin: ReturnType<typeof createAdminClient>,
  conversationId: string,
  currentProfileId: string
): Promise<DirectConversationAccess | null> {
  const { data: selfMember } = await admin
    .from("direct_conversation_members")
    .select(
      "id, conversation_id, profile_id, display_name_snapshot, avatar_url_snapshot, profile_slug_snapshot, hidden_at, muted_at, created_at"
    )
    .eq("conversation_id", conversationId)
    .eq("profile_id", currentProfileId)
    .maybeSingle<ConversationMemberRow>();

  if (!selfMember) {
    return null;
  }

  const { data: members } = await admin
    .from("direct_conversation_members")
    .select(
      "id, conversation_id, profile_id, display_name_snapshot, avatar_url_snapshot, profile_slug_snapshot, hidden_at, muted_at, created_at"
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const peerMember = ((members || []) as ConversationMemberRow[]).find(
    (member) => member.id !== selfMember.id
  );

  if (!peerMember) {
    return null;
  }

  return {
    conversationId,
    selfMember,
    peerMember,
  };
}

async function ensureConversationMembers({
  admin,
  conversationId,
  currentProfile,
  targetProfile,
}: {
  admin: ReturnType<typeof createAdminClient>;
  conversationId: string;
  currentProfile: DirectProfileRow;
  targetProfile: DirectProfileRow;
}) {
  const { data: rows } = await admin
    .from("direct_conversation_members")
    .select("profile_id")
    .eq("conversation_id", conversationId);

  const existingIds = new Set(
    ((rows || []) as Array<{ profile_id: string | null }>)
      .map((row) => row.profile_id)
      .filter((value): value is string => Boolean(value))
  );

  const missing: Array<Record<string, unknown>> = [];

  if (!existingIds.has(currentProfile.id)) {
    missing.push({
      conversation_id: conversationId,
      profile_id: currentProfile.id,
      display_name_snapshot: getDirectDisplayName(currentProfile),
      avatar_url_snapshot: currentProfile.avatar_url,
      profile_slug_snapshot: currentProfile.profile_slug,
    });
  }

  if (!existingIds.has(targetProfile.id)) {
    missing.push({
      conversation_id: conversationId,
      profile_id: targetProfile.id,
      display_name_snapshot: getDirectDisplayName(targetProfile),
      avatar_url_snapshot: targetProfile.avatar_url,
      profile_slug_snapshot: targetProfile.profile_slug,
    });
  }

  if (missing.length > 0) {
    const { error } = await admin
      .from("direct_conversation_members")
      .insert(missing);

    if (error && error.code !== "23505") {
      return false;
    }
  }

  await Promise.all([
    admin
      .from("direct_conversation_members")
      .update({
        display_name_snapshot: getDirectDisplayName(currentProfile),
        avatar_url_snapshot: currentProfile.avatar_url,
        profile_slug_snapshot: currentProfile.profile_slug,
        hidden_at: null,
      })
      .eq("conversation_id", conversationId)
      .eq("profile_id", currentProfile.id),
    admin
      .from("direct_conversation_members")
      .update({
        display_name_snapshot: getDirectDisplayName(targetProfile),
        avatar_url_snapshot: targetProfile.avatar_url,
        profile_slug_snapshot: targetProfile.profile_slug,
      })
      .eq("conversation_id", conversationId)
      .eq("profile_id", targetProfile.id),
  ]);

  return true;
}

export async function getOrCreateConversation(
  admin: ReturnType<typeof createAdminClient>,
  currentProfileId: string,
  targetProfileId: string
) {
  const eligibility = await canDirectMessage(
    admin,
    currentProfileId,
    targetProfileId
  );

  if (!eligibility.allowed) {
    return {
      ok: false as const,
      code: eligibility.code,
      conversationId: null,
    };
  }

  const [currentProfile, targetProfile] = await Promise.all([
    getDirectProfile(admin, currentProfileId),
    getDirectProfile(admin, targetProfileId),
  ]);

  if (!currentProfile || !targetProfile) {
    return {
      ok: false as const,
      code: "PROFILE_NOT_FOUND" as const,
      conversationId: null,
    };
  }

  const pairKey = buildDirectPairKey(currentProfileId, targetProfileId);

  const { data: existingConversation } = await admin
    .from("direct_conversations")
    .select("id")
    .eq("pair_key", pairKey)
    .maybeSingle<{ id: string }>();

  if (existingConversation?.id) {
    const membersReady = await ensureConversationMembers({
      admin,
      conversationId: existingConversation.id,
      currentProfile,
      targetProfile,
    });

    if (!membersReady) {
      return {
        ok: false as const,
        code: "CREATE_FAILED" as const,
        conversationId: null,
      };
    }

    return {
      ok: true as const,
      code: "OK" as const,
      conversationId: existingConversation.id,
    };
  }

  const { data: insertedConversation, error: insertConversationError } =
    await admin
      .from("direct_conversations")
      .insert({ pair_key: pairKey })
      .select("id")
      .single<{ id: string }>();

  if (insertConversationError || !insertedConversation) {
    if (insertConversationError?.code === "23505") {
      const { data: racedConversation } = await admin
        .from("direct_conversations")
        .select("id")
        .eq("pair_key", pairKey)
        .maybeSingle<{ id: string }>();

      if (racedConversation?.id) {
        const membersReady = await ensureConversationMembers({
          admin,
          conversationId: racedConversation.id,
          currentProfile,
          targetProfile,
        });

        if (membersReady) {
          return {
            ok: true as const,
            code: "OK" as const,
            conversationId: racedConversation.id,
          };
        }
      }
    }

    return {
      ok: false as const,
      code: "CREATE_FAILED" as const,
      conversationId: null,
    };
  }

  const conversationId = insertedConversation.id;
  const currentName = getDirectDisplayName(currentProfile);
  const targetName = getDirectDisplayName(targetProfile);

  const { error: membersError } = await admin
    .from("direct_conversation_members")
    .insert([
      {
        conversation_id: conversationId,
        profile_id: currentProfileId,
        display_name_snapshot: currentName,
        avatar_url_snapshot: currentProfile.avatar_url,
        profile_slug_snapshot: currentProfile.profile_slug,
      },
      {
        conversation_id: conversationId,
        profile_id: targetProfileId,
        display_name_snapshot: targetName,
        avatar_url_snapshot: targetProfile.avatar_url,
        profile_slug_snapshot: targetProfile.profile_slug,
      },
    ]);

  if (membersError) {
    await admin.from("direct_conversations").delete().eq("id", conversationId);

    return {
      ok: false as const,
      code: "CREATE_FAILED" as const,
      conversationId: null,
    };
  }

  return {
    ok: true as const,
    code: "OK" as const,
    conversationId,
  };
}

export async function purgeExpiredDirectRetention(
  admin: ReturnType<typeof createAdminClient>
) {
  try {
    await admin.rpc("purge_expired_direct_message_retention");
  } catch {
    // Retention cleanup is best-effort and must never break messaging availability.
  }
}
