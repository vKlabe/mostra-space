import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createStatusPublishedNotifications } from "@/lib/notifications/socialNotifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CurrentStatus = {
  id: string;
  content: string;
  is_current: boolean;
};

function cleanStatus(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\r\n/g, "\n").trim();
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { content?: unknown };

  try {
    body = (await request.json()) as { content?: unknown };
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid payload" },
      { status: 400 }
    );
  }

  const content = cleanStatus(body.content);

  if (!content) {
    return NextResponse.json(
      { success: false, error: "Status cannot be empty" },
      { status: 400 }
    );
  }

  if (content.length > 180) {
    return NextResponse.json(
      { success: false, error: "Status is too long" },
      { status: 400 }
    );
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, public_profile_enabled")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      { success: false, error: "Profile not found" },
      { status: 404 }
    );
  }

  const { data: currentStatusData } = await admin
    .from("profile_statuses")
    .select("id, content, is_current")
    .eq("profile_id", user.id)
    .eq("is_current", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<CurrentStatus>();

  if (currentStatusData?.content.trim() === content) {
    return NextResponse.json({
      success: true,
      unchanged: true,
      status: currentStatusData,
    });
  }

  if (currentStatusData) {
    const { error: deactivateError } = await admin
      .from("profile_statuses")
      .update({ is_current: false, updated_at: new Date().toISOString() })
      .eq("id", currentStatusData.id)
      .eq("profile_id", user.id);

    if (deactivateError) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to update current status",
          details: deactivateError.message,
        },
        { status: 500 }
      );
    }
  }

  const { data: createdStatus, error: insertError } = await admin
    .from("profile_statuses")
    .insert({
      profile_id: user.id,
      content,
      is_current: true,
    })
    .select("id, profile_id, content, is_current, created_at, updated_at")
    .single();

  if (insertError || !createdStatus) {
    if (currentStatusData) {
      await admin
        .from("profile_statuses")
        .update({ is_current: true, updated_at: new Date().toISOString() })
        .eq("id", currentStatusData.id)
        .eq("profile_id", user.id);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unable to publish status",
        details: insertError?.message || null,
      },
      { status: 500 }
    );
  }

  if (profile.public_profile_enabled) {
    try {
      await createStatusPublishedNotifications({
        admin,
        ownerId: user.id,
        statusId: createdStatus.id,
        content: createdStatus.content,
      });
    } catch (notificationError) {
      console.error("Status published but follower notifications failed", notificationError);
    }
  }

  return NextResponse.json({ success: true, status: createdStatus });
}

export async function DELETE() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: currentStatus } = await admin
    .from("profile_statuses")
    .select("id")
    .eq("profile_id", user.id)
    .eq("is_current", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (!currentStatus) {
    return NextResponse.json({ success: true, removed: false });
  }

  const { error } = await admin
    .from("profile_statuses")
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .eq("id", currentStatus.id)
    .eq("profile_id", user.id);

  if (error) {
    return NextResponse.json(
      { success: false, error: "Unable to remove status", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, removed: true });
}
