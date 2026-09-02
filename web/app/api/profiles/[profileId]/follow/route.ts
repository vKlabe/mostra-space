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

async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    user,
    error,
  };
}

async function getFollowerCount(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string
) {
  const { count } = await admin
    .from("account_follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profileId);

  return count || 0;
}

async function getIsFollowing({
  admin,
  followerId,
  followingId,
}: {
  admin: ReturnType<typeof createAdminClient>;
  followerId: string;
  followingId: string;
}) {
  const { data } = await admin
    .from("account_follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  return Boolean(data);
}

async function getTargetProfile(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string
) {
  return admin
    .from("profiles")
    .select("id, public_profile_enabled")
    .eq("id", profileId)
    .single();
}

export async function POST(_request: Request, context: RouteContext) {
  const { profileId } = await context.params;

  if (!profileId) {
    return NextResponse.json(
      { success: false, error: "Profile ID mancante." },
      { status: 400 }
    );
  }

  const { user } = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Devi accedere per seguire un profilo." },
      { status: 401 }
    );
  }

  if (user.id === profileId) {
    return NextResponse.json(
      { success: false, error: "Non puoi seguire il tuo stesso profilo." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: targetProfile, error: targetError } = await getTargetProfile(
    admin,
    profileId
  );

  if (targetError || !targetProfile || !targetProfile.public_profile_enabled) {
    return NextResponse.json(
      { success: false, error: "Profilo non trovato." },
      { status: 404 }
    );
  }

  // Messaging blocks also prevent new follows. If the V1 migration is not present yet,
  // the check fails open so this existing follow route is not broken during rollout.
  const [blockedByCurrent, blockedByTarget] = await Promise.all([
    admin
      .from("direct_user_blocks")
      .select("blocker_id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", profileId)
      .maybeSingle(),
    admin
      .from("direct_user_blocks")
      .select("blocker_id")
      .eq("blocker_id", profileId)
      .eq("blocked_id", user.id)
      .maybeSingle(),
  ]);

  const hasMessagingBlock =
    (!blockedByCurrent.error && Boolean(blockedByCurrent.data)) ||
    (!blockedByTarget.error && Boolean(blockedByTarget.data));

  if (hasMessagingBlock) {
    return NextResponse.json(
      { success: false, code: "FOLLOW_BLOCKED" },
      { status: 403 }
    );
  }

  const { error: insertError } = await admin.from("account_follows").insert({
    follower_id: user.id,
    following_id: profileId,
  });

  if (insertError && insertError.code !== "23505") {
    return NextResponse.json(
      {
        success: false,
        error: "Non riesco a seguire questo profilo.",
        details: insertError.message,
      },
      { status: 500 }
    );
  }

  const followerCount = await getFollowerCount(admin, profileId);

  return NextResponse.json({
    success: true,
    isFollowing: true,
    followerCount,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { profileId } = await context.params;

  if (!profileId) {
    return NextResponse.json(
      { success: false, error: "Profile ID mancante." },
      { status: 400 }
    );
  }

  const { user } = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Devi accedere per smettere di seguire un profilo." },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  const { error: deleteError } = await admin
    .from("account_follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", profileId);

  if (deleteError) {
    return NextResponse.json(
      {
        success: false,
        error: "Non riesco a rimuovere il follow.",
        details: deleteError.message,
      },
      { status: 500 }
    );
  }

  const followerCount = await getFollowerCount(admin, profileId);
  const isFollowing = await getIsFollowing({
    admin,
    followerId: user.id,
    followingId: profileId,
  });

  return NextResponse.json({
    success: true,
    isFollowing,
    followerCount,
  });
}
