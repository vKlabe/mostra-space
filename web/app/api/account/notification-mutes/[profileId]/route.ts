import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    profileId: string;
  }>;
};

type PendingNotification = {
  id: string;
  event_id: string | null;
};

type InviteRow = {
  event_id: string;
};

async function getCurrentUser() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, admin };
}

async function clearFutureAutomaticNotifications({
  admin,
  userId,
  mutedProfileId,
}: {
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
  mutedProfileId: string;
}) {
  const { data: inviteRows } = await admin
    .from("gallery_event_invites")
    .select("event_id")
    .eq("user_id", userId)
    .neq("status", "revoked");

  const invitedEventIds = new Set(
    ((inviteRows || []) as InviteRow[]).map((row) => row.event_id)
  );

  const { data: pendingRows } = await admin
    .from("account_notifications")
    .select("id, event_id")
    .eq("user_id", userId)
    .eq("actor_profile_id", mutedProfileId)
    .is("read_at", null)
    .gt("scheduled_for", new Date().toISOString());

  const removableIds = ((pendingRows || []) as PendingNotification[])
    .filter((row) => !row.event_id || !invitedEventIds.has(row.event_id))
    .map((row) => row.id);

  if (removableIds.length > 0) {
    await admin.from("account_notifications").delete().in("id", removableIds);
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const { profileId } = await context.params;
  const { user, admin } = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!profileId || profileId === user.id) {
    return NextResponse.json(
      { success: false, error: "Profilo non valido." },
      { status: 400 }
    );
  }

  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .maybeSingle<{ id: string }>();

  if (!targetProfile) {
    return NextResponse.json(
      { success: false, error: "Profilo non trovato." },
      { status: 404 }
    );
  }

  const { error } = await admin.from("account_notification_mutes").upsert(
    {
      user_id: user.id,
      muted_profile_id: profileId,
    },
    { onConflict: "user_id,muted_profile_id" }
  );

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Non riesco a silenziare le notifiche.",
        details: error.message,
      },
      { status: 500 }
    );
  }

  // Preserve explicit event invites, but remove pending automatic reminders.
  await clearFutureAutomaticNotifications({
    admin,
    userId: user.id,
    mutedProfileId: profileId,
  });

  return NextResponse.json({ success: true, isMuted: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { profileId } = await context.params;
  const { user, admin } = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!profileId || profileId === user.id) {
    return NextResponse.json(
      { success: false, error: "Profilo non valido." },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("account_notification_mutes")
    .delete()
    .eq("user_id", user.id)
    .eq("muted_profile_id", profileId);

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Non riesco a riattivare le notifiche.",
        details: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, isMuted: false });
}
