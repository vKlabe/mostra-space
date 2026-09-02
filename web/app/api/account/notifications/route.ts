import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type NotificationRow = {
  id: string;
  user_id: string;
  type:
    | "event_created"
    | "event_3_days_before"
    | "event_30_minutes_before"
    | "gallery_published"
    | "status_published";
  title: string;
  message: string;
  event_id: string | null;
  gallery_id: string | null;
  status_id: string | null;
  actor_profile_id: string | null;
  href: string | null;
  source_key: string | null;
  scheduled_for: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
};

type ActorProfile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  profile_slug: string | null;
};

type Gallery = {
  id: string;
  slug: string;
  status: "draft" | "published" | "archived";
};

function cleanLimit(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.max(5, Math.min(50, Math.round(parsed)));
}

function getActorName(profile: ActorProfile | null) {
  return (
    profile?.display_name ||
    profile?.full_name ||
    profile?.email?.split("@")[0] ||
    null
  );
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = cleanLimit(url.searchParams.get("limit"));
  const nowIso = new Date().toISOString();

  const [{ data: notificationsData, error }, { count: unreadCount }] = await Promise.all([
    admin
      .from("account_notifications")
      .select(
        "id, user_id, type, title, message, event_id, gallery_id, status_id, actor_profile_id, href, source_key, scheduled_for, delivered_at, read_at, created_at"
      )
      .eq("user_id", user.id)
      .lte("scheduled_for", nowIso)
      .order("scheduled_for", { ascending: false })
      .limit(limit),
    admin
      .from("account_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("scheduled_for", nowIso)
      .is("read_at", null),
  ]);

  if (error) {
    return NextResponse.json(
      { success: false, error: "Unable to load notifications", details: error.message },
      { status: 500 }
    );
  }

  const notifications = (notificationsData || []) as NotificationRow[];
  const actorIds = Array.from(
    new Set(
      notifications
        .map((notification) => notification.actor_profile_id)
        .filter(Boolean) as string[]
    )
  );
  const galleryIds = Array.from(
    new Set(
      notifications
        .map((notification) => notification.gallery_id)
        .filter(Boolean) as string[]
    )
  );

  let actorsData: ActorProfile[] = [];
  let galleriesData: Gallery[] = [];

  if (actorIds.length > 0) {
    const { data } = await admin
      .from("profiles")
      .select("id, display_name, full_name, email, avatar_url, profile_slug")
      .in("id", actorIds);

    actorsData = (data || []) as ActorProfile[];
  }

  if (galleryIds.length > 0) {
    const { data } = await admin
      .from("galleries")
      .select("id, slug, status")
      .in("id", galleryIds);

    galleriesData = (data || []) as Gallery[];
  }

  const actorById = new Map(
    actorsData.map((actor) => [actor.id, actor])
  );
  const galleryById = new Map(
    galleriesData.map((gallery) => [gallery.id, gallery])
  );

  const items = notifications.map((notification) => {
    const actor = notification.actor_profile_id
      ? actorById.get(notification.actor_profile_id) || null
      : null;
    const gallery = notification.gallery_id
      ? galleryById.get(notification.gallery_id) || null
      : null;

    let href = notification.href;

    if (!href && gallery?.status === "published") {
      href = `/gallerie/${gallery.slug}`;
    }

    if (!href && notification.type === "status_published" && actor?.profile_slug) {
      href = `/profili/${actor.profile_slug}#stato`;
    }

    if (!href && notification.event_id) {
      href = "/account/notifiche";
    }

    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      eventId: notification.event_id,
      galleryId: notification.gallery_id,
      statusId: notification.status_id,
      actorProfileId: notification.actor_profile_id,
      actorName: getActorName(actor),
      actorAvatarUrl: actor?.avatar_url || null,
      href,
      scheduledFor: notification.scheduled_for,
      deliveredAt: notification.delivered_at,
      readAt: notification.read_at,
      createdAt: notification.created_at,
    };
  });

  const undeliveredIds = notifications
    .filter((notification) => !notification.delivered_at)
    .map((notification) => notification.id);

  if (undeliveredIds.length > 0) {
    await admin
      .from("account_notifications")
      .update({ delivered_at: nowIso })
      .eq("user_id", user.id)
      .in("id", undeliveredIds);
  }

  return NextResponse.json(
    {
      success: true,
      notifications: items,
      unreadCount: unreadCount || 0,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
