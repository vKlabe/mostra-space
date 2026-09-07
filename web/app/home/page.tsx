import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import HomeProfileAvatar from "@/components/home/HomeProfileAvatar";
import LegalFooter from "@/components/legal/LegalFooter";
import T from "@/components/i18n/T";
import MuseumHeader from "@/components/site/MuseumHeader";
import LocalDateTime from "@/components/time/LocalDateTime";
import { getArtworkCardUrl } from "@/lib/artworks/imageUrls";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home | Mostra.Space",
  description: "Il tuo spazio personale per scoprire arte su Mostra.Space.",
  robots: {
    index: false,
    follow: false,
  },
};

type ViewerProfile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  profile_slug: string | null;
  public_profile_enabled: boolean;
};

type PublicGallery = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
};

type GallerySlot = {
  slot_key: "main" | "featured_1" | "featured_2" | "featured_3";
  gallery_id: string | null;
};

type GalleryEvent = {
  id: string;
  owner_id: string;
  gallery_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: "scheduled" | "live";
  access_mode: "public" | "password";
  public_featured_enabled: boolean;
  public_featured_sort_order: number;
};

type PublicProfile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_slug: string;
  public_profile_enabled: boolean;
  created_at: string;
};

type FollowRow = {
  following_id: string;
};

type ProfileStatus = {
  id: string;
  profile_id: string;
  content: string;
  created_at: string;
};

type ArtworkPlacement = {
  artwork_id: string;
  gallery_id: string;
  sort_order: number;
};

type PublicArtwork = {
  id: string;
  title: string;
  artist_name: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  card_url: string | null;
  optimized_url: string | null;
};

type FeaturedArtwork = PublicArtwork & {
  galleryTitle: string;
  gallerySlug: string;
};

function getName(profile: {
  display_name: string | null;
  full_name: string | null;
}) {
  return profile.display_name || profile.full_name || null;
}

function getInitials(value: string | null | undefined) {
  if (!value) {
    return "M";
  }

  return (
    value
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "M"
  );
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return items.filter(
    (item, index) => items.findIndex((candidate) => candidate.id === item.id) === index
  );
}

