import { NextResponse } from "next/server";
import { getConversationAccess, getDirectRequestContext } from "@/lib/messages/directMessages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ messageId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { messageId } = await context.params;
  const { admin, user } = await getDirectRequestContext();

  if (!user) return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });

  const { data: message } = await admin
    .from("direct_messages")
    .select("id, conversation_id")
    .eq("id", messageId)
    .maybeSingle<{ id: string; conversation_id: string }>();

  if (!message) return NextResponse.json({ success: false, code: "MESSAGE_NOT_FOUND" }, { status: 404 });

  const access = await getConversationAccess(admin, message.conversation_id, user.id);
  if (!access) return NextResponse.json({ success: false, code: "FORBIDDEN" }, { status: 403 });

  const { error } = await admin.from("direct_message_visibility").upsert(
    {
      message_id: messageId,
      member_id: access.selfMember.id,
      hidden_at: new Date().toISOString(),
    },
    { onConflict: "message_id,member_id" }
  );

  if (error) return NextResponse.json({ success: false, code: "SAVE_FAILED" }, { status: 500 });

  return NextResponse.json({ success: true });
}
