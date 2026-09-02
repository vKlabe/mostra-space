import { NextResponse } from "next/server";
import {
  DIRECT_MESSAGES_TERMS_VERSION,
  type ConversationMemberRow,
  type DirectMessageRow,
  type DirectMessagingSettingsRow,
  type DirectProfileRow,
  getDirectDisplayName,
  getDirectRequestContext,
  getMessagingSettings,
  purgeExpiredDirectRetention,
} from "@/lib/messages/directMessages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ConversationRow = {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
};

type VisibilityRow = {
  message_id: string;
  member_id: string;
};

export async function GET() {
  const { admin, user } = await getDirectRequestContext();

  if (!user) {
    return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  await purgeExpiredDirectRetention(admin);

  const ownSettings = await getMessagingSettings(admin, user.id);

  if (!ownSettings || ownSettings.terms_version !== DIRECT_MESSAGES_TERMS_VERSION) {
    return NextResponse.json({
      success: true,
      activationRequired: true,
      unreadCount: 0,
      unreadMessageIds: [],
      conversations: [],
      contacts: [],
      settings: null,
    });
  }

  const { data: selfMembersData } = await admin
    .from("direct_conversation_members")
    .select(
      "id, conversation_id, profile_id, display_name_snapshot, avatar_url_snapshot, profile_slug_snapshot, hidden_at, muted_at, created_at"
    )
    .eq("profile_id", user.id);

  const selfMembers = (selfMembersData || []) as ConversationMemberRow[];
  const selfMemberIds = selfMembers.map((member) => member.id);
  const conversationIds = selfMembers.map((member) => member.conversation_id);

  if (selfMemberIds.length > 0) {
    await admin
      .from("direct_messages")
      .update({ delivered_at: new Date().toISOString() })
      .in("recipient_member_id", selfMemberIds)
      .is("delivered_at", null);
  }

  let conversations: ConversationRow[] = [];
  let allMembers: ConversationMemberRow[] = [];
  let recentMessages: DirectMessageRow[] = [];
  let hiddenRows: VisibilityRow[] = [];

  if (conversationIds.length > 0) {
    const [conversationResult, memberResult, messageResult, visibilityResult] =
      await Promise.all([
        admin
          .from("direct_conversations")
          .select("id, created_at, updated_at, last_message_at")
          .in("id", conversationIds)
          .order("last_message_at", { ascending: false, nullsFirst: false }),
        admin
          .from("direct_conversation_members")
          .select(
            "id, conversation_id, profile_id, display_name_snapshot, avatar_url_snapshot, profile_slug_snapshot, hidden_at, muted_at, created_at"
          )
          .in("conversation_id", conversationIds),
        admin
          .from("direct_messages")
          .select(
            "id, conversation_id, sender_member_id, recipient_member_id, body, delivered_at, read_at, withdrawn_at, created_at"
          )
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
          .limit(500),
        selfMemberIds.length > 0
          ? admin
              .from("direct_message_visibility")
              .select("message_id, member_id")
              .in("member_id", selfMemberIds)
          : Promise.resolve({ data: [] }),
      ]);

    conversations = (conversationResult.data || []) as ConversationRow[];
    allMembers = (memberResult.data || []) as ConversationMemberRow[];
    recentMessages = (messageResult.data || []) as DirectMessageRow[];
    hiddenRows = (visibilityResult.data || []) as VisibilityRow[];
  }

  const selfMemberByConversation = new Map(
    selfMembers.map((member) => [member.conversation_id, member])
  );
  const hiddenMessageIds = new Set(hiddenRows.map((row) => row.message_id));
  const memberById = new Map(allMembers.map((member) => [member.id, member]));

  const unreadMessages = recentMessages.filter(
    (message) =>
      selfMemberIds.includes(message.recipient_member_id) &&
      !message.read_at &&
      !hiddenMessageIds.has(message.id)
  );
  const unreadMessageIds = unreadMessages.map((message) => message.id);

  const peerProfileIds = Array.from(
    new Set(
      allMembers
        .filter((member) => member.profile_id && member.profile_id !== user.id)
        .map((member) => member.profile_id as string)
    )
  );

  const [peerSettingsResult, peerProfilesResult] =
    peerProfileIds.length > 0
      ? await Promise.all([
          admin
            .from("direct_messaging_settings")
            .select(
              "user_id, enabled_at, adult_confirmed_at, terms_accepted_at, terms_version, read_receipts_enabled"
            )
            .in("user_id", peerProfileIds),
          admin
            .from("profiles")
            .select(
              "id, display_name, full_name, email, avatar_url, profile_slug, public_profile_enabled"
            )
            .in("id", peerProfileIds),
        ])
      : [{ data: [] }, { data: [] }];

  const peerSettingsById = new Map(
    ((peerSettingsResult.data || []) as DirectMessagingSettingsRow[]).map((settings) => [
      settings.user_id,
      settings,
    ])
  );
  const peerProfileById = new Map(
    ((peerProfilesResult.data || []) as DirectProfileRow[]).map((profile) => [
      profile.id,
      profile,
    ])
  );

  const conversationItems = conversations
    .map((conversation) => {
      const selfMember = selfMemberByConversation.get(conversation.id);
      if (!selfMember) return null;

      const peerMember = allMembers.find(
        (member) =>
          member.conversation_id === conversation.id && member.id !== selfMember.id
      );
      if (!peerMember) return null;

      const conversationMessages = recentMessages.filter(
        (message) =>
          message.conversation_id === conversation.id &&
          !hiddenMessageIds.has(message.id)
      );
      const latest = conversationMessages[0] || null;
      const unreadCount = conversationMessages.filter(
        (message) =>
          message.recipient_member_id === selfMember.id && !message.read_at
      ).length;

      if (selfMember.hidden_at && unreadCount === 0) {
        return null;
      }

      const peerSettings = peerMember.profile_id
        ? peerSettingsById.get(peerMember.profile_id)
        : null;
      const peerProfile = peerMember.profile_id
        ? peerProfileById.get(peerMember.profile_id)
        : null;

      return {
        id: conversation.id,
        peer: {
          profileId: peerMember.profile_id,
          displayName: peerProfile
            ? getDirectDisplayName(peerProfile)
            : peerMember.display_name_snapshot,
          deleted: !peerMember.profile_id,
          avatarUrl: peerProfile?.avatar_url ?? peerMember.avatar_url_snapshot,
          profileSlug: peerProfile?.profile_slug ?? peerMember.profile_slug_snapshot,
        },
        muted: Boolean(selfMember.muted_at),
        unreadCount,
        lastMessageAt: conversation.last_message_at || conversation.created_at,
        lastMessage: latest
          ? {
              id: latest.id,
              body: latest.withdrawn_at ? null : latest.body,
              withdrawnAt: latest.withdrawn_at,
              createdAt: latest.created_at,
              mine: latest.sender_member_id === selfMember.id,
              deliveredAt: latest.delivered_at,
              readAt:
                latest.sender_member_id === selfMember.id &&
                peerSettings?.read_receipts_enabled === false
                  ? null
                  : latest.read_at,
            }
          : null,
      };
    })
    .filter(Boolean);

  // Mutual-follow contacts who have opted into Messaging and are not blocked.
  const [{ data: outgoingRows }, { data: incomingRows }, { data: blockRows }] =
    await Promise.all([
      admin
        .from("account_follows")
        .select("following_id")
        .eq("follower_id", user.id),
      admin
        .from("account_follows")
        .select("follower_id")
        .eq("following_id", user.id),
      admin
        .from("direct_user_blocks")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
    ]);

  const outgoing = new Set(
    ((outgoingRows || []) as Array<{ following_id: string }>).map(
      (row) => row.following_id
    )
  );
  const incoming = new Set(
    ((incomingRows || []) as Array<{ follower_id: string }>).map(
      (row) => row.follower_id
    )
  );
  const blockedProfileIds = new Set<string>();

  for (const row of (blockRows || []) as Array<{
    blocker_id: string;
    blocked_id: string;
  }>) {
    if (row.blocker_id === user.id) blockedProfileIds.add(row.blocked_id);
    if (row.blocked_id === user.id) blockedProfileIds.add(row.blocker_id);
  }

  const mutualIds = Array.from(outgoing).filter(
    (profileId) => incoming.has(profileId) && !blockedProfileIds.has(profileId)
  );

  const [{ data: contactProfilesData }, { data: contactSettingsData }] =
    mutualIds.length > 0
      ? await Promise.all([
          admin
            .from("profiles")
            .select(
              "id, display_name, full_name, email, avatar_url, profile_slug, public_profile_enabled"
            )
            .in("id", mutualIds),
          admin
            .from("direct_messaging_settings")
            .select(
              "user_id, enabled_at, adult_confirmed_at, terms_accepted_at, terms_version, read_receipts_enabled"
            )
            .in("user_id", mutualIds),
        ])
      : [{ data: [] }, { data: [] }];

  const enabledContactIds = new Set(
    ((contactSettingsData || []) as DirectMessagingSettingsRow[])
      .filter((settings) => settings.terms_version === DIRECT_MESSAGES_TERMS_VERSION)
      .map((settings) => settings.user_id)
  );

  const existingConversationPeerIds = new Set(
    conversationItems
      .map((item) => item?.peer.profileId)
      .filter((value): value is string => Boolean(value))
  );

  const contacts = ((contactProfilesData || []) as DirectProfileRow[])
    .filter((profile) => enabledContactIds.has(profile.id))
    .map((profile) => ({
      profileId: profile.id,
      displayName: getDirectDisplayName(profile),
      avatarUrl: profile.avatar_url,
      profileSlug: profile.profile_slug,
      hasConversation: existingConversationPeerIds.has(profile.id),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const unreadAnnouncements = unreadMessages.slice(0, 50).map((message) => {
    const selfMember = memberById.get(message.recipient_member_id);
    const peerMember = selfMember
      ? allMembers.find(
          (member) =>
            member.conversation_id === message.conversation_id &&
            member.id !== selfMember.id
        )
      : null;

    return {
      messageId: message.id,
      conversationId: message.conversation_id,
      body: message.withdrawn_at ? null : message.body,
      createdAt: message.created_at,
      peerName: peerMember?.display_name_snapshot || null,
      muted: Boolean(selfMember?.muted_at),
    };
  });

  const latestUnread = unreadAnnouncements[0] || null;

  return NextResponse.json({
    success: true,
    activationRequired: false,
    unreadCount: unreadMessageIds.length,
    unreadMessageIds,
    latestUnread,
    unreadAnnouncements,
    conversations: conversationItems,
    contacts,
    settings: {
      readReceiptsEnabled: ownSettings.read_receipts_enabled,
      termsVersion: ownSettings.terms_version,
    },
  });
}
