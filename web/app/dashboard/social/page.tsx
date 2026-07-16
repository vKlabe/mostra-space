import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import T from "@/components/i18n/T";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "diamond" | "institution";
  bio: string | null;
  profile_slug: string | null;
  public_profile_enabled: boolean;
};

type FollowRow = {
  following_id: string;
  created_at: string;
};

type FollowedProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_slug: string | null;
  public_profile_enabled: boolean;
};

type FavoriteGalleryRow = {
  gallery_id: string;
  created_at: string;
};

type GalleryStatus = "draft" | "published" | "archived";

type GalleryRecord = {
  id: string;
  title: string;
  slug: string;
  status: GalleryStatus;
  cover_image_url: string | null;
};

type FavoriteGallery = GalleryRecord & {
  saved_at: string;
};

type FavoriteArtworkRow = {
  artwork_id: string;
  created_at: string;
};

type ArtworkRecord = {
  id: string;
  title: string;
  artist_name: string | null;
  is_public: boolean;
  image_url: string | null;
  thumbnail_url: string | null;
};

type GalleryRelation = {
  id: string;
  title: string;
  slug: string;
  status: GalleryStatus;
};

type ArtworkPlacement = {
  id: string;
  artwork_id: string;
  galleries: GalleryRelation | GalleryRelation[] | null;
};

type FavoriteArtwork = ArtworkRecord & {
  saved_at: string;
  gallery_title: string | null;
  gallery_slug: string | null;
};

type RecentGalleryVisitRow = {
  gallery_id: string;
  visited_at: string;
};

type RecentGallery = GalleryRecord & {
  visited_at: string;
};

type GalleryEvent = {
  id: string;
  owner_id: string;
  gallery_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "live" | "completed" | "cancelled";
};

type EventOwner = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  email: string | null;
  profile_slug: string | null;
};

type NotificationRow = {
  id: string;
  read_at: string | null;
};

function getProfileName(profile: FollowedProfile | EventOwner | Profile) {
  return (
    profile.display_name ||
    profile.full_name ||
    profile.email?.split("@")[0] ||
    null
  );
}

