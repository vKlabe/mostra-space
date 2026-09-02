import { NextResponse } from "next/server";
import { getConversationAccess, getDirectRequestContext } from "@/lib/messages/directMessages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function PATCH(_request: Request, context: RouteContext) {
  const { conversationId } = await context.params;
  const { admin, user } = await getDirectRequestContext();

  if (!user) return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });

  const access = await getConversationAccess(admin, conversationId, user.id);
  if (!access) return NextResponse.json({ success: false, code: "CONVERSATION_NOT_FOUND" }, { status: 404 });

  const { error } = await admin
    .from("direct_conversation_members")
    .update({ hidden_at: new Date().toISOString() })
    .eq("id", access.selfMember.id);

  if (error) return NextResponse.json({ success: false, code: "SAVE_FAILED" }, { status: 500 });

  return NextResponse.json({ success: true });
}
