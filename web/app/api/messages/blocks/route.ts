import { NextResponse } from "next/server";
import { cleanText, getDirectRequestContext } from "@/lib/messages/directMessages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BlockPayload = {
  profileId?: unknown;
};

export async function POST(request: Request) {
  const { admin, user } = await getDirectRequestContext();

  if (!user) {
    return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: BlockPayload;

  try {
    body = (await request.json()) as BlockPayload;
  } catch {
    return NextResponse.json({ success: false, code: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const profileId = cleanText(body.profileId);

  if (!profileId || profileId === user.id) {
    return NextResponse.json({ success: false, code: "INVALID_TARGET" }, { status: 400 });
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .maybeSingle<{ id: string }>();

  if (!target) {
    return NextResponse.json({ success: false, code: "PROFILE_NOT_FOUND" }, { status: 404 });
  }

  const { error } = await admin.from("direct_user_blocks").upsert(
    {
      blocker_id: user.id,
      blocked_id: profileId,
    },
    { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true }
  );

  if (error) {
    return NextResponse.json({ success: false, code: "BLOCK_FAILED" }, { status: 500 });
  }

  // Blocking also removes the mutual-follow relationship. Existing history remains readable.
  await Promise.all([
    admin
      .from("account_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", profileId),
    admin
      .from("account_follows")
      .delete()
      .eq("follower_id", profileId)
      .eq("following_id", user.id),
  ]);

  await admin.from("direct_moderation_audit_logs").insert({
    actor_profile_id: user.id,
    action: "user_blocked",
    details: { blocked_profile_id: profileId },
  });

  return NextResponse.json({ success: true, blocked: true });
}

export async function DELETE(request: Request) {
  const { admin, user } = await getDirectRequestContext();

  if (!user) {
    return NextResponse.json({ success: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const profileId = cleanText(url.searchParams.get("profileId"));

  if (!profileId) {
    return NextResponse.json({ success: false, code: "INVALID_TARGET" }, { status: 400 });
  }

  const { error } = await admin
    .from("direct_user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", profileId);

  if (error) {
    return NextResponse.json({ success: false, code: "UNBLOCK_FAILED" }, { status: 500 });
  }

  await admin.from("direct_moderation_audit_logs").insert({
    actor_profile_id: user.id,
    action: "user_unblocked",
    details: { unblocked_profile_id: profileId },
  });

  return NextResponse.json({ success: true, blocked: false });
}
