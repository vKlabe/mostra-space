import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    statusId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { statusId } = await context.params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!statusId) {
    return NextResponse.json(
      { success: false, error: "Status ID missing" },
      { status: 400 }
    );
  }

  const { data: status } = await admin
    .from("profile_statuses")
    .select("id, is_current, profile_id")
    .eq("id", statusId)
    .eq("is_current", true)
    .maybeSingle();

  if (!status) {
    return NextResponse.json(
      { success: false, error: "Status not found" },
      { status: 404 }
    );
  }

  const { data: publicOwner } = await admin
    .from("profiles")
    .select("id")
    .eq("id", status.profile_id)
    .eq("public_profile_enabled", true)
    .maybeSingle();

  if (!publicOwner) {
    return NextResponse.json(
      { success: false, error: "Status not found" },
      { status: 404 }
    );
  }

  const { data: existingLike } = await admin
    .from("profile_status_likes")
    .select("status_id, user_id")
    .eq("status_id", statusId)
    .eq("user_id", user.id)
    .maybeSingle();

  let liked: boolean;

  if (existingLike) {
    const { error } = await admin
      .from("profile_status_likes")
      .delete()
      .eq("status_id", statusId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to remove like", details: error.message },
        { status: 500 }
      );
    }

    liked = false;
  } else {
    const { error } = await admin.from("profile_status_likes").insert({
      status_id: statusId,
      user_id: user.id,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: "Unable to save like", details: error.message },
        { status: 500 }
      );
    }

    liked = true;
  }

  const { count } = await admin
    .from("profile_status_likes")
    .select("status_id", { count: "exact", head: true })
    .eq("status_id", statusId);

  return NextResponse.json({
    success: true,
    liked,
    count: count || 0,
  });
}
