import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import MuseumHeader from "@/components/site/MuseumHeader";
import FollowProfileButton from "@/components/profiles/FollowProfileButton";
import T from "@/components/i18n/T";

type PublicEventsPageProps = {
  searchParams?: Promise<{
    privateToken?: string;
  }>;
};

type EventAccessMode = "public" | "password" | "invite_only" | "private_link";

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
  access_mode: EventAccessMode;
  private_token: string | null;
  is_listed: boolean;
  public_featured_enabled: boolean;
  public_featured_sort_order: number;
  public_highlight_enabled: boolean;
  public_highlight_sort_order: number;
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

type EventInviteRow = {
  event_id: string;
};

type LiveEventRow = {
  gallery_event_id: string | null;
  is_active: boolean;
};

function getProfileName(profile: Profile | undefined) {
  return (
    profile?.display_name ||
    profile?.full_name ||
    profile?.email?.split("@")[0] ||
    null
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

function getAccessBadge(mode: EventAccessMode) {
  if (mode === "password") {
    return {
      textKey: "events.card.access.password",
      fallback: "Password",
      className: "border-yellow-900 bg-yellow-950/30 text-yellow-200",
    };
  }

  if (mode === "invite_only") {
    return {
      textKey: "events.card.access.inviteOnly",
      fallback: "Solo invito",
      className: "border-sky-900 bg-sky-950/30 text-sky-200",
    };
  }

  if (mode === "private_link") {
    return {
      textKey: "events.card.access.privateLink",
      fallback: "Link privato",
      className: "border-violet-900 bg-violet-950/30 text-violet-200",
    };
  }

  return {
    textKey: "events.card.access.public",
    fallback: "Pubblico",
    className: "border-neutral-800 bg-neutral-950 text-neutral-300",
  };
}

export default async function PublicEventsPage({
  searchParams,
}: PublicEventsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const privateToken = resolvedSearchParams.privateToken || "";

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

  const nowIso = new Date().toISOString();

  const { data: publicEventsData } = await admin
    .from("gallery_events")
    .select(
      "id, owner_id, gallery_id, title, description, starts_at, ends_at, timezone, status, access_mode, private_token, is_listed, public_featured_enabled, public_featured_sort_order, public_highlight_enabled, public_highlight_sort_order"
    )
    .neq("status", "cancelled")
    .eq("is_listed", true)
    .gt("ends_at", nowIso)
    .order("starts_at", { ascending: true });

  const { data: invitedRows } = user
    ? await admin
        .from("gallery_event_invites")
        .select("event_id")
        .eq("user_id", user.id)
        .neq("status", "revoked")
    : { data: [] };

  const invitedEventIds = ((invitedRows || []) as EventInviteRow[]).map(
    (row) => row.event_id
  );

  const { data: invitedEventsData } =
    invitedEventIds.length > 0
      ? await admin
          .from("gallery_events")
          .select(
            "id, owner_id, gallery_id, title, description, starts_at, ends_at, timezone, status, access_mode, private_token, is_listed, public_featured_enabled, public_featured_sort_order, public_highlight_enabled, public_highlight_sort_order"
          )
          .in("id", invitedEventIds)
          .neq("status", "cancelled")
          .gt("ends_at", nowIso)
      : { data: [] };

  const { data: privateEventData } = privateToken
    ? await admin
        .from("gallery_events")
        .select(
          "id, owner_id, gallery_id, title, description, starts_at, ends_at, timezone, status, access_mode, private_token, is_listed, public_featured_enabled, public_featured_sort_order, public_highlight_enabled, public_highlight_sort_order"
        )
        .eq("private_token", privateToken)
        .neq("status", "cancelled")
        .gt("ends_at", nowIso)
        .maybeSingle()
    : { data: null };

  const eventsById = new Map<string, GalleryEvent>();

  for (const event of (publicEventsData || []) as unknown as GalleryEvent[]) {
    eventsById.set(event.id, event);
  }

  for (const event of (invitedEventsData || []) as unknown as GalleryEvent[]) {
    eventsById.set(event.id, event);
  }

  if (privateEventData) {
    const event = privateEventData as unknown as GalleryEvent;
    eventsById.set(event.id, event);
  }

  const allUpcomingEvents = Array.from(eventsById.values()).sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  const featuredEvent =
    allUpcomingEvents
      .filter((event) => event.public_featured_enabled)
      .sort(
        (a, b) =>
          a.public_featured_sort_order - b.public_featured_sort_order ||
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      )[0] || allUpcomingEvents[0] || null;

  const highlightEvents = allUpcomingEvents
    .filter((event) => event.public_highlight_enabled && event.id !== featuredEvent?.id)
    .sort(
      (a, b) =>
        a.public_highlight_sort_order - b.public_highlight_sort_order ||
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    )
    .slice(0, 8);

  const regularEvents = allUpcomingEvents.filter(
    (event) => event.id !== featuredEvent?.id && !highlightEvents.some((item) => item.id === event.id)
  );

  const { data: pastEventsData } = await admin
    .from("gallery_events")
    .select(
      "id, owner_id, gallery_id, title, description, starts_at, ends_at, timezone, status, access_mode, private_token, is_listed, public_featured_enabled, public_featured_sort_order, public_highlight_enabled, public_highlight_sort_order"
    )
    .in("access_mode", ["public", "password"])
    .neq("status", "cancelled")
    .lte("ends_at", nowIso)
    .order("starts_at", { ascending: false })
    .limit(12);

  const pastEvents = (pastEventsData || []) as unknown as GalleryEvent[];

  const allEventsForRelations = [...allUpcomingEvents, ...pastEvents];
  const galleryIds = Array.from(
    new Set(allEventsForRelations.map((event) => event.gallery_id))
  );
  const ownerIds = Array.from(
    new Set(allEventsForRelations.map((event) => event.owner_id))
  );
  const eventIds = allEventsForRelations.map((event) => event.id);

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

  const { data: liveEvents } =
    eventIds.length > 0
      ? await admin
          .from("gallery_live_events")
          .select("gallery_event_id, is_active")
          .in("gallery_event_id", eventIds)
          .eq("is_active", true)
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

  const liveEventIds = new Set(
    ((liveEvents || []) as LiveEventRow[])
      .map((event) => event.gallery_event_id)
      .filter(Boolean) as string[]
  );

  function renderEventCard(event: GalleryEvent, variant: "featured" | "slider" | "list" = "list") {
    const gallery = galleryById.get(event.gallery_id);
    const owner = profileById.get(event.owner_id);
    const ownerName = getProfileName(owner);
    const ownerProfileHref =
      owner?.profile_slug && owner.public_profile_enabled
        ? `/profili/${owner.profile_slug}`
        : null;
    const canOpenGallery = gallery?.status === "published";
    const accessBadge = getAccessBadge(event.access_mode || "public");
    const hasLiveGuidedVisit = liveEventIds.has(event.id);

    return (
      <article
        key={event.id}
        className={
          variant === "featured"
            ? "grid overflow-hidden rounded-[2.4rem] border border-amber-900/60 bg-[radial-gradient(circle_at_top_left,rgba(217,119,6,0.18),transparent_32%),#0a0a0a] shadow-2xl md:grid-cols-[0.95fr_1.05fr]"
            : variant === "slider"
              ? "min-w-[320px] max-w-[360px] overflow-hidden rounded-[2rem] border border-neutral-800 bg-neutral-950"
              : "grid overflow-hidden rounded-[2rem] border border-neutral-800 bg-neutral-950 md:grid-cols-[280px_1fr]"
        }
      >
        <div className={variant === "featured" ? "min-h-[360px] bg-neutral-900" : "min-h-[220px] bg-neutral-900"}>
          {gallery?.cover_image_url ? (
            <img
              src={gallery.cover_image_url}
              alt={gallery.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[220px] items-center justify-center text-xs uppercase tracking-[0.25em] text-neutral-600">
              <T textKey="events.card.noCover" fallback="No cover" />
            </div>
          )}
        </div>

        <div className={variant === "featured" ? "p-8 md:p-10" : "p-6"}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber-900 bg-amber-950/30 px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-200">
              {event.status === "live" ? (
                <T textKey="events.card.statusLive" fallback="Live" />
              ) : (
                <T textKey="events.card.statusEvent" fallback="Evento" />
              )}
            </span>

            <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${accessBadge.className}`}>
              <T textKey={accessBadge.textKey} fallback={accessBadge.fallback} />
            </span>

            {hasLiveGuidedVisit && (
              <span className="rounded-full border border-sky-900 bg-sky-950/30 px-3 py-1 text-xs uppercase tracking-[0.14em] text-sky-200">
                Live guided visit
              </span>
            )}

            {gallery && (
              <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-400">
                {gallery.title}
              </span>
            )}
          </div>

          <h2 className={variant === "featured" ? "font-serif text-5xl text-neutral-50 md:text-6xl" : "font-serif text-3xl text-neutral-50"}>
            {event.title}
          </h2>

          <p className="mt-3 text-sm font-medium text-amber-200">
            {formatDate(event.starts_at)}
          </p>

          <p className="mt-2 text-sm text-neutral-500">
            <T textKey="events.card.curatedBy" fallback="A cura di" />{" "}
            {ownerProfileHref ? (
              <a
                href={ownerProfileHref}
                className="text-neutral-200 underline decoration-neutral-700 underline-offset-4 transition hover:text-white"
              >
                {ownerName || (
                  <T
                    textKey="events.card.unknownProfile"
                    fallback="Profilo mostra.space"
                  />
                )}
              </a>
            ) : (
              <span className="text-neutral-200">
                {ownerName || (
                  <T
                    textKey="events.card.unknownProfile"
                    fallback="Profilo mostra.space"
                  />
                )}
              </span>
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
                <T textKey="events.card.openGallery" fallback="Apri galleria" />
              </a>
            ) : (
              <span className="rounded-full border border-neutral-800 px-5 py-2 text-sm text-neutral-500">
                <T
                  textKey="events.card.galleryInPreparation"
                  fallback="Galleria in preparazione"
                />
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
    <>
      <MuseumHeader />
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
        <section className="mx-auto max-w-7xl">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-amber-500">
            <T textKey="events.header.label" fallback="Calendario pubblico" />
          </p>

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="font-serif text-5xl md:text-6xl">
                <T textKey="events.header.title" fallback="Eventi su mostra.space" />
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-400">
                <T
                  textKey="events.header.subtitle"
                  fallback="Vernissage digitali, visite guidate e appuntamenti collegati alle gallerie pubbliche della piattaforma."
                />
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/profili"
                className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
              >
                <T textKey="events.header.exploreProfiles" fallback="Esplora profili" />
              </a>

              <a
                href="/account/calendario"
                className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
              >
                <T textKey="events.header.myCalendar" fallback="Il mio calendario" />
              </a>
            </div>
          </div>

          {featuredEvent ? (
            <section className="mt-10">
              <p className="mb-4 text-xs uppercase tracking-[0.25em] text-neutral-500">
                <T textKey="events.featured.label" fallback="Evento in evidenza" />
              </p>
              {renderEventCard(featuredEvent, "featured")}
            </section>
          ) : (
            <section className="mt-10 rounded-3xl border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">
              <T
                textKey="events.upcoming.empty"
                fallback="Nessun evento programmato al momento."
              />
            </section>
          )}

          {highlightEvents.length > 0 && (
            <section className="mt-12">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                    <T textKey="events.highlights.label" fallback="Da non perdere" />
                  </p>
                  <h2 className="mt-2 font-serif text-3xl">
                    <T textKey="events.highlights.title" fallback="Eventi selezionati" />
                  </h2>
                </div>
              </div>
              <div className="flex gap-5 overflow-x-auto pb-4">
                {highlightEvents.map((event) => renderEventCard(event, "slider"))}
              </div>
            </section>
          )}

          <section className="mt-12">
            <h2 className="font-serif text-3xl">
              <T textKey="events.upcoming.title" fallback="Tutti gli eventi" />
            </h2>

            {regularEvents.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">
                <T
                  textKey="events.upcoming.emptyOtherEvents"
                  fallback="Non ci sono altri eventi programmati."
                />
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                {regularEvents.map((event) => renderEventCard(event, "list"))}
              </div>
            )}
          </section>

          {pastEvents.length > 0 && (
            <section className="mt-12">
              <h2 className="font-serif text-3xl">
                <T textKey="events.past.title" fallback="Eventi passati" />
              </h2>
              <div className="mt-6 space-y-5">
                {pastEvents.map((event) => renderEventCard(event, "list"))}
              </div>
            </section>
          )}
        </section>
      </main>
    </>
  );
}
