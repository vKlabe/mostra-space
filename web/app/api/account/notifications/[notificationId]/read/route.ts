import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    notificationId: string;
  }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const { notificationId } = await context.params;

  if (!notificationId) {
    return NextResponse.json(
      { success: false, error: "Notification ID mancante." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: notification, error: notificationError } = await admin
    .from("account_notifications")
    .update({
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .select("id, read_at")
    .single();

  if (notificationError || !notification) {
    return NextResponse.json(
      {
        success: false,
        error: "Notifica non trovata.",
        details: notificationError?.message || null,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    notification,
  });
}
