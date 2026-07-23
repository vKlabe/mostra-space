import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import MuseumHeader from "@/components/site/MuseumHeader";
import FollowProfileButton from "@/components/profiles/FollowProfileButton";
import T from "@/components/i18n/T";

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
  public_featured_enabled: boolean | null;
  public_featured_sort_order: number | null;
  public_highlight_enabled: boolean | null;
  public_highlight_sort_order: number | null;
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

type LiveGuidedVisit = {
  gallery_event_id: string | null;
  is_active: boolean;
  access_mode: string | null;
  voice_mode: string | null;
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

function formatShortDate(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAccessModeLabel(value: string | null | undefined) {
  if (value === "password") {
    return "Password";
  }

  if (value === "invite_only") {
    return "Solo invito";
  }

  if (value === "private_link") {
    return "Link privato";
  }

  return "Pubblico";
}

function getVoiceModeLabel(value: string | null | undefined) {
  if (value === "everyone") {
    return "Tutti parlano";
  }

  if (value === "request_to_speak") {
    return "Richiesta parola";
  }

  return "Owner-led";
}

function sortByDateAscending(a: GalleryEvent, b: GalleryEvent) {
  return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
}

function sortCuratedEvents(
  a: GalleryEvent,
  b: GalleryEvent,
  sortKey: "public_featured_sort_order" | "public_highlight_sort_order"
) {
  const sortA = a[sortKey] ?? 100;
  const sortB = b[sortKey] ?? 100;

  if (sortA !== sortB) {
    return sortA - sortB;
  }

  return sortByDateAscending(a, b);
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

  const { data: eventsResult } = await admin
    .from("gallery_events")
    .select(
      "id, owner_id, gallery_id, title, description, starts_at, ends_at, timezone, status, public_featured_enabled, public_featured_sort_order, public_highlight_enabled, public_highlight_sort_order"
    )
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true });

  const safeEvents = (eventsResult || []) as unknown as GalleryEvent[];
  const now = new Date();

  const upcomingEvents = safeEvents
    .filter(
      (event) =>
        (event.status === "scheduled" || event.status === "live") &&
        new Date(event.ends_at) > now
    )
    .sort(sortByDateAscending);

  const pastEvents = safeEvents
    .filter(
      (event) =>
        event.status === "completed" || new Date(event.ends_at) <= now
    )
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
    .slice(0, 8);

  const galleryIds = Array.from(
    new Set(safeEvents.map((event) => event.gallery_id))
  );
  const ownerIds = Array.from(new Set(safeEvents.map((event) => event.owner_id)));
  const eventIds = safeEvents.map((event) => event.id);

  const { data: galleriesResult } =
    galleryIds.length > 0
      ? await admin
          .from("galleries")
          .select("id, title, slug, status, cover_image_url")
          .in("id", galleryIds)
      : { data: [] };

  const { data: profilesResult } =
    ownerIds.length > 0
      ? await admin
          .from("profiles")
          .select(
            "id, display_name, full_name, email, profile_slug, public_profile_enabled"
          )
          .in("id", ownerIds)
      : { data: [] };

  const { data: liveVisitsResult } =
    eventIds.length > 0
      ? await admin
          .from("gallery_live_events")
          .select("gallery_event_id, is_active, access_mode, voice_mode")
          .in("gallery_event_id", eventIds)
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
    ((galleriesResult || []) as unknown as Gallery[]).map((gallery) => [
      gallery.id,
      gallery,
    ])
  );

  const profileById = new Map(
    ((profilesResult || []) as unknown as Profile[]).map((profile) => [
      profile.id,
      profile,
    ])
  );

  const liveByEventId = new Map(
    ((liveVisitsResult || []) as unknown as LiveGuidedVisit[])
      .filter((item) => item.gallery_event_id)
      .map((item) => [item.gallery_event_id as string, item])
  );

  const followedIds = new Set(
    ((followRows || []) as unknown as FollowRow[]).map((row) => row.following_id)
  );

  const followerCounts = ((followerRows || []) as unknown as FollowerCountRow[]).reduce(
    (map, row) => {
      map.set(row.following_id, (map.get(row.following_id) || 0) + 1);
      return map;
    },
    new Map<string, number>()
  );

  const featuredEvent =
    upcomingEvents
      .filter((event) => event.public_featured_enabled)
      .sort((a, b) => sortCuratedEvents(a, b, "public_featured_sort_order"))[0] ||
    upcomingEvents[0] ||
    null;

  const featuredId = featuredEvent?.id || null;

  const highlightedEvents = upcomingEvents
    .filter(
      (event) =>
        event.id !== featuredId && event.public_highlight_enabled === true
    )
    .sort((a, b) => sortCuratedEvents(a, b, "public_highlight_sort_order"));

  const sliderEvents =
    highlightedEvents.length > 0
      ? highlightedEvents.slice(0, 8)
      : upcomingEvents.filter((event) => event.id !== featuredId).slice(0, 8);

  const sliderIds = new Set(sliderEvents.map((event) => event.id));

  const remainingEvents = upcomingEvents.filter(
    (event) => event.id !== featuredId && !sliderIds.has(event.id)
  );

  function getEventHref(event: GalleryEvent) {
    const gallery = galleryById.get(event.gallery_id);

    if (gallery?.status === "published") {
      return `/gallerie/${gallery.slug}`;
    }

    return `/eventi`;
  }

  function renderBadges(event: GalleryEvent) {
    const gallery = galleryById.get(event.gallery_id);
    const liveVisit = liveByEventId.get(event.id);

    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-amber-900 bg-amber-950/30 px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-200">
          {event.status === "live" ? "Live" : "Evento"}
        </span>

        {liveVisit?.is_active && (
          <span className="rounded-full border border-sky-800 bg-sky-950/30 px-3 py-1 text-xs uppercase tracking-[0.16em] text-sky-200">
            Live guided visit · {getAccessModeLabel(liveVisit.access_mode)} ·{" "}
            {getVoiceModeLabel(liveVisit.voice_mode)}
          </span>
        )}

        {gallery && (
          <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-400">
            {gallery.title}
          </span>
        )}
      </div>
    );
  }

  function renderOwnerLine(event: GalleryEvent) {
    const owner = profileById.get(event.owner_id);
    const ownerName = getProfileName(owner);
    const ownerProfileHref =
      owner?.profile_slug && owner.public_profile_enabled
        ? `/profili/${owner.profile_slug}`
        : null;

    return (
      <p className="mt-2 text-sm text-neutral-500">
        A cura di{" "}
        {ownerProfileHref ? (
          <Link
            href={ownerProfileHref}
            className="text-neutral-200 underline decoration-neutral-700 underline-offset-4 transition hover:text-white"
          >
            {ownerName || "Profilo mostra.space"}
          </Link>
        ) : (
          <span className="text-neutral-200">
            {ownerName || "Profilo mostra.space"}
          </span>
        )}
      </p>
    );
  }

  function renderFollowButton(event: GalleryEvent) {
    const owner = profileById.get(event.owner_id);

    if (!owner) {
      return null;
    }

    return (
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
    );
  }

  return (
    <>
      <MuseumHeader />

      <main className="museum-page min-h-screen overflow-hidden px-4 py-12 text-[var(--museum-ivory)] md:px-8">
        <section className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="museum-label text-[var(--museum-bronze-light)]">
                <T textKey="events.header.label" fallback="Calendario pubblico" />
              </p>

              <h1 className="museum-title mt-4 text-6xl md:text-8xl">
                <T textKey="events.header.title" fallback="Eventi su mostra.space" />
              </h1>

              <p className="museum-subtitle mt-5 max-w-3xl text-sm leading-7 text-[var(--museum-stone)] md:text-base">
                <T
                  textKey="events.header.subtitle"
                  fallback="Vernissage digitali, visite guidate, opening online e appuntamenti collegati alle gallerie pubbliche della piattaforma."
                />
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/profili" className="museum-button-secondary px-5 py-2.5">
                Esplora profili
              </Link>

              <Link
                href="/account/calendario"
                className="museum-button-primary px-5 py-2.5"
              >
                Il mio calendario
              </Link>
            </div>
          </div>

          {featuredEvent ? (
            <section className="mt-12 overflow-hidden rounded-[2.5rem] border border-[rgba(197,151,94,0.45)] bg-[radial-gradient(circle_at_top_left,rgba(197,151,94,0.2),transparent_26rem),rgba(18,18,18,0.96)] shadow-[var(--museum-shadow-soft)]">
              <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="min-h-[360px] bg-black">
                  {galleryById.get(featuredEvent.gallery_id)?.cover_image_url ? (
                    <img
                      src={galleryById.get(featuredEvent.gallery_id)?.cover_image_url || ""}
                      alt={featuredEvent.title}
                      className="h-full min-h-[360px] w-full object-cover opacity-85"
                    />
                  ) : (
                    <div className="flex h-full min-h-[360px] items-center justify-center text-xs uppercase tracking-[0.35em] text-neutral-600">
                      Featured event
                    </div>
                  )}
                </div>

                <div className="p-8 md:p-10">
                  <p className="museum-label text-[var(--museum-bronze-light)]">
                    Evento in evidenza
                  </p>

                  <div className="mt-5">{renderBadges(featuredEvent)}</div>

                  <h2 className="museum-title mt-7 text-5xl md:text-7xl">
                    {featuredEvent.title}
                  </h2>

                  <p className="mt-5 text-base font-medium text-[var(--museum-bronze-light)]">
                    {formatDate(featuredEvent.starts_at)}
                  </p>

                  {renderOwnerLine(featuredEvent)}

                  {featuredEvent.description && (
                    <p className="mt-6 max-w-3xl text-sm leading-8 text-[var(--museum-stone)]">
                      {featuredEvent.description}
                    </p>
                  )}

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href={getEventHref(featuredEvent)}
                      className="museum-button-primary px-6 py-3"
                    >
                      Apri galleria
                    </Link>

                    {renderFollowButton(featuredEvent)}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="mt-12 rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] p-8 text-sm text-[var(--museum-stone)]">
              Nessun evento programmato al momento.
            </section>
          )}

          {sliderEvents.length > 0 && (
            <section className="mt-14">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="museum-label">Eventi selezionati</p>
                  <h2 className="museum-title mt-3 text-5xl">
                    Da non perdere.
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-[var(--museum-stone-muted)]">
                  Una selezione editoriale degli appuntamenti più rilevanti:
                  opening, guided visits e presentazioni pubbliche.
                </p>
              </div>

              <div className="mt-7 flex gap-5 overflow-x-auto pb-4">
                {sliderEvents.map((event) => {
                  const gallery = galleryById.get(event.gallery_id);

                  return (
                    <article
                      key={event.id}
                      className="min-w-[320px] max-w-[360px] overflow-hidden rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] shadow-[var(--museum-shadow-soft)]"
                    >
                      <Link href={getEventHref(event)}>
                        <div className="h-48 bg-black">
                          {gallery?.cover_image_url ? (
                            <img
                              src={gallery.cover_image_url}
                              alt={event.title}
                              className="h-full w-full object-cover transition duration-500 hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.3em] text-neutral-600">
                              No cover
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="p-5">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--museum-bronze-light)]">
                          {formatShortDate(event.starts_at)}
                        </p>

                        <h3 className="mt-3 font-editorial text-3xl leading-tight text-[var(--museum-ivory)]">
                          {event.title}
                        </h3>

                        <p className="mt-2 text-xs text-[var(--museum-stone-muted)]">
                          {gallery?.title || "Galleria rimossa"}
                        </p>

                        <div className="mt-4">{renderBadges(event)}</div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mt-14">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="museum-label">Calendario</p>
                <h2 className="museum-title mt-3 text-5xl">
                  Tutti gli altri eventi.
                </h2>
              </div>
              <p className="text-sm text-[var(--museum-stone-muted)]">
                Ordinati dal più vicino al più lontano.
              </p>
            </div>

            {remainingEvents.length === 0 ? (
              <div className="mt-7 rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] p-6 text-sm text-[var(--museum-stone)]">
                Non ci sono altri eventi programmati.
              </div>
            ) : (
              <div className="mt-7 grid gap-5">
                {remainingEvents.map((event) => {
                  const gallery = galleryById.get(event.gallery_id);
                  const canOpenGallery = gallery?.status === "published";

                  return (
                    <article
                      key={event.id}
                      className="grid overflow-hidden rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] shadow-[var(--museum-shadow-soft)] md:grid-cols-[260px_1fr]"
                    >
                      <div className="min-h-[220px] bg-black">
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
                        {renderBadges(event)}

                        <h3 className="mt-4 font-editorial text-4xl leading-tight text-[var(--museum-ivory)]">
                          {event.title}
                        </h3>

                        <p className="mt-3 text-sm font-medium text-[var(--museum-bronze-light)]">
                          {formatDate(event.starts_at)}
                        </p>

                        {renderOwnerLine(event)}

                        {event.description && (
                          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--museum-stone)]">
                            {event.description}
                          </p>
                        )}

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                          {canOpenGallery && gallery ? (
                            <Link
                              href={`/gallerie/${gallery.slug}`}
                              className="museum-button-primary px-5 py-2.5"
                            >
                              Apri galleria
                            </Link>
                          ) : (
                            <span className="rounded-full border border-[var(--museum-border)] px-5 py-2 text-sm text-[var(--museum-stone-muted)]">
                              Galleria in preparazione
                            </span>
                          )}

                          {renderFollowButton(event)}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {pastEvents.length > 0 && (
            <section className="mt-16">
              <p className="museum-label">Archivio</p>
              <h2 className="museum-title mt-3 text-4xl">Eventi passati</h2>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {pastEvents.map((event) => {
                  const gallery = galleryById.get(event.gallery_id);

                  return (
                    <article
                      key={event.id}
                      className="rounded-[1.5rem] border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-5"
                    >
                      <p className="text-xs text-[var(--museum-stone-muted)]">
                        {formatShortDate(event.starts_at)}
                      </p>
                      <h3 className="mt-2 text-lg font-medium text-[var(--museum-ivory-soft)]">
                        {event.title}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--museum-stone-muted)]">
                        {gallery?.title || "Galleria rimossa"}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </section>
      </main>
    </>
  );
}
