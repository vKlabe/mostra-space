import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type FollowerRow = {
  follower_id: string;
};

type NotificationMuteRow = {
  user_id: string;
};

type ActorProfile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  email: string | null;
  profile_slug: string | null;
};

function getActorName(profile: ActorProfile | null) {
  return (
    profile?.display_name ||
    profile?.full_name ||
    profile?.email?.split("@")[0] ||
    "Un profilo che segui"
  );
}

async function getFollowers(admin: AdminClient, profileId: string) {
  const { data } = await admin
    .from("account_follows")
    .select("follower_id")
    .eq("following_id", profileId);

  const followerIds = Array.from(
    new Set(
      ((data || []) as FollowerRow[])
        .map((row) => row.follower_id)
        .filter((id) => id && id !== profileId)
    )
  );

  if (followerIds.length === 0) {
    return followerIds;
  }

  const { data: muteRows, error: muteError } = await admin
    .from("account_notification_mutes")
    .select("user_id")
    .eq("muted_profile_id", profileId)
    .in("user_id", followerIds);

  // Fail open: a temporary/migration error must never break publication.
  if (muteError) {
    return followerIds;
  }

  const mutedUserIds = new Set(
    ((muteRows || []) as NotificationMuteRow[]).map((row) => row.user_id)
  );

  return followerIds.filter((userId) => !mutedUserIds.has(userId));
}

async function getActor(admin: AdminClient, profileId: string) {
  const { data } = await admin
    .from("profiles")
    .select("id, display_name, full_name, email, profile_slug")
    .eq("id", profileId)
    .maybeSingle<ActorProfile>();

  return data || null;
}

export async function createGalleryPublishedNotifications({
  admin,
  ownerId,
  galleryId,
  galleryTitle,
  gallerySlug,
}: {
  admin: AdminClient;
  ownerId: string;
  galleryId: string;
  galleryTitle: string | null;
  gallerySlug: string | null;
}) {
  const followerIds = await getFollowers(admin, ownerId);

  if (followerIds.length === 0) {
    return { created: 0 };
  }

  const actor = await getActor(admin, ownerId);
  const actorName = getActorName(actor);
  const safeGalleryTitle = galleryTitle?.trim() || "una nuova galleria";
  const now = new Date().toISOString();
  const href = gallerySlug ? `/gallerie/${gallerySlug}` : "/gallerie";
  const sourceKey = `gallery_published:${galleryId}`;

  const rows = followerIds.map((userId) => ({
    user_id: userId,
    type: "gallery_published",
    title: "Nuova galleria pubblicata",
    message: `${actorName} ha pubblicato ${safeGalleryTitle}`,
    event_id: null,
    gallery_id: galleryId,
    status_id: null,
    actor_profile_id: ownerId,
    href,
    source_key: sourceKey,
    scheduled_for: now,
  }));

  const { error } = await admin.from("account_notifications").upsert(rows, {
    onConflict: "user_id,source_key",
    ignoreDuplicates: true,
  });

  if (error) {
    throw new Error(`Gallery notification insert failed: ${error.message}`);
  }

  return { created: rows.length };
}

export async function createStatusPublishedNotifications({
  admin,
  ownerId,
  statusId,
  content,
}: {
  admin: AdminClient;
  ownerId: string;
  statusId: string;
  content: string;
}) {
  const followerIds = await getFollowers(admin, ownerId);

  if (followerIds.length === 0) {
    return { created: 0 };
  }

  const actor = await getActor(admin, ownerId);
  const actorName = getActorName(actor);
  const profileHref = actor?.profile_slug
    ? `/profili/${actor.profile_slug}#stato`
    : "/profili";
  const now = new Date().toISOString();
  const sourceKey = `status_published:${statusId}`;

  const rows = followerIds.map((userId) => ({
    user_id: userId,
    type: "status_published",
    title: `${actorName} ha pubblicato un nuovo stato`,
    message: content,
    event_id: null,
    gallery_id: null,
    status_id: statusId,
    actor_profile_id: ownerId,
    href: profileHref,
    source_key: sourceKey,
    scheduled_for: now,
  }));

  const { error } = await admin.from("account_notifications").upsert(rows, {
    onConflict: "user_id,source_key",
    ignoreDuplicates: true,
  });

  if (error) {
    throw new Error(`Status notification insert failed: ${error.message}`);
  }

  return { created: rows.length };
}
