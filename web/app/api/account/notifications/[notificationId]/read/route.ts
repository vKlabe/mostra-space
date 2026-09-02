import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    notificationId: string;
  }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const { notificationId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!notificationId) {
    return NextResponse.json(
      { success: false, error: "Notification ID missing" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("account_notifications")
    .update({ read_at: now })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .select("id, read_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, error: "Unable to update notification", details: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { success: false, error: "Notification not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, notification: data });
}
