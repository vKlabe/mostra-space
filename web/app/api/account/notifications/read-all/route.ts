import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("account_notifications")
    .update({ read_at: now })
    .eq("user_id", user.id)
    .lte("scheduled_for", now)
    .is("read_at", null)
    .select("id");

  if (error) {
    return NextResponse.json(
      { success: false, error: "Unable to update notifications", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    updatedCount: data?.length || 0,
    readAt: now,
  });
}