function getInitial(name: string | null | undefined) {
  return name?.trim().slice(0, 1).toUpperCase() || "M";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeGalleryRelation(
  value: GalleryRelation | GalleryRelation[] | null
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

export default async function DashboardSocialPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select(
      "id, email, full_name, display_name, avatar_url, role, plan, bio, profile_slug, public_profile_enabled"
    )
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    return (
      <DashboardShell
  title={<T textKey="dashboard.social.errorShell.title" fallback="Social" />}
  subtitle={
    <T
      textKey="dashboard.social.errorShell.subtitle"
      fallback="Non riesco a leggere il profilo account."
    />
  }
  activeSection="social"
  navMode="community"
>
        <section className="rounded-3xl border border-red-900 bg-red-950/25 p-6 text-red-100">
          {profileError?.message || (
            <T
              textKey="dashboard.social.errors.profileMissing"
              fallback="Profilo assente."
            />
          )}
        </section>
      </DashboardShell>
    );
  }

  const isCreator = profile.role === "gallerist" || profile.role === "admin";
  const displayName = getProfileName(profile);
  const publicProfileHref =
    profile.profile_slug && profile.public_profile_enabled
      ? `/profili/${profile.profile_slug}`
      : null;

  const { data: followRowsData } = await admin
    .from("account_follows")
    .select("following_id, created_at")
    .eq("follower_id", user.id)
    .order("created_at", { ascending: false });

  const followRows = (followRowsData || []) as FollowRow[];
  const followingIds = followRows.map((row) => row.following_id);

  let followedProfiles: FollowedProfile[] = [];

  if (followingIds.length > 0) {
    const { data: followedProfilesData } = await admin
      .from("profiles")
      .select(
        "id, email, full_name, display_name, avatar_url, bio, profile_slug, public_profile_enabled"
      )
      .in("id", followingIds)
      .eq("public_profile_enabled", true);

    const profileById = new Map(
      ((followedProfilesData || []) as FollowedProfile[]).map((item) => [
        item.id,
        item,
      ])
    );

    followedProfiles = followingIds
      .map((id) => profileById.get(id))
      .filter(Boolean) as FollowedProfile[];
  }

  const { data: favoriteGalleryRowsData } = await admin
    .from("favorite_galleries")
    .select("gallery_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const favoriteGalleryRows =
    (favoriteGalleryRowsData || []) as FavoriteGalleryRow[];
  const favoriteGalleryIds = favoriteGalleryRows.map((row) => row.gallery_id);

  let favoriteGalleries: FavoriteGallery[] = [];

  if (favoriteGalleryIds.length > 0) {
    const { data: favoriteGalleriesData } = await admin
      .from("galleries")
      .select("id, title, slug, status, cover_image_url")
      .in("id", favoriteGalleryIds)
      .eq("status", "published");

    const galleryById = new Map(
      ((favoriteGalleriesData || []) as GalleryRecord[]).map((gallery) => [
        gallery.id,
        gallery,
      ])
    );

    favoriteGalleries = favoriteGalleryRows
      .map((favorite) => {
        const gallery = galleryById.get(favorite.gallery_id);

        if (!gallery) {
          return null;
        }

        return {
          ...gallery,
          saved_at: favorite.created_at,
        };
      })
      .filter(Boolean) as FavoriteGallery[];
  }

  const { data: favoriteArtworkRowsData } = await admin
    .from("favorite_artworks")
    .select("artwork_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const favoriteArtworkRows =
    (favoriteArtworkRowsData || []) as FavoriteArtworkRow[];
  const favoriteArtworkIds = favoriteArtworkRows.map((row) => row.artwork_id);

  let favoriteArtworks: FavoriteArtwork[] = [];

  if (favoriteArtworkIds.length > 0) {
    const { data: favoriteArtworksData } = await admin
      .from("artworks")
      .select("id, title, artist_name, is_public, image_url, thumbnail_url")
      .in("id", favoriteArtworkIds)
      .eq("is_public", true);

    const { data: favoriteArtworkPlacementsData } = await admin
      .from("gallery_artworks")
      .select(
        `
        id,
        artwork_id,
        galleries (
          id,
          title,
          slug,
          status
        )
      `
      )
      .in("artwork_id", favoriteArtworkIds);

    const artworkById = new Map(
      ((favoriteArtworksData || []) as ArtworkRecord[]).map((artwork) => [
        artwork.id,
        artwork,
      ])
    );

    const placementByArtworkId = new Map<string, ArtworkPlacement>();

    ((favoriteArtworkPlacementsData || []) as unknown as ArtworkPlacement[]).forEach(
      (placement) => {
        const galleries = Array.isArray(placement.galleries)
          ? placement.galleries
          : placement.galleries
            ? [placement.galleries]
            : [];

        const publishedGallery = galleries.find(
          (gallery) => gallery.status === "published"
        );

        if (publishedGallery && !placementByArtworkId.has(placement.artwork_id)) {
          placementByArtworkId.set(placement.artwork_id, {
            ...placement,
            galleries: publishedGallery,
          });
        }
      }
    );

    favoriteArtworks = favoriteArtworkRows
      .map((favorite) => {
        const artwork = artworkById.get(favorite.artwork_id);

        if (!artwork) {
          return null;
        }

        const placement = placementByArtworkId.get(artwork.id);
        const gallery = normalizeGalleryRelation(placement?.galleries || null);

        return {
          ...artwork,
          saved_at: favorite.created_at,
          gallery_title: gallery?.title || null,
          gallery_slug: gallery?.slug || null,
        };
      })
      .filter(Boolean) as FavoriteArtwork[];
  }

  const { data: recentRowsData } = await admin
    .from("recent_gallery_visits")
    .select("gallery_id, visited_at")
    .eq("user_id", user.id)
    .order("visited_at", { ascending: false })
    .limit(12);

  const recentRows = (recentRowsData || []) as RecentGalleryVisitRow[];
  const recentGalleryIds = recentRows.map((row) => row.gallery_id);

  let recentGalleries: RecentGallery[] = [];

  if (recentGalleryIds.length > 0) {
    const { data: recentGalleriesData } = await admin
      .from("galleries")
      .select("id, title, slug, status, cover_image_url")
      .in("id", recentGalleryIds)
      .eq("status", "published");

    const galleryById = new Map(
      ((recentGalleriesData || []) as GalleryRecord[]).map((gallery) => [
        gallery.id,
        gallery,
      ])
    );

    recentGalleries = recentRows
      .map((visit) => {
        const gallery = galleryById.get(visit.gallery_id);

        if (!gallery) {
          return null;
        }

        return {
          ...gallery,
          visited_at: visit.visited_at,
        };
      })
      .filter(Boolean) as RecentGallery[];
  }

  const nowIso = new Date().toISOString();

  const followedEventRows =
    followingIds.length > 0
      ? await admin
          .from("gallery_events")
          .select(
            "id, owner_id, gallery_id, title, description, starts_at, ends_at, status"
          )
          .in("owner_id", followingIds)
          .in("status", ["scheduled", "live"])
          .gt("ends_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(8)
      : { data: [] };

  const favoriteEventRows =
    favoriteGalleryIds.length > 0
      ? await admin
          .from("gallery_events")
          .select(
            "id, owner_id, gallery_id, title, description, starts_at, ends_at, status"
          )
          .in("gallery_id", favoriteGalleryIds)
          .in("status", ["scheduled", "live"])
          .gt("ends_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(8)
      : { data: [] };

  const eventsById = new Map<string, GalleryEvent>();

  for (const event of (followedEventRows.data || []) as GalleryEvent[]) {
    eventsById.set(event.id, event);
  }

  for (const event of (favoriteEventRows.data || []) as GalleryEvent[]) {
    eventsById.set(event.id, event);
  }

  const calendarEvents = Array.from(eventsById.values())
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    )
    .slice(0, 6);

  const eventGalleryIds = Array.from(
    new Set(calendarEvents.map((event) => event.gallery_id))
  );
  const eventOwnerIds = Array.from(
    new Set(calendarEvents.map((event) => event.owner_id))
  );

  const { data: eventGalleriesData } =
    eventGalleryIds.length > 0
      ? await admin
          .from("galleries")
          .select("id, title, slug, status, cover_image_url")
          .in("id", eventGalleryIds)
      : { data: [] };

  const { data: eventOwnersData } =
    eventOwnerIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, display_name, full_name, email, profile_slug")
          .in("id", eventOwnerIds)
      : { data: [] };

  const eventGalleryById = new Map(
    ((eventGalleriesData || []) as GalleryRecord[]).map((gallery) => [
      gallery.id,
      gallery,
    ])
  );

  const eventOwnerById = new Map(
    ((eventOwnersData || []) as EventOwner[]).map((owner) => [owner.id, owner])
  );

  const { data: notificationsData } = await admin
    .from("account_notifications")
    .select("id, read_at")
    .eq("user_id", user.id)
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: false })
    .limit(30);

  const notifications = (notificationsData || []) as NotificationRow[];
  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.read_at
  ).length;

  return (
    <DashboardShell
  title={<T textKey="dashboard.social.shell.title" fallback="Social" />}
  subtitle={
    <T
      textKey="dashboard.social.shell.subtitle"
      fallback="Community, profili seguiti, calendario, preferiti e attività recente."
    />
  }
  activeSection="social"
  navMode={isCreator ? "creator" : "community"}
      actions={
        <div className="flex flex-wrap gap-3">
          <a
            href="/profili"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="dashboard.social.actions.exploreProfiles"
              fallback="Esplora profili"
            />
          </a>

          <a
            href="/eventi"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="dashboard.social.actions.publicEvents"
              fallback="Eventi pubblici"
            />
          </a>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              <T
                textKey="dashboard.social.publicProfile.label"
                fallback="Profilo pubblico"
              />
            </p>

            <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950">
                {profile.avatar_url ? (
                  <img
  src={profile.avatar_url}
  alt={displayName || "mostra.space"}
  className="h-full w-full object-cover"
/>
                ) : (
                  <span className="font-serif text-4xl text-amber-500">
                    {getInitial(displayName)}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-3xl font-semibold text-neutral-100">
  {displayName || (
    <T
      textKey="dashboard.social.publicProfile.unknownProfile"
      fallback="Profilo mostra.space"
    />
  )}
</h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
                  {profile.bio || (
                    <T
                      textKey="dashboard.social.publicProfile.defaultBio"
                      fallback="Il tuo profilo pubblico raccoglie gallerie, opere, bio e presenza community."
                    />
                  )}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {publicProfileHref ? (
                    <a
                      href={publicProfileHref}
                      className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                    >
                      <T
                        textKey="dashboard.social.publicProfile.view"
                        fallback="Vedi profilo pubblico"
                      />
                    </a>
                  ) : (
                    <a
                      href="/account"
                      className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                    >
                      <T
                        textKey="dashboard.social.publicProfile.activate"
                        fallback="Attiva profilo da account"
                      />
                    </a>
                  )}

                  <a
                    href="/account"
                    className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                  >
                    <T
                      textKey="dashboard.social.publicProfile.editAccount"
                      fallback="Modifica dati account"
                    />
                  </a>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              <T
                textKey="dashboard.social.summary.label"
                fallback="Sintesi social"
              />
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-2xl font-semibold text-neutral-100">
                  {followedProfiles.length}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  <T
                    textKey="dashboard.social.summary.followedProfiles"
                    fallback="profili seguiti"
                  />
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-2xl font-semibold text-neutral-100">
                  {favoriteGalleries.length}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  <T
                    textKey="dashboard.social.summary.savedGalleries"
                    fallback="gallerie salvate"
                  />
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-2xl font-semibold text-neutral-100">
                  {favoriteArtworks.length}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  <T
                    textKey="dashboard.social.summary.savedArtworks"
                    fallback="opere salvate"
                  />
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-2xl font-semibold text-neutral-100">
                  {unreadNotificationCount}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  <T
                    textKey="dashboard.social.summary.newNotifications"
                    fallback="notifiche nuove"
                  />
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
          <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                  <T
                    textKey="dashboard.social.community.label"
                    fallback="Community"
                  />
                </p>

                <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
                  <T
                    textKey="dashboard.social.community.title"
                    fallback="Profili che segui"
                  />
                </h2>
              </div>

              <a
                href="/profili"
                className="rounded-full border border-neutral-700 px-4 py-2 text-xs uppercase tracking-[0.16em] text-neutral-200 transition hover:border-neutral-400"
              >
                <T
                  textKey="dashboard.social.community.findProfiles"
                  fallback="Trova profili"
                />
              </a>
            </div>

            {followedProfiles.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm leading-6 text-neutral-500">
                <T
                  textKey="dashboard.social.community.empty"
                  fallback="Non segui ancora nessun profilo. Quando seguirai artisti, galleristi o istituzioni, li ritroverai qui."
                />
              </p>
            ) : (
  <div className="mt-5 grid gap-4 md:grid-cols-2">
    {followedProfiles.slice(0, 6).map((followed) => {
      const followedName = getProfileName(followed);

      return (
        <a
          key={followed.id}
          href={`/profili/${followed.profile_slug}`}
          className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-500"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-neutral-800 bg-black">
              {followed.avatar_url ? (
                <img
                  src={followed.avatar_url}
                  alt={followedName || "mostra.space"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-neutral-300">
                  {getInitial(followedName)}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate font-medium text-neutral-100">
                {followedName || (
                  <T
                    textKey="dashboard.social.community.unknownProfile"
                    fallback="Profilo mostra.space"
                  />
                )}
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                <T
                  textKey="dashboard.social.community.publicProfile"
                  fallback="Profilo pubblico"
                />
              </p>
            </div>
          </div>

          {followed.bio && (
            <p className="mt-4 line-clamp-2 text-sm leading-6 text-neutral-500">
              {followed.bio}
            </p>
          )}
        </a>
      );
    })}
  </div>
)}

          </article>

          <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                  <T
                    textKey="dashboard.social.calendar.label"
                    fallback="Eventi"
                  />
                </p>

                <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
                  <T
                    textKey="dashboard.social.calendar.title"
                    fallback="Il tuo calendario"
                  />
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href="/account/calendario"
                  className="rounded-full border border-neutral-700 px-4 py-2 text-xs uppercase tracking-[0.16em] text-neutral-200 transition hover:border-neutral-400"
                >
                  <T
                    textKey="dashboard.social.calendar.open"
                    fallback="Apri calendario"
                  />
                </a>

                <a
                  href="/account/notifiche"
                  className="rounded-full border border-neutral-700 px-4 py-2 text-xs uppercase tracking-[0.16em] text-neutral-200 transition hover:border-neutral-400"
                >
                  <T
                    textKey="dashboard.social.calendar.notifications"
                    fallback="Notifiche"
                  />
                </a>
              </div>
            </div>

            {calendarEvents.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm leading-6 text-neutral-500">
                <T
                  textKey="dashboard.social.calendar.empty"
                  fallback="Nessun evento nel tuo calendario personale. Segui profili o salva gallerie per ricevere eventi qui."
                />
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {calendarEvents.map((event) => {
                  const gallery = eventGalleryById.get(event.gallery_id);
                  const owner = eventOwnerById.get(event.owner_id);

                  return (
                    <a
                      key={event.id}
                      href={
                        gallery?.status === "published"
                          ? `/gallerie/${gallery.slug}`
                          : "/account/calendario"
                      }
                      className="block rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-500"
                    >
                      <p className="text-xs text-amber-300">
                        {formatDateTime(event.starts_at)}
                      </p>

                      <p className="mt-2 font-medium text-neutral-100">
                        {event.title}
                      </p>

                      <p className="mt-1 text-xs text-neutral-500">
                        {gallery?.title || (
                          <T
                            textKey="dashboard.social.calendar.removedGallery"
                            fallback="Galleria rimossa"
                          />
                        )}{" "}
                        ·{" "}
                        {owner ? (
  getProfileName(owner) || (
    <T
      textKey="dashboard.social.calendar.unknownProfile"
      fallback="Profilo mostra.space"
    />
  )
) : (
  <T
    textKey="dashboard.social.calendar.profile"
    fallback="Profilo"
  />
)}
                      </p>
                    </a>
                  );
                })}
              </div>
            )}
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                  <T
                    textKey="dashboard.social.favoriteGalleries.label"
                    fallback="Preferiti"
                  />
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
                  <T
                    textKey="dashboard.social.favoriteGalleries.title"
                    fallback="Gallerie salvate"
                  />
                </h2>
              </div>

              <a
                href="/gallerie"
                className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white"
              >
                <T
                  textKey="dashboard.social.favoriteGalleries.explore"
                  fallback="Esplora"
                />
              </a>
            </div>

            {favoriteGalleries.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm leading-6 text-neutral-500">
                <T
                  textKey="dashboard.social.favoriteGalleries.empty"
                  fallback="Non hai ancora salvato gallerie."
                />
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {favoriteGalleries.slice(0, 5).map((gallery) => (
                  <a
                    key={gallery.id}
                    href={`/gallerie/${gallery.slug}`}
                    className="block overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 transition hover:border-neutral-500"
                  >
                    {gallery.cover_image_url && (
                      <img
                        src={gallery.cover_image_url}
                        alt={gallery.title}
                        className="h-28 w-full object-cover"
                      />
                    )}

                    <div className="p-4">
                      <p className="font-medium text-neutral-100">
                        {gallery.title}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        <T
                          textKey="dashboard.social.favoriteGalleries.savedOn"
                          fallback="Salvata il"
                        />{" "}
                        {formatDate(gallery.saved_at)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                  <T
                    textKey="dashboard.social.favoriteArtworks.label"
                    fallback="Preferiti"
                  />
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
                  <T
                    textKey="dashboard.social.favoriteArtworks.title"
                    fallback="Opere salvate"
                  />
                </h2>
              </div>

              <a
                href="/gallerie"
                className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white"
              >
                <T
                  textKey="dashboard.social.favoriteArtworks.explore"
                  fallback="Esplora"
                />
              </a>
            </div>

            {favoriteArtworks.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm leading-6 text-neutral-500">
                <T
                  textKey="dashboard.social.favoriteArtworks.empty"
                  fallback="Non hai ancora salvato opere."
                />
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {favoriteArtworks.slice(0, 5).map((artwork) => (
                  <a
                    key={artwork.id}
                    href={
                      artwork.gallery_slug
                        ? `/gallerie/${artwork.gallery_slug}#catalogo`
                        : "/gallerie"
                    }
                    className="flex gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-500"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-800 bg-black">
                      {artwork.thumbnail_url || artwork.image_url ? (
  <img
    src={artwork.thumbnail_url || artwork.image_url || ""}
    alt={artwork.title}
    className="h-full w-full object-cover"
  />
) : null}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-medium text-neutral-100">
                        {artwork.title}
                      </p>
                      {artwork.artist_name && (
                        <p className="mt-1 truncate text-xs text-neutral-400">
                          {artwork.artist_name}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-neutral-500">
                        {artwork.gallery_title ? (
                          <>
                            <T
                              textKey="dashboard.social.favoriteArtworks.fromGallery"
                              fallback="Da:"
                            />{" "}
                            {artwork.gallery_title}
                          </>
                        ) : (
                          <>
                            <T
                              textKey="dashboard.social.favoriteArtworks.savedOn"
                              fallback="Salvata il"
                            />{" "}
                            {formatDate(artwork.saved_at)}
                          </>
                        )}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                  <T
                    textKey="dashboard.social.recentGalleries.label"
                    fallback="Attività"
                  />
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
                  <T
                    textKey="dashboard.social.recentGalleries.title"
                    fallback="Visitate di recente"
                  />
                </h2>
              </div>

              <a
                href="/gallerie"
                className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white"
              >
                <T
                  textKey="dashboard.social.recentGalleries.galleries"
                  fallback="Gallerie"
                />
              </a>
            </div>

            {recentGalleries.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm leading-6 text-neutral-500">
                <T
                  textKey="dashboard.social.recentGalleries.empty"
                  fallback="Non hai ancora visitato gallerie pubbliche."
                />
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {recentGalleries.slice(0, 5).map((gallery) => (
                  <a
                    key={gallery.id}
                    href={`/gallerie/${gallery.slug}`}
                    className="block overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 transition hover:border-neutral-500"
                  >
                    {gallery.cover_image_url && (
                      <img
                        src={gallery.cover_image_url}
                        alt={gallery.title}
                        className="h-28 w-full object-cover"
                      />
                    )}

                    <div className="p-4">
                      <p className="font-medium text-neutral-100">
                        {gallery.title}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        <T
                          textKey="dashboard.social.recentGalleries.visitedOn"
                          fallback="Visitata il"
                        />{" "}
                        {formatDate(gallery.visited_at)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </DashboardShell>
  );
}