function CoverImage({
  src,
  alt,
  eager = false,
}: {
  src: string | null;
  alt: string;
  eager?: boolean;
}) {
  if (!src) {
    return (
      <div className="flex h-full min-h-full items-center justify-center bg-[radial-gradient(circle_at_35%_15%,rgba(243,237,226,0.22),transparent_11rem),linear-gradient(135deg,rgba(168,121,69,0.24),rgba(8,7,5,0.96))] px-6 text-center font-editorial text-4xl text-[var(--museum-ivory-soft)]">
        {getInitials(alt)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
    />
  );
}

function SectionHeading({
  eyebrowKey,
  eyebrowFallback,
  titleKey,
  titleFallback,
  descriptionKey,
  descriptionFallback,
  href,
  actionKey,
  actionFallback,
}: {
  eyebrowKey: string;
  eyebrowFallback: string;
  titleKey: string;
  titleFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
  href: string;
  actionKey: string;
  actionFallback: string;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="museum-label">
          <T textKey={eyebrowKey} fallback={eyebrowFallback} />
        </p>
        <h2 className="mt-3 font-editorial text-4xl leading-none text-[var(--museum-ivory)] md:text-5xl">
          <T textKey={titleKey} fallback={titleFallback} />
        </h2>
        <p className="museum-subtitle mt-3 max-w-2xl text-sm text-[var(--museum-stone)]">
          <T textKey={descriptionKey} fallback={descriptionFallback} />
        </p>
      </div>
      <Link
        href={href}
        className="museum-button-secondary w-full shrink-0 px-5 py-3 sm:w-auto"
      >
        <T textKey={actionKey} fallback={actionFallback} />
      </Link>
    </div>
  );
}

export default async function AuthenticatedHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const [
    profileResult,
    galleriesResult,
    gallerySlotsResult,
    eventsResult,
    followsResult,
    profilesResult,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, display_name, full_name, avatar_url, profile_slug, public_profile_enabled"
      )
      .eq("id", user.id)
      .maybeSingle<ViewerProfile>(),
    admin
      .from("galleries")
      .select(
        "id, owner_id, title, slug, description, status, cover_image_url, published_at, created_at"
      )
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(24),
    admin.from("public_gallery_slots").select("slot_key, gallery_id"),
    admin
      .from("gallery_events")
      .select(
        "id, owner_id, gallery_id, title, description, starts_at, ends_at, timezone, status, access_mode, public_featured_enabled, public_featured_sort_order"
      )
      .in("status", ["scheduled", "live"])
      .in("access_mode", ["public", "password"])
      .eq("is_listed", true)
      .gt("ends_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(24),
    admin
      .from("account_follows")
      .select("following_id")
      .eq("follower_id", user.id),
    admin
      .from("profiles")
      .select(
        "id, display_name, full_name, avatar_url, bio, profile_slug, public_profile_enabled, created_at"
      )
      .eq("public_profile_enabled", true)
      .not("profile_slug", "is", null)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const viewerProfile = profileResult.data;
  const galleries = (galleriesResult.data || []) as PublicGallery[];
  const gallerySlots = (gallerySlotsResult.data || []) as GallerySlot[];
  const events = (eventsResult.data || []) as GalleryEvent[];
  const followRows = (followsResult.data || []) as FollowRow[];
  const publicProfiles = (profilesResult.data || []) as PublicProfile[];
  const followingIds = followRows.map((row) => row.following_id);
  const followingSet = new Set(followingIds);

  const galleriesById = new Map(galleries.map((gallery) => [gallery.id, gallery]));
  const gallerySlotIds = new Map(
    gallerySlots.map((slot) => [slot.slot_key, slot.gallery_id])
  );
  const galleryFromSlot = (slotKey: GallerySlot["slot_key"]) => {
    const galleryId = gallerySlotIds.get(slotKey);
    return galleryId ? galleriesById.get(galleryId) || null : null;
  };

  const featuredGalleries = uniqueById(
    [
      galleryFromSlot("main"),
      galleryFromSlot("featured_1"),
      galleryFromSlot("featured_2"),
      galleryFromSlot("featured_3"),
      ...galleries,
    ].filter((gallery): gallery is PublicGallery => Boolean(gallery))
  ).slice(0, 4);
  const featuredGallery = featuredGalleries[0] || null;

  const featuredEvent =
    [...events]
      .filter((event) => event.public_featured_enabled)
      .sort(
        (left, right) =>
          left.public_featured_sort_order - right.public_featured_sort_order ||
          new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime()
      )[0] || events[0] || null;

  const eventGalleryIds = Array.from(
    new Set(events.map((event) => event.gallery_id))
  );
  const eventOwnerIds = Array.from(new Set(events.map((event) => event.owner_id)));
  const publicGalleryIds = galleries.map((gallery) => gallery.id);

  const [
    followedProfilesResult,
    statusesResult,
    eventGalleriesResult,
    eventOwnersResult,
    placementsResult,
  ] = await Promise.all([
    followingIds.length > 0
      ? admin
          .from("profiles")
          .select(
            "id, display_name, full_name, avatar_url, bio, profile_slug, public_profile_enabled, created_at"
          )
          .in("id", followingIds)
          .eq("public_profile_enabled", true)
          .not("profile_slug", "is", null)
      : Promise.resolve({ data: [] }),
    followingIds.length > 0
      ? admin
          .from("profile_statuses")
          .select("id, profile_id, content, created_at")
          .in("profile_id", followingIds)
          .eq("is_current", true)
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
    eventGalleryIds.length > 0
      ? admin
          .from("galleries")
          .select("id, owner_id, title, slug, description, status, cover_image_url, published_at, created_at")
          .in("id", eventGalleryIds)
      : Promise.resolve({ data: [] }),
    eventOwnerIds.length > 0
      ? admin
          .from("profiles")
          .select(
            "id, display_name, full_name, avatar_url, bio, profile_slug, public_profile_enabled, created_at"
          )
          .in("id", eventOwnerIds)
          .eq("public_profile_enabled", true)
          .not("profile_slug", "is", null)
      : Promise.resolve({ data: [] }),
    publicGalleryIds.length > 0
      ? admin
          .from("gallery_artworks")
          .select("artwork_id, gallery_id, sort_order")
          .in("gallery_id", publicGalleryIds)
          .limit(80)
      : Promise.resolve({ data: [] }),
  ]);

  const followedProfiles = (followedProfilesResult.data || []) as PublicProfile[];
  const followedProfilesById = new Map(
    followedProfiles.map((profile) => [profile.id, profile])
  );
  const statuses = ((statusesResult.data || []) as ProfileStatus[]).filter((status) =>
    followedProfilesById.has(status.profile_id)
  );

  const eventGalleries = (eventGalleriesResult.data || []) as PublicGallery[];
  const eventGalleriesById = new Map(
    eventGalleries.map((gallery) => [gallery.id, gallery])
  );
  const eventOwners = (eventOwnersResult.data || []) as PublicProfile[];
  const eventOwnersById = new Map(eventOwners.map((profile) => [profile.id, profile]));

  const suggestions = publicProfiles
    .filter((profile) => profile.id !== user.id && !followingSet.has(profile.id))
    .slice(0, 4);

  const featuredGalleryRank = new Map(
    featuredGalleries.map((gallery, index) => [gallery.id, index])
  );
  const placements = ((placementsResult.data || []) as ArtworkPlacement[])
    .filter((placement, index, allPlacements) =>
      allPlacements.findIndex(
        (candidate) => candidate.artwork_id === placement.artwork_id
      ) === index
    )
    .sort((left, right) => {
      const galleryRankDifference =
        (featuredGalleryRank.get(left.gallery_id) ?? 999) -
        (featuredGalleryRank.get(right.gallery_id) ?? 999);

      return galleryRankDifference || left.sort_order - right.sort_order;
    })
    .slice(0, 16);
  const placedArtworkIds = placements.map((placement) => placement.artwork_id);

  const artworksResult =
    placedArtworkIds.length > 0
      ? await admin
          .from("artworks")
          .select(
            "id, title, artist_name, image_url, thumbnail_url, card_url, optimized_url"
          )
          .in("id", placedArtworkIds)
          .eq("is_public", true)
      : { data: [] };

  const artworksById = new Map(
    ((artworksResult.data || []) as PublicArtwork[]).map((artwork) => [
      artwork.id,
      artwork,
    ])
  );
  const featuredArtworks = placements
    .map((placement) => {
      const artwork = artworksById.get(placement.artwork_id);
      const gallery = galleriesById.get(placement.gallery_id);

      if (!artwork || !gallery) {
        return null;
      }

      return {
        ...artwork,
        galleryTitle: gallery.title,
        gallerySlug: gallery.slug,
      };
    })
    .filter((artwork): artwork is FeaturedArtwork => Boolean(artwork))
    .slice(0, 4);

  const displayName =
    (viewerProfile && getName(viewerProfile)) ||
    (typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : null) ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null) ||
    "Mostra.Space";

  const featuredEventGalleryCandidate = featuredEvent
    ? eventGalleriesById.get(featuredEvent.gallery_id) ||
      galleriesById.get(featuredEvent.gallery_id) ||
      null
    : null;
  const featuredEventGallery =
    featuredEventGalleryCandidate?.status === "published"
      ? featuredEventGalleryCandidate
      : null;
  const featuredEventOwner = featuredEvent
    ? eventOwnersById.get(featuredEvent.owner_id) || null
    : null;

  return (
    <main className="museum-page min-h-screen overflow-hidden">
      <MuseumHeader />

      <section className="border-b border-[var(--museum-border)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:px-8 md:py-14 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch">
          <div className="museum-card-soft relative overflow-hidden rounded-[2rem] p-6 sm:p-8 md:p-10">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[rgba(168,121,69,0.14)] blur-3xl" />
            <div className="relative">
              <p className="museum-label">
                <T textKey="authHome.hero.eyebrow" fallback="Il tuo spazio" />
              </p>
              <h1 className="museum-title mt-5 max-w-3xl text-5xl text-[var(--museum-ivory)] sm:text-6xl md:text-7xl">
                <T textKey="authHome.hero.welcome" fallback="Bentornato," />{" "}
                {displayName}.
              </h1>
              <p className="museum-subtitle mt-6 max-w-2xl text-sm text-[var(--museum-stone)] sm:text-base">
                <T
                  textKey="authHome.hero.description"
                  fallback="Scopri cosa c’è di nuovo nella tua rete, entra nelle gallerie e continua il tuo percorso su Mostra.Space."
                />
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/dashboard" className="museum-button-primary px-6 py-3.5">
                  <T textKey="authHome.hero.dashboard" fallback="Entra nella dashboard" />
                </Link>
                <Link
                  href="/dashboard/social"
                  className="museum-button-secondary px-6 py-3.5"
                >
                  <T textKey="authHome.hero.social" fallback="Apri il tuo spazio social" />
                </Link>
                <Link href="/account" className="museum-button-secondary px-6 py-3.5">
                  <T textKey="authHome.hero.account" fallback="Gestisci account" />
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            {[
              ["/gallerie", "authHome.quick.galleries", "Gallerie"],
              ["/eventi", "authHome.quick.events", "Eventi"],
              ["/profili", "authHome.quick.profiles", "Profili"],
              ["/account/opere-preferite", "authHome.quick.favorites", "Preferiti"],
            ].map(([href, textKey, fallback]) => (
              <Link
                key={href}
                href={href}
                className="group flex min-h-28 flex-col justify-between rounded-[1.5rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] p-4 transition hover:border-[var(--museum-bronze)] sm:min-h-32 sm:p-5"
              >
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
                  <T textKey={textKey} fallback={fallback} />
                </span>
                <span className="text-right text-2xl text-[var(--museum-bronze-light)] transition group-hover:translate-x-1">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
        <SectionHeading
          eyebrowKey="authHome.featured.eyebrow"
          eyebrowFallback="Selezione editoriale"
          titleKey="authHome.featured.title"
          titleFallback="In primo piano"
          descriptionKey="authHome.featured.description"
          descriptionFallback="Una galleria e un appuntamento scelti per iniziare la tua visita."
          href="/gallerie"
          actionKey="authHome.gallery.explore"
          actionFallback="Esplora le gallerie"
        />

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          {featuredGallery ? (
            <Link
              href={`/gallerie/${featuredGallery.slug}`}
              className="group relative min-h-[430px] overflow-hidden rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-charcoal)] shadow-[var(--museum-shadow-soft)] sm:min-h-[500px]"
            >
              <div className="absolute inset-0">
                <CoverImage
                  src={featuredGallery.cover_image_url}
                  alt={featuredGallery.title}
                  eager
                />
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,7,5,0.05),rgba(8,7,5,0.9))]" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <p className="museum-label">
                  <T textKey="authHome.gallery.label" fallback="Galleria in evidenza" />
                </p>
                <h2 className="mt-3 font-editorial text-4xl leading-none text-[var(--museum-ivory)] sm:text-5xl">
                  {featuredGallery.title}
                </h2>
                {featuredGallery.description && (
                  <p className="mt-4 line-clamp-3 max-w-2xl text-sm leading-6 text-[var(--museum-ivory-soft)]">
                    {featuredGallery.description}
                  </p>
                )}
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--museum-bronze-light)]">
                  <T textKey="authHome.gallery.open" fallback="Entra nella galleria →" />
                </p>
              </div>
            </Link>
          ) : (
            <div className="museum-card flex min-h-[360px] flex-col justify-end rounded-[2rem] p-7">
              <p className="museum-label">
                <T textKey="authHome.gallery.label" fallback="Galleria in evidenza" />
              </p>
              <h2 className="mt-3 font-editorial text-4xl text-[var(--museum-ivory)]">
                <T
                  textKey="authHome.gallery.emptyTitle"
                  fallback="Nuovi spazi in arrivo"
                />
              </h2>
              <p className="mt-4 text-sm leading-6 text-[var(--museum-stone)]">
                <T
                  textKey="authHome.gallery.emptyBody"
                  fallback="Le prossime gallerie pubblicate appariranno qui."
                />
              </p>
            </div>
          )}

          {featuredEvent ? (
            <article className="group overflow-hidden rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] shadow-[var(--museum-shadow-soft)]">
              <div className="aspect-[16/10] overflow-hidden bg-[var(--museum-charcoal)] lg:aspect-auto lg:h-[245px]">
                <CoverImage
                  src={featuredEventGallery?.cover_image_url || null}
                  alt={featuredEvent.title}
                />
              </div>
              <div className="p-6 sm:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[var(--museum-bronze-dark)] bg-[rgba(168,121,69,0.1)] px-3 py-1 text-[0.65rem] uppercase tracking-[0.15em] text-[var(--museum-bronze-light)]">
                    <T textKey="authHome.event.label" fallback="Evento in evidenza" />
                  </span>
                  {featuredEvent.status === "live" && (
                    <span className="rounded-full border border-red-900/70 bg-red-950/30 px-3 py-1 text-[0.65rem] uppercase tracking-[0.15em] text-red-200">
                      <T textKey="authHome.event.live" fallback="Live" />
                    </span>
                  )}
                </div>
                <h2 className="mt-4 font-editorial text-4xl leading-none text-[var(--museum-ivory)]">
                  {featuredEvent.title}
                </h2>
                <p className="mt-4 text-sm font-medium text-[var(--museum-bronze-light)]">
                  <LocalDateTime
                    value={featuredEvent.starts_at}
                    format="datetime-weekday"
                    timeZone={featuredEvent.timezone}
                  />
                </p>
                {featuredEventOwner && (
                  <p className="mt-2 text-xs text-[var(--museum-stone-muted)]">
                    {getName(featuredEventOwner)}
                  </p>
                )}
                {featuredEvent.description && (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--museum-stone)]">
                    {featuredEvent.description}
                  </p>
                )}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {featuredEventGallery ? (
                    <Link
                      href={`/gallerie/${featuredEventGallery.slug}`}
                      className="museum-button-primary px-5 py-3"
                    >
                      <T textKey="authHome.event.openGallery" fallback="Apri la galleria" />
                    </Link>
                  ) : null}
                  <Link href="/eventi" className="museum-button-secondary px-5 py-3">
                    <T textKey="authHome.event.explore" fallback="Esplora gli eventi" />
                  </Link>
                </div>
              </div>
            </article>
          ) : (
            <div className="museum-card flex min-h-[360px] flex-col justify-end rounded-[2rem] p-7">
              <p className="museum-label">
                <T textKey="authHome.event.label" fallback="Evento in evidenza" />
              </p>
              <h2 className="mt-3 font-editorial text-4xl text-[var(--museum-ivory)]">
                <T
                  textKey="authHome.event.emptyTitle"
                  fallback="Nessun evento programmato"
                />
              </h2>
              <p className="mt-4 text-sm leading-6 text-[var(--museum-stone)]">
                <T
                  textKey="authHome.event.emptyBody"
                  fallback="I prossimi appuntamenti pubblici appariranno qui."
                />
              </p>
              <Link href="/eventi" className="museum-button-secondary mt-6 px-5 py-3">
                <T textKey="authHome.event.explore" fallback="Esplora gli eventi" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-[var(--museum-border)] bg-[rgba(17,16,13,0.55)]">
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
          <SectionHeading
            eyebrowKey="authHome.artworks.eyebrow"
            eyebrowFallback="Catalogo"
            titleKey="authHome.artworks.title"
            titleFallback="Opere in evidenza"
            descriptionKey="authHome.artworks.description"
            descriptionFallback="Una selezione di opere pubbliche dalle gallerie in primo piano."
            href="/gallerie"
            actionKey="authHome.artworks.explore"
            actionFallback="Esplora le opere nelle gallerie"
          />

          {featuredArtworks.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {featuredArtworks.map((artwork) => {
                const imageUrl = getArtworkCardUrl(artwork);

                return (
                  <Link
                    key={artwork.id}
                    href={`/gallerie/${artwork.gallerySlug}#catalogo`}
                    className="group overflow-hidden rounded-[1.4rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] transition hover:border-[var(--museum-bronze)] sm:rounded-[1.75rem]"
                  >
                    <div className="aspect-[4/5] overflow-hidden bg-[var(--museum-charcoal)]">
                      <CoverImage src={imageUrl || null} alt={artwork.title} />
                    </div>
                    <div className="p-4 sm:p-5">
                      <h3 className="line-clamp-2 font-editorial text-xl leading-tight text-[var(--museum-ivory)] sm:text-2xl">
                        {artwork.title}
                      </h3>
                      {artwork.artist_name && (
                        <p className="mt-2 truncate text-xs text-[var(--museum-stone)]">
                          {artwork.artist_name}
                        </p>
                      )}
                      <p className="mt-3 line-clamp-1 text-[0.68rem] uppercase tracking-[0.12em] text-[var(--museum-stone-muted)]">
                        {artwork.galleryTitle}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="museum-card rounded-[1.75rem] p-6 text-sm leading-6 text-[var(--museum-stone)]">
              <T
                textKey="authHome.artworks.emptyBody"
                fallback="Le opere pubbliche delle gallerie in evidenza appariranno qui."
              />
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:px-8 md:py-16 xl:grid-cols-[1.15fr_0.85fr]">
        <div>
          <SectionHeading
            eyebrowKey="authHome.network.eyebrow"
            eyebrowFallback="La tua rete"
            titleKey="authHome.network.title"
            titleFallback="Stati recenti"
            descriptionKey="authHome.network.description"
            descriptionFallback="Gli aggiornamenti correnti pubblicati dai profili che segui."
            href="/dashboard/social/rete?tab=following"
            actionKey="authHome.network.manage"
            actionFallback="Gestisci la rete"
          />

          {statuses.length > 0 ? (
            <div className="space-y-4">
              {statuses.map((status) => {
                const profile = followedProfilesById.get(status.profile_id);

                if (!profile) {
                  return null;
                }

                const name = getName(profile) || "Mostra.Space";

                return (
                  <Link
                    key={status.id}
                    href={`/profili/${profile.profile_slug}#stato`}
                    className="group block rounded-[1.75rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] p-5 transition hover:border-[var(--museum-bronze)] sm:p-6"
                  >
                    <div className="flex items-center gap-3">
                      <HomeProfileAvatar src={profile.avatar_url} name={name} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--museum-ivory)]">
                          {name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--museum-stone-muted)]">
                          <LocalDateTime value={status.created_at} format="date" />
                        </p>
                      </div>
                    </div>
                    <blockquote className="mt-5 line-clamp-4 font-editorial text-2xl leading-relaxed text-[var(--museum-ivory-soft)] sm:text-3xl">
                      “{status.content}”
                    </blockquote>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="museum-card rounded-[1.75rem] p-6">
              <h3 className="font-editorial text-3xl text-[var(--museum-ivory)]">
                <T
                  textKey="authHome.network.emptyTitle"
                  fallback="La tua rete è pronta a crescere"
                />
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--museum-stone)]">
                <T
                  textKey="authHome.network.emptyBody"
                  fallback="Segui artisti, galleristi e istituzioni per vedere qui i loro aggiornamenti."
                />
              </p>
              <Link href="/profili" className="museum-button-primary mt-6 px-5 py-3">
                <T textKey="authHome.profiles.explore" fallback="Esplora i profili" />
              </Link>
            </div>
          )}
        </div>

        <div>
          <SectionHeading
            eyebrowKey="authHome.profiles.eyebrow"
            eyebrowFallback="Community"
            titleKey="authHome.profiles.title"
            titleFallback="Profili da scoprire"
            descriptionKey="authHome.profiles.description"
            descriptionFallback="Nuove voci e progetti pubblici presenti su Mostra.Space."
            href="/profili"
            actionKey="authHome.profiles.explore"
            actionFallback="Esplora i profili"
          />

          {suggestions.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {suggestions.map((profile) => {
                const name = getName(profile) || "Mostra.Space";

                return (
                  <Link
                    key={profile.id}
                    href={`/profili/${profile.profile_slug}`}
                    className="group flex items-start gap-4 rounded-[1.5rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] p-4 transition hover:border-[var(--museum-bronze)]"
                  >
                    <HomeProfileAvatar src={profile.avatar_url} name={name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[var(--museum-ivory)]">
                        {name}
                      </p>
                      {profile.bio ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--museum-stone)]">
                          {profile.bio}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-[var(--museum-stone-muted)]">
                          <T
                            textKey="authHome.profiles.publicProfile"
                            fallback="Profilo pubblico Mostra.Space"
                          />
                        </p>
                      )}
                    </div>
                    <span className="mt-3 text-[var(--museum-bronze-light)] transition group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="museum-card rounded-[1.75rem] p-6 text-sm leading-6 text-[var(--museum-stone)]">
              <T
                textKey="authHome.profiles.empty"
                fallback="Hai già scoperto tutti i profili pubblici disponibili."
              />
            </div>
          )}
        </div>
      </section>

      {featuredGalleries.length > 1 && (
        <section className="border-t border-[var(--museum-border)]">
          <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
            <SectionHeading
              eyebrowKey="authHome.moreGalleries.eyebrow"
              eyebrowFallback="Continua a esplorare"
              titleKey="authHome.moreGalleries.title"
              titleFallback="Altre gallerie selezionate"
              descriptionKey="authHome.moreGalleries.description"
              descriptionFallback="Spazi pubblici da visitare direttamente dal browser o dall’app."
              href="/gallerie"
              actionKey="authHome.gallery.explore"
              actionFallback="Esplora le gallerie"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredGalleries.slice(1, 4).map((gallery) => (
                <Link
                  key={gallery.id}
                  href={`/gallerie/${gallery.slug}`}
                  className="group overflow-hidden rounded-[1.75rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] transition hover:border-[var(--museum-bronze)]"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-[var(--museum-charcoal)]">
                    <CoverImage src={gallery.cover_image_url} alt={gallery.title} />
                  </div>
                  <div className="p-5">
                    <h3 className="font-editorial text-3xl leading-none text-[var(--museum-ivory)]">
                      {gallery.title}
                    </h3>
                    {gallery.description && (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--museum-stone)]">
                        {gallery.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <LegalFooter />
    </main>
  );
}
