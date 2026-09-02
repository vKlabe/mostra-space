import { NextResponse } from "next/server";
import {
  DIRECT_MESSAGES_TERMS_VERSION,
  getDirectRequestContext,
  getMessagingSettings,
} from "@/lib/messages/directMessages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ActivatePayload = {
  adultConfirmed?: unknown;
  acceptTerms?: unknown;
};

type UpdatePayload = {
  readReceiptsEnabled?: unknown;
};

export async function POST(request: Request) {
  const { admin, user } = await getDirectRequestContext();

  if (!user) {
    return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: ActivatePayload;

  try {
    body = (await request.json()) as ActivatePayload;
  } catch {
    return NextResponse.json({ success: false, code: "INVALID_PAYLOAD" }, { status: 400 });
  }

  if (body.adultConfirmed !== true || body.acceptTerms !== true) {
    return NextResponse.json({ success: false, code: "CONSENT_REQUIRED" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const existing = await getMessagingSettings(admin, user.id);

  const { error } = existing
    ? await admin
        .from("direct_messaging_settings")
        .update({
          enabled_at: existing.enabled_at || now,
          adult_confirmed_at: existing.adult_confirmed_at || now,
          terms_accepted_at: now,
          terms_version: DIRECT_MESSAGES_TERMS_VERSION,
        })
        .eq("user_id", user.id)
    : await admin.from("direct_messaging_settings").insert({
        user_id: user.id,
        enabled_at: now,
        adult_confirmed_at: now,
        terms_accepted_at: now,
        terms_version: DIRECT_MESSAGES_TERMS_VERSION,
        read_receipts_enabled: true,
      });

  if (error) {
    return NextResponse.json({ success: false, code: "SAVE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    termsVersion: DIRECT_MESSAGES_TERMS_VERSION,
  });
}

export async function PATCH(request: Request) {
  const { admin, user } = await getDirectRequestContext();

  if (!user) {
    return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: UpdatePayload;

  try {
    body = (await request.json()) as UpdatePayload;
  } catch {
    return NextResponse.json({ success: false, code: "INVALID_PAYLOAD" }, { status: 400 });
  }

  if (typeof body.readReceiptsEnabled !== "boolean") {
    return NextResponse.json({ success: false, code: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const settings = await getMessagingSettings(admin, user.id);

  if (!settings) {
    return NextResponse.json({ success: false, code: "MESSAGING_NOT_ENABLED" }, { status: 409 });
  }

  const { error } = await admin
    .from("direct_messaging_settings")
    .update({ read_receipts_enabled: body.readReceiptsEnabled })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ success: false, code: "SAVE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    readReceiptsEnabled: body.readReceiptsEnabled,
  });
}
