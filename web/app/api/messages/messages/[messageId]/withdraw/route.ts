import { NextResponse } from "next/server";
import {
  DIRECT_MESSAGE_RETENTION_DAYS,
  DIRECT_MESSAGE_WITHDRAW_MINUTES,
  getConversationAccess,
  getDirectRequestContext,
} from "@/lib/messages/directMessages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ messageId: string }> };

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_member_id: string;
  body: string | null;
  withdrawn_at: string | null;
  created_at: string;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const { messageId } = await context.params;
  const { admin, user } = await getDirectRequestContext();

  if (!user) return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });

  const { data: message } = await admin
    .from("direct_messages")
    .select("id, conversation_id, sender_member_id, body, withdrawn_at, created_at")
    .eq("id", messageId)
    .maybeSingle<MessageRow>();

  if (!message) return NextResponse.json({ success: false, code: "MESSAGE_NOT_FOUND" }, { status: 404 });

  const access = await getConversationAccess(admin, message.conversation_id, user.id);
  if (!access || message.sender_member_id !== access.selfMember.id) {
    return NextResponse.json({ success: false, code: "FORBIDDEN" }, { status: 403 });
  }

  if (message.withdrawn_at || !message.body) {
    return NextResponse.json({ success: true, alreadyWithdrawn: true });
  }

  const ageMs = Date.now() - new Date(message.created_at).getTime();
  if (ageMs < 0 || ageMs > DIRECT_MESSAGE_WITHDRAW_MINUTES * 60 * 1000) {
    return NextResponse.json({ success: false, code: "WITHDRAW_WINDOW_EXPIRED" }, { status: 409 });
  }

  const retainedUntil = new Date(
    Date.now() + DIRECT_MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error: retentionError } = await admin
    .from("direct_message_retention")
    .upsert(
      {
        message_id: message.id,
        original_body: message.body,
        retained_until: retainedUntil,
      },
      { onConflict: "message_id" }
    );

  if (retentionError) {
    return NextResponse.json({ success: false, code: "WITHDRAW_FAILED" }, { status: 500 });
  }

  const withdrawnAt = new Date().toISOString();
  const { error: updateError } = await admin
    .from("direct_messages")
    .update({ body: null, withdrawn_at: withdrawnAt })
    .eq("id", message.id)
    .is("withdrawn_at", null);

  if (updateError) {
    await admin.from("direct_message_retention").delete().eq("message_id", message.id);
    return NextResponse.json({ success: false, code: "WITHDRAW_FAILED" }, { status: 500 });
  }

  await admin.from("direct_moderation_audit_logs").insert({
    actor_profile_id: user.id,
    action: "message_withdrawn",
    conversation_id: message.conversation_id,
    message_id: message.id,
    details: { retained_until: retainedUntil },
  });

  return NextResponse.json({ success: true, withdrawnAt });
}
