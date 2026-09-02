import { NextResponse } from "next/server";
import {
  DIRECT_MESSAGES_TERMS_VERSION,
  cleanText,
  getDirectRequestContext,
  getMessagingSettings,
  getOrCreateConversation,
} from "@/lib/messages/directMessages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ConversationPayload = {
  profileId?: unknown;
};

export async function POST(request: Request) {
  const { admin, user } = await getDirectRequestContext();

  if (!user) {
    return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  const ownSettings = await getMessagingSettings(admin, user.id);

  if (!ownSettings || ownSettings.terms_version !== DIRECT_MESSAGES_TERMS_VERSION) {
    return NextResponse.json(
      { success: false, code: "MESSAGING_NOT_ENABLED_SELF" },
      { status: 409 }
    );
  }

  let body: ConversationPayload;

  try {
    body = (await request.json()) as ConversationPayload;
  } catch {
    return NextResponse.json({ success: false, code: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const profileId = cleanText(body.profileId);

  if (!profileId) {
    return NextResponse.json({ success: false, code: "INVALID_TARGET" }, { status: 400 });
  }

  const result = await getOrCreateConversation(admin, user.id, profileId);

  if (!result.ok || !result.conversationId) {
    const status =
      result.code === "MESSAGING_NOT_ENABLED_PEER" ||
      result.code === "MUTUAL_FOLLOW_REQUIRED" ||
      result.code === "MESSAGING_BLOCKED"
        ? 403
        : 500;

    return NextResponse.json({ success: false, code: result.code }, { status });
  }

  return NextResponse.json({
    success: true,
    conversationId: result.conversationId,
  });
}
