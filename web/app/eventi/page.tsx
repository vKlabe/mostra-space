import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import FollowProfileButton from "@/components/profiles/FollowProfileButton";

type GalleryEvent = {
  id: string;
  owner_id: string;
  gallery_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: "scheduled" | "live" | "completed" | "cancelled";
};

type Gallery = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  cover_image_url: string | null;
};

type Profile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  email: string | null;
  profile_slug: string | null;
  public_profile_enabled: boolean;
};

type FollowRow = {
  following_id: string;
};

type FollowerCountRow = {
  following_id: string;
};

function getProfileName(profile: Profile | undefined) {
  return (
    profile?.display_name ||
    profile?.full_name ||
    profile?.email?.split("@")[0] ||
    "Profilo mostra.space"
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMonthKey(value: string) {
  return new Date(value).toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });
}

function groupByMonth(events: GalleryEvent[]) {
  const grouped = new Map<string, GalleryEvent[]>();

  for (const event of events) {
    const key = getMonthKey(event.starts_at);
    grouped.set(key, [...(grouped.get(key) || []), event]);
  }

  return Array.from(grouped.entries());
}

export default async function PublicEventsPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  await admin
    .from("gallery_events")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in("status", ["scheduled", "live"])
    .lte("ends_at", new Date().toISOString());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: events } = await admin
    .from("gallery_events")
    .select(
      "id, owner_id, gallery_id, title, description, starts_at, ends_at, timezone, status"
    )
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true });

  const safeEvents = (events || []) as GalleryEvent[];
  const now = new Date();

  const upcomingEvents = safeEvents.filter(
    (event) =>
      (event.status === "scheduled" || event.status === "live") &&
      new Date(event.ends_at) > now
  );

  const pastEvents = safeEvents
    .filter(
      (event) =>
        event.status === "completed" || new Date(event.ends_at) <= now
    )
    .slice(-12)
    .reverse();

  const galleryIds = Array.from(new Set(safeEvents.map((event) => event.gallery_id)));
  const ownerIds = Array.from(new Set(safeEvents.map((event) => event.owner_id)));

  const { data: galleries } =
    galleryIds.length > 0
      ? await admin
          .from("galleries")
          .select("id, title, slug, status, cover_image_url")
          .in("id", galleryIds)
      : { data: [] };

  const { data: profiles } =
    ownerIds.length > 0
      ? await admin
          .from("profiles")
          .select(
            "id, display_name, full_name, email, profile_slug, public_profile_enabled"
          )
          .in("id", ownerIds)
      : { data: [] };

  const { data: followRows } = user
    ? await admin
        .from("account_follows")
        .select("following_id")
        .eq("follower_id", user.id)
    : { data: [] };

  const { data: followerRows } =
    ownerIds.length > 0
      ? await admin
          .from("account_follows")
          .select("following_id")
          .in("following_id", ownerIds)
      : { data: [] };

  const galleryById = new Map(
    ((galleries || []) as Gallery[]).map((gallery) => [gallery.id, gallery])
  );

  const profileById = new Map(
    ((profiles || []) as Profile[]).map((profile) => [profile.id, profile])
  );

  const followedIds = new Set(
    ((followRows || []) as FollowRow[]).map((row) => row.following_id)
  );

  const followerCounts = ((followerRows || []) as FollowerCountRow[]).reduce(
    (map, row) => {
      map.set(row.following_id, (map.get(row.following_id) || 0) + 1);
      return map;
    },
    new Map<string, number>()
  );

  function renderEventCard(event: GalleryEvent) {
    const gallery = galleryById.get(event.gallery_id);
    const owner = profileById.get(event.owner_id);
    const ownerName = getProfileName(owner);
    const ownerProfileHref =
      owner?.profile_slug && owner.public_profile_enabled
        ? `/profili/${owner.profile_slug}`
        : null;

    const canOpenGallery = gallery?.status === "published";

    return (
      <article
        key={event.id}
        className="grid overflow-hidden rounded-[2rem] border border-neutral-800 bg-neutral-950 md:grid-cols-[280px_1fr]"
      >
        <div className="min-h-[220px] bg-neutral-900">
          {gallery?.cover_image_url ? (
            <img
              src={gallery.cover_image_url}
              alt={gallery.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[220px] items-center justify-center text-xs uppercase tracking-[0.25em] text-neutral-600">
              No cover
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber-900 bg-amber-950/30 px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-200">
              {event.status === "live" ? "Live" : "Evento"}
            </span>

            {gallery && (
              <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-400">
                {gallery.title}
              </span>
            )}
          </div>

          <h2 className="font-serif text-3xl text-neutral-50">{event.title}</h2>

          <p className="mt-3 text-sm font-medium text-amber-200">
            {formatDate(event.starts_at)}
          </p>

          <p className="mt-2 text-sm text-neutral-500">
            A cura di{" "}
            {ownerProfileHref ? (
              <a
                href={ownerProfileHref}
                className="text-neutral-200 underline decoration-neutral-700 underline-offset-4 transition hover:text-white"
              >
                {ownerName}
              </a>
            ) : (
              <span className="text-neutral-200">{ownerName}</span>
            )}
          </p>

          {event.description && (
            <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-400">
              {event.description}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {canOpenGallery && gallery ? (
              <a
                href={`/gallerie/${gallery.slug}`}
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                Apri galleria
              </a>
            ) : (
              <span className="rounded-full border border-neutral-800 px-5 py-2 text-sm text-neutral-500">
                Galleria in preparazione
              </span>
            )}

            {owner && (
              <FollowProfileButton
                profileId={owner.id}
                initialIsFollowing={followedIds.has(owner.id)}
                initialFollowerCount={followerCounts.get(owner.id) || 0}
                canFollow={Boolean(user)}
                isOwnProfile={user?.id === owner.id}
                label="Segui gallerista"
                followingLabel="Segui già"
                size="sm"
                showCount={false}
              />
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
      <section className="mx-auto max-w-6xl">
        <p className="mb-4 text-xs uppercase tracking-[0.35em] text-amber-500">
          Calendario pubblico
        </p>

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="font-serif text-5xl">Eventi su mostra.space</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-400">
              Vernissage digitali, visite guidate e appuntamenti collegati alle
              gallerie pubbliche della piattaforma.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/profili"
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              Esplora profili
            </a>

            <a
              href="/account/calendario"
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              Il mio calendario
            </a>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="font-serif text-3xl">Prossimi eventi</h2>

          {upcomingEvents.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">
              Nessun evento programmato al momento.
            </div>
          ) : (
            <div className="mt-6 space-y-8">
              {groupByMonth(upcomingEvents).map(([month, monthEvents]) => (
                <section key={month}>
                  <h3 className="mb-4 text-xs uppercase tracking-[0.25em] text-neutral-500">
                    {month}
                  </h3>
                  <div className="space-y-5">
                    {monthEvents.map((event) => renderEventCard(event))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        {pastEvents.length > 0 && (
          <section className="mt-12">
            <h2 className="font-serif text-3xl">Eventi passati</h2>
            <div className="mt-6 space-y-5">
              {pastEvents.map((event) => renderEventCard(event))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
