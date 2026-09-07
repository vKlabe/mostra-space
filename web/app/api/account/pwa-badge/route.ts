import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, code: "UNAUTHORIZED" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("account_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .lte("scheduled_for", new Date().toISOString())
    .is("read_at", null);

  if (error) {
    console.error("Unable to load PWA badge count", {
      userId: user.id,
      code: error.code,
    });
    return NextResponse.json(
      { success: false, code: "LOAD_FAILED" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    { success: true, unreadCount: count || 0 },
    { headers: NO_STORE_HEADERS }
  );
}
