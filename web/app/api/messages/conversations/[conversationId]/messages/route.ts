import { NextResponse } from "next/server";
import {
  DIRECT_MESSAGE_MAX_LENGTH,
  DIRECT_MESSAGE_MIN_INTERVAL_MS,
  DIRECT_MESSAGE_RATE_LIMIT,
  DIRECT_MESSAGE_RATE_WINDOW_SECONDS,
  canDirectMessage,
  cleanMessageBody,
  getConversationAccess,
  getDirectRequestContext,
  secondsAgo,
} from "@/lib/messages/directMessages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ conversationId: string }>;
};

type SendPayload = { body?: unknown };

type RecentRow = { id: string; body: string | null; created_at: string };

export async function POST(request: Request, context: RouteContext) {
  const { conversationId } = await context.params;
  const { admin, user } = await getDirectRequestContext();

  if (!user) {
    return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  const access = await getConversationAccess(admin, conversationId, user.id);

  if (!access) {
    return NextResponse.json({ success: false, code: "CONVERSATION_NOT_FOUND" }, { status: 404 });
  }

  if (!access.peerMember.profile_id) {
    return NextResponse.json({ success: false, code: "PEER_DELETED" }, { status: 403 });
  }

  const eligibility = await canDirectMessage(
    admin,
    user.id,
    access.peerMember.profile_id
  );

  if (!eligibility.allowed) {
    return NextResponse.json({ success: false, code: eligibility.code }, { status: 403 });
  }

  let payload: SendPayload;

  try {
    payload = (await request.json()) as SendPayload;
  } catch {
    return NextResponse.json({ success: false, code: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const body = cleanMessageBody(payload.body);

  if (!body || body.length > DIRECT_MESSAGE_MAX_LENGTH) {
    return NextResponse.json({ success: false, code: "INVALID_MESSAGE" }, { status: 400 });
  }

  const { data: recentRows, error: recentError } = await admin
    .from("direct_messages")
    .select("id, body, created_at")
    .eq("sender_member_id", access.selfMember.id)
    .gte("created_at", secondsAgo(DIRECT_MESSAGE_RATE_WINDOW_SECONDS))
    .order("created_at", { ascending: false })
    .limit(10);

  if (recentError) {
    return NextResponse.json({ success: false, code: "SEND_FAILED" }, { status: 500 });
  }

  const recent = (recentRows || []) as RecentRow[];

  if (recent.length >= DIRECT_MESSAGE_RATE_LIMIT) {
    return NextResponse.json({ success: false, code: "RATE_LIMIT" }, { status: 429 });
  }

  const last = recent[0];
  if (last) {
    const delta = Date.now() - new Date(last.created_at).getTime();
    if (delta >= 0 && delta < DIRECT_MESSAGE_MIN_INTERVAL_MS) {
      return NextResponse.json({ success: false, code: "RATE_LIMIT" }, { status: 429 });
    }

    if (last.body === body && delta >= 0 && delta < 30_000) {
      return NextResponse.json({ success: false, code: "DUPLICATE_MESSAGE" }, { status: 429 });
    }
  }

  const { data: inserted, error } = await admin
    .from("direct_messages")
    .insert({
      conversation_id: conversationId,
      sender_member_id: access.selfMember.id,
      recipient_member_id: access.peerMember.id,
      body,
    })
    .select(
      "id, conversation_id, sender_member_id, recipient_member_id, body, delivered_at, read_at, withdrawn_at, created_at"
    )
    .single();

  if (error || !inserted) {
    return NextResponse.json({ success: false, code: "SEND_FAILED" }, { status: 500 });
  }

  await Promise.all([
    admin
      .from("direct_conversation_members")
      .update({ hidden_at: null })
      .eq("id", access.selfMember.id),
    admin
      .from("direct_conversation_members")
      .update({ hidden_at: null })
      .eq("id", access.peerMember.id),
  ]);

  return NextResponse.json({
    success: true,
    message: {
      id: inserted.id,
      body: inserted.body,
      mine: true,
      deliveredAt: inserted.delivered_at,
      readAt: inserted.read_at,
      withdrawnAt: inserted.withdrawn_at,
      createdAt: inserted.created_at,
      canWithdraw: true,
    },
  });
}
