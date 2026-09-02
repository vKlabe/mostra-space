import { NextResponse } from "next/server";
import {
  type DirectMessageRow,
  type DirectMessagingSettingsRow,
  type DirectProfileRow,
  canDirectMessage,
  getConversationAccess,
  getDirectDisplayName,
  getDirectProfile,
  getDirectRequestContext,
  getMessagingSettings,
} from "@/lib/messages/directMessages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ conversationId: string }>;
};

type VisibilityRow = { message_id: string };

export async function GET(_request: Request, context: RouteContext) {
  const { conversationId } = await context.params;
  const { admin, user } = await getDirectRequestContext();

  if (!user) {
    return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  const access = await getConversationAccess(admin, conversationId, user.id);

  if (!access) {
    return NextResponse.json({ success: false, code: "CONVERSATION_NOT_FOUND" }, { status: 404 });
  }

  await admin
    .from("direct_conversation_members")
    .update({ hidden_at: null })
    .eq("id", access.selfMember.id);

  await admin
    .from("direct_messages")
    .update({ delivered_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("recipient_member_id", access.selfMember.id)
    .is("delivered_at", null);

  const [{ data: messageRows }, { data: visibilityRows }] = await Promise.all([
    admin
      .from("direct_messages")
      .select(
        "id, conversation_id, sender_member_id, recipient_member_id, body, delivered_at, read_at, withdrawn_at, created_at"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(300),
    admin
      .from("direct_message_visibility")
      .select("message_id")
      .eq("member_id", access.selfMember.id),
  ]);

  const hiddenIds = new Set(
    ((visibilityRows || []) as VisibilityRow[]).map((row) => row.message_id)
  );
  const messages = ((messageRows || []) as DirectMessageRow[]).filter(
    (message) => !hiddenIds.has(message.id)
  );

  let peerSettings: DirectMessagingSettingsRow | null = null;
  let peerProfile: DirectProfileRow | null = null;

  if (access.peerMember.profile_id) {
    [peerSettings, peerProfile] = await Promise.all([
      getMessagingSettings(admin, access.peerMember.profile_id),
      getDirectProfile(admin, access.peerMember.profile_id),
    ]);
  }

  const eligibility = access.peerMember.profile_id
    ? await canDirectMessage(admin, user.id, access.peerMember.profile_id)
    : {
        allowed: false,
        code: "PROFILE_NOT_FOUND" as const,
        blockedByMe: false,
        blockedByThem: false,
      };

  return NextResponse.json({
    success: true,
    conversation: {
      id: conversationId,
      selfMemberId: access.selfMember.id,
      peer: {
        profileId: access.peerMember.profile_id,
        displayName: peerProfile
          ? getDirectDisplayName(peerProfile)
          : access.peerMember.display_name_snapshot,
        deleted: !access.peerMember.profile_id,
        avatarUrl: peerProfile?.avatar_url ?? access.peerMember.avatar_url_snapshot,
        profileSlug: peerProfile?.profile_slug ?? access.peerMember.profile_slug_snapshot,
      },
      muted: Boolean(access.selfMember.muted_at),
      canSend: eligibility.allowed,
      blockState: {
        blockedByMe: eligibility.blockedByMe,
      },
      reasonCode:
        eligibility.allowed
          ? null
          : eligibility.code === "MESSAGING_BLOCKED" && !eligibility.blockedByMe
            ? "MESSAGING_UNAVAILABLE"
            : eligibility.code,
    },
    messages: messages.map((message) => {
      const mine = message.sender_member_id === access.selfMember.id;
      return {
        id: message.id,
        body: message.withdrawn_at ? null : message.body,
        mine,
        deliveredAt: message.delivered_at,
        readAt:
          mine && peerSettings?.read_receipts_enabled === false
            ? null
            : message.read_at,
        withdrawnAt: message.withdrawn_at,
        createdAt: message.created_at,
        canWithdraw:
          mine &&
          !message.withdrawn_at &&
          Date.now() - new Date(message.created_at).getTime() <= 15 * 60 * 1000,
      };
    }),
  });
}
