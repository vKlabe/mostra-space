import { NextResponse } from "next/server";
import { cleanText, getConversationAccess, getDirectRequestContext } from "@/lib/messages/directMessages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedReasons = new Set([
  "harassment_threats",
  "hate_discrimination",
  "sexual_exploitation",
  "scam_phishing",
  "impersonation",
  "private_data",
  "spam",
  "illegal_activity",
  "other",
]);

type ReportPayload = {
  messageId?: unknown;
  reason?: unknown;
  note?: unknown;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_member_id: string;
  recipient_member_id: string;
  body: string | null;
  withdrawn_at: string | null;
  created_at: string;
};

export async function POST(request: Request) {
  const { admin, user } = await getDirectRequestContext();

  if (!user) return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });

  let payload: ReportPayload;
  try {
    payload = (await request.json()) as ReportPayload;
  } catch {
    return NextResponse.json({ success: false, code: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const messageId = cleanText(payload.messageId);
  const reason = cleanText(payload.reason);
  const note = cleanText(payload.note).slice(0, 1000) || null;

  if (!messageId || !allowedReasons.has(reason)) {
    return NextResponse.json({ success: false, code: "INVALID_REPORT" }, { status: 400 });
  }

  const { data: message } = await admin
    .from("direct_messages")
    .select(
      "id, conversation_id, sender_member_id, recipient_member_id, body, withdrawn_at, created_at"
    )
    .eq("id", messageId)
    .maybeSingle<MessageRow>();

  if (!message) return NextResponse.json({ success: false, code: "MESSAGE_NOT_FOUND" }, { status: 404 });

  const access = await getConversationAccess(admin, message.conversation_id, user.id);
  if (!access || message.sender_member_id === access.selfMember.id) {
    return NextResponse.json({ success: false, code: "FORBIDDEN" }, { status: 403 });
  }

  const { data: contextRows } = await admin
    .from("direct_messages")
    .select(
      "id, sender_member_id, body, withdrawn_at, created_at"
    )
    .eq("conversation_id", message.conversation_id)
    .gte("created_at", new Date(new Date(message.created_at).getTime() - 10 * 60 * 1000).toISOString())
    .lte("created_at", new Date(new Date(message.created_at).getTime() + 10 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true })
    .limit(9);

  const snapshot = (contextRows || []).map((row) => ({
    id: row.id,
    senderMemberId: row.sender_member_id,
    body: row.withdrawn_at ? null : row.body,
    withdrawnAt: row.withdrawn_at,
    createdAt: row.created_at,
  }));

  const { data: report, error } = await admin
    .from("direct_message_reports")
    .insert({
      reporter_id: user.id,
      conversation_id: message.conversation_id,
      message_id: message.id,
      reported_member_id: message.sender_member_id,
      reason,
      note,
      context_snapshot: snapshot,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !report) {
    return NextResponse.json({ success: false, code: "REPORT_FAILED" }, { status: 500 });
  }

  await admin.from("direct_moderation_audit_logs").insert({
    actor_profile_id: user.id,
    action: "report_created",
    report_id: report.id,
    conversation_id: message.conversation_id,
    message_id: message.id,
    details: { reason },
  });

  return NextResponse.json({ success: true, reportId: report.id });
}
