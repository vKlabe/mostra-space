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

type ArtworkTarget = {
  id: string;
  owner_id: string;
  title: string | null;
};

type GalleryTarget = {
  id: string;
  owner_id: string;
  title: string | null;
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

async function upsertActivityNotification(
  admin: AdminClient,
  row: Record<string, unknown>,
  errorLabel: string
) {
  const { error } = await admin.from("account_notifications").upsert(row, {
    onConflict: "user_id,source_key",
    ignoreDuplicates: true,
  });

  if (error) {
    throw new Error(`${errorLabel}: ${error.message}`);
  }

  return { created: 1 };
}

export async function createMessageReceivedNotification({
  admin,
  senderId,
  recipientId,
  messageId,
  recipientMuted,
}: {
  admin: AdminClient;
  senderId: string;
  recipientId: string;
  messageId: string;
  recipientMuted: boolean;
}) {
  if (senderId === recipientId || recipientMuted) {
    return { created: 0 };
  }

  const actor = await getActor(admin, senderId);
  const actorName = getActorName(actor);
  const now = new Date().toISOString();

  return upsertActivityNotification(
    admin,
    {
      user_id: recipientId,
      type: "message_received",
      push_category: "messages",
      title: `Nuovo messaggio da ${actorName}`,
      message: "Hai ricevuto un nuovo messaggio privato.",
      event_id: null,
      gallery_id: null,
      status_id: null,
      actor_profile_id: senderId,
      href: `/dashboard/social?messageProfile=${encodeURIComponent(senderId)}`,
      source_key: `direct_message:${messageId}`,
      scheduled_for: now,
    },
    "Message notification insert failed"
  );
}

export async function createNewFollowerNotification({
  admin,
  followerId,
  followedProfileId,
}: {
  admin: AdminClient;
  followerId: string;
  followedProfileId: string;
}) {
  if (followerId === followedProfileId) {
    return { created: 0 };
  }

  const actor = await getActor(admin, followerId);
  const actorName = getActorName(actor);
  const href = actor?.profile_slug
    ? `/profili/${actor.profile_slug}`
    : "/profili";

  return upsertActivityNotification(
    admin,
    {
      user_id: followedProfileId,
      type: "profile_followed",
      push_category: "followers",
      title: "Hai un nuovo follower",
      message: `${actorName} ha iniziato a seguirti.`,
      event_id: null,
      gallery_id: null,
      status_id: null,
      actor_profile_id: followerId,
      href,
      source_key: `profile_followed:${followerId}`,
      scheduled_for: new Date().toISOString(),
    },
    "Follower notification insert failed"
  );
}

export async function createArtworkFavoritedNotification({
  admin,
  actorId,
  artworkId,
  favoriteId,
}: {
  admin: AdminClient;
  actorId: string;
  artworkId: string;
  favoriteId: string;
}) {
  const { data: artwork, error } = await admin
    .from("artworks")
    .select("id, owner_id, title")
    .eq("id", artworkId)
    .maybeSingle<ArtworkTarget>();

  if (error || !artwork || artwork.owner_id === actorId) {
    return { created: 0 };
  }

  const actor = await getActor(admin, actorId);
  const actorName = getActorName(actor);
  const artworkTitle = artwork.title?.trim() || "una tua opera";

  return upsertActivityNotification(
    admin,
    {
      user_id: artwork.owner_id,
      type: "artwork_favorited",
      push_category: "favorites",
      title: "Una tua opera è stata salvata",
      message: `${actorName} ha aggiunto ${artworkTitle} ai preferiti.`,
      event_id: null,
      gallery_id: null,
      status_id: null,
      actor_profile_id: actorId,
      href: `/dashboard/opere/${encodeURIComponent(artwork.id)}`,
      source_key: `artwork_favorited:${favoriteId}`,
      scheduled_for: new Date().toISOString(),
    },
    "Artwork favorite notification insert failed"
  );
}

export async function createGalleryFavoritedNotification({
  admin,
  actorId,
  galleryId,
  favoriteId,
}: {
  admin: AdminClient;
  actorId: string;
  galleryId: string;
  favoriteId: string;
}) {
  const { data: gallery, error } = await admin
    .from("galleries")
    .select("id, owner_id, title")
    .eq("id", galleryId)
    .maybeSingle<GalleryTarget>();

  if (error || !gallery || gallery.owner_id === actorId) {
    return { created: 0 };
  }

  const actor = await getActor(admin, actorId);
  const actorName = getActorName(actor);
  const galleryTitle = gallery.title?.trim() || "una tua galleria";

  return upsertActivityNotification(
    admin,
    {
      user_id: gallery.owner_id,
      type: "gallery_favorited",
      push_category: "favorites",
      title: "Una tua galleria è stata salvata",
      message: `${actorName} ha aggiunto ${galleryTitle} ai preferiti.`,
      event_id: null,
      gallery_id: gallery.id,
      status_id: null,
      actor_profile_id: actorId,
      href: `/dashboard/gallerie/${encodeURIComponent(gallery.id)}`,
      source_key: `gallery_favorited:${favoriteId}`,
      scheduled_for: new Date().toISOString(),
    },
    "Gallery favorite notification insert failed"
  );
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
    push_category: "gallery_updates",
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
    push_category: "publications",
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
