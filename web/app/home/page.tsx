import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import HomeProfileAvatar from "@/components/home/HomeProfileAvatar";
import LegalFooter from "@/components/legal/LegalFooter";
import {
  PersonalHomeText,
  type PersonalHomeTextKey,
} from "@/components/home/personal/PersonalHomeText";
import MuseumHeader from "@/components/site/MuseumHeader";
import { BlackWeekBanner } from "@/components/billing/BlackWeek";
import LocalDateTime from "@/components/time/LocalDateTime";
import { getArtworkCardUrl } from "@/lib/artworks/imageUrls";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home",
  description: "Il tuo spazio personale per scoprire arte su Mostra.Space.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

type ViewerProfile = {
  id: string;
  role: "user" | "gallerist" | "admin";
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

const homeWidth = "mx-auto w-full max-w-[86rem] px-4 sm:px-6 lg:px-10";
const matteCard = "overflow-hidden rounded-[1.25rem] border border-[var(--museum-border)] bg-[var(--museum-surface)]";
const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--museum-bronze-light)]";
const smallLink = "inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[var(--museum-bronze-light)] underline-offset-4 hover:underline " + focusRing;
const cardLink = "group block min-w-0 motion-safe:transition-colors hover:border-[var(--museum-bronze)] " + focusRing;

function uniqueById<T extends { id: string }>(items: T[]) {
  return items.filter(
    (item, index) => items.findIndex((candidate) => candidate.id === item.id) === index
  );
}

function CoverImage({
  src,
  sizes,
  eager = false,
}: {
  src: string;
  sizes: string;
  eager?: boolean;
}) {
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      unoptimized
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.035]"
    />
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M2.5 8h10.25m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionHeading({
  id,
  title,
  href,
  action,
}: {
  id: string;
  title: PersonalHomeTextKey;
  href: string;
  action: PersonalHomeTextKey;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4">
      <h2 id={id} className="font-editorial text-[1.8rem] leading-tight text-[var(--museum-ivory)] sm:text-[2rem]">
        <PersonalHomeText text={title} />
      </h2>
      <Link href={href} className={smallLink}>
        <PersonalHomeText text={action} />
        <Arrow />
      </Link>
    </div>
  );
}

function ProfileRow({ profile }: { profile: PublicProfile }) {
  const name = getName(profile) || "Mostra.Space";
  return (
    <Link
      href={"/profili/" + profile.profile_slug}
      className={"flex min-w-0 items-center gap-3 rounded-xl px-2.5 py-2.5 text-[var(--museum-ivory)] hover:bg-white/5 " + focusRing}
    >
      <div className="shrink-0" aria-hidden="true">
        <HomeProfileAvatar src={profile.avatar_url} name={name} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        {profile.bio && (
          <p className="mt-0.5 line-clamp-2 break-words text-xs leading-5 text-[var(--museum-stone)]">{profile.bio}</p>
        )}
      </div>
      <span className="text-[var(--museum-bronze-light)]"><Arrow /></span>
    </Link>
  );
}

function StatusRow({ status, profile }: { status: ProfileStatus; profile: PublicProfile }) {
  const name = getName(profile) || "Mostra.Space";
  return (
    <Link
      href={"/profili/" + profile.profile_slug + "#stato"}
      className={"block min-w-0 rounded-lg py-2 text-[var(--museum-ivory)] hover:bg-white/5 " + focusRing}
    >
      <div className="flex items-center gap-2.5">
        <div className="shrink-0" aria-hidden="true">
          <HomeProfileAvatar src={profile.avatar_url} name={name} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="mt-0.5 text-xs text-[var(--museum-stone)]">
            <LocalDateTime value={status.created_at} format="date" />
          </p>
        </div>
      </div>
      <p className="mt-2 line-clamp-3 break-words text-sm leading-5 text-[var(--museum-ivory-soft)]">
        {status.content}
      </p>
    </Link>
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
        "id, role, display_name, full_name, avatar_url, profile_slug, public_profile_enabled"
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
      ? user.user_metadata.display_name.trim()
      : null) ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : null) ||
    null;

  const canCreate = viewerProfile?.role === "gallerist" || viewerProfile?.role === "admin";
  const displayAvatar = viewerProfile?.avatar_url || null;
  const galleryWork = featuredArtworks.find((artwork) => artwork.gallerySlug === featuredGallery?.slug);
  const featuredCover = featuredGallery?.cover_image_url || (galleryWork ? getArtworkCardUrl(galleryWork) : null);
  const otherGalleries = featuredGalleries.slice(1);
  const agendaEvents = uniqueById(featuredEvent ? [featuredEvent, ...events] : events).slice(0, 3);
  const followedUpdates = statuses.flatMap((status) => {
    const profile = followedProfilesById.get(status.profile_id);
    return profile ? [{ status, profile }] : [];
  });
  const firstSuggestion = followedUpdates.length === 0 ? suggestions[0] : undefined;
  const profilesToDiscover = firstSuggestion ? suggestions.slice(1) : suggestions;
  const savedLinks = [
    { href: "/account/opere-preferite", label: "savedWorks" },
    { href: "/dashboard/social#salvati", label: "savedGalleries" },
    { href: "/dashboard/social#visite-recenti", label: "recentVisits" },
  ] as const;

  return (
    <main className="museum-page min-h-screen">
      <MuseumHeader initialAccountName={displayName || "Dashboard"} />

      <div className={homeWidth}>
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            {displayName && (
              <div className="hidden shrink-0 sm:block" aria-hidden="true">
                <HomeProfileAvatar src={displayAvatar} name={displayName} />
              </div>
            )}
            <h1 id="personal-greeting" className="min-w-0 break-words font-editorial text-[clamp(1.7rem,3vw,2.5rem)] leading-tight text-[var(--museum-ivory)]">
              {displayName ? <><PersonalHomeText text="welcome" /> {displayName}</> : <PersonalHomeText text="welcomeGeneric" />}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/gallerie" className="museum-button-primary min-h-11 px-3.5 py-2 text-xs">
              <PersonalHomeText text="exploreGalleries" />
            </Link>
            <Link href="/profili" className={smallLink}>
              <PersonalHomeText text="profiles" />
              <Arrow />
            </Link>
            {canCreate && (
              <Link href="/dashboard" className={smallLink}>
                <PersonalHomeText text="studio" />
                <Arrow />
              </Link>
            )}
          </div>
        </header>

        <div id="personal-dispatch" className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {featuredGallery ? (
            <section aria-labelledby="personal-feature-title" className="min-w-0">
              <Link href={"/gallerie/" + featuredGallery.slug} className={matteCard + " " + cardLink}>
                {featuredCover && (
                  <div className="relative aspect-video overflow-hidden bg-[var(--museum-charcoal)] md:aspect-[2.35/1]">
                    <CoverImage src={featuredCover} sizes="(min-width: 1024px) 58vw, 100vw" eager />
                  </div>
                )}
                <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3 p-4 sm:p-5">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="text-xs font-semibold text-[var(--museum-bronze-light)]">
                      <PersonalHomeText text="galleryFocus" />
                    </p>
                    <h2 id="personal-feature-title" className="mt-1 break-words font-editorial text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-[var(--museum-ivory)]">
                      {featuredGallery.title}
                    </h2>
                    {featuredGallery.description && (
                      <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-[var(--museum-stone)]">
                        {featuredGallery.description}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--museum-bronze-light)]">
                    <PersonalHomeText text="visitGallery" />
                    <Arrow />
                  </span>
                </div>
              </Link>
            </section>
          ) : featuredEvent ? (
            <section aria-labelledby="personal-feature-title" className={matteCard + " px-4 py-5 sm:p-6"}>
              <p className="text-xs font-semibold text-[var(--museum-bronze-light)]">
                <PersonalHomeText text={featuredEvent.status === "live" ? "live" : "eventFocus"} />
              </p>
              <h2 id="personal-feature-title" className="mt-1 break-words font-editorial text-3xl text-[var(--museum-ivory)]">
                {featuredEvent.title}
              </h2>
              <p className="my-2 text-sm text-[var(--museum-stone)]">
                <LocalDateTime value={featuredEvent.starts_at} format="datetime-weekday" timeZone={featuredEvent.timezone} />
              </p>
              <Link href="/eventi" className={smallLink}>
                <PersonalHomeText text="allEvents" />
                <Arrow />
              </Link>
            </section>
          ) : (
            <section aria-labelledby="personal-feature-title" className={matteCard + " px-4 py-5 sm:p-6"}>
              <h2 id="personal-feature-title" className="font-editorial text-3xl text-[var(--museum-ivory)]">
                <PersonalHomeText text="keepExploring" />
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--museum-stone)]">
                <PersonalHomeText text="noGallery" />
              </p>
              <Link href="/gallerie" className={smallLink}>
                <PersonalHomeText text="exploreGalleries" />
                <Arrow />
              </Link>
            </section>
          )}

          <section id="seguiti" aria-labelledby="personal-followed-title" className={matteCard + " min-w-0 scroll-mt-24 p-4 sm:p-5"}>
            <SectionHeading
              id="personal-followed-title"
              title="followed"
              href="/dashboard/social/rete?tab=following"
              action="yourNetwork"
            />
            {followedUpdates.length > 0 ? (
              <>
                <ul className="divide-y divide-[var(--museum-border)]">
                  {followedUpdates.slice(0, 2).map(({ status, profile }) => (
                    <li key={status.id} className="py-1">
                      <StatusRow status={status} profile={profile} />
                    </li>
                  ))}
                </ul>
                {followedUpdates.length > 2 && (
                  <details className="mt-2 border-t border-[var(--museum-border)]">
                    <summary className={"min-h-11 cursor-pointer rounded-lg py-3 text-sm font-medium text-[var(--museum-bronze-light)] " + focusRing}>
                      <PersonalHomeText text="moreUpdates" />
                    </summary>
                    <ul className="divide-y divide-[var(--museum-border)]">
                      {followedUpdates.slice(2).map(({ status, profile }) => (
                        <li key={status.id} className="py-1">
                          <StatusRow status={status} profile={profile} />
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            ) : (
              <>
                <p className="max-w-md text-sm leading-6 text-[var(--museum-stone)]">
                  <PersonalHomeText text={followingIds.length ? "noUpdates" : "noFollowing"} />
                </p>
                {firstSuggestion ? (
                  <div className="mt-3 border-t border-[var(--museum-border)] pt-2">
                    <p className="mb-1 text-xs font-medium text-[var(--museum-bronze-light)]">
                      <PersonalHomeText text="discoverProfiles" />
                    </p>
                    <ProfileRow profile={firstSuggestion} />
                  </div>
                ) : (
                  <Link href="/profili" className={smallLink + " mt-1"}>
                    <PersonalHomeText text="exploreProfiles" />
                    <Arrow />
                  </Link>
                )}
              </>
            )}
            {featuredGallery && featuredEvent && (
              <Link
                href="#personal-agenda"
                className={"mt-3 flex min-h-11 items-start justify-between gap-3 rounded-lg border-t border-[var(--museum-border)] pt-3 hover:bg-white/5 " + focusRing}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--museum-bronze-light)]">
                    <PersonalHomeText text={featuredEvent.status === "live" ? "live" : "agenda"} />
                  </p>
                  <p className="mt-0.5 break-words text-sm font-semibold text-[var(--museum-ivory)]">{featuredEvent.title}</p>
                  <p className="mt-1 text-xs text-[var(--museum-stone)]">
                    <LocalDateTime value={featuredEvent.starts_at} format="datetime-weekday" timeZone={featuredEvent.timezone} />
                  </p>
                </div>
                <span className="mt-1 text-[var(--museum-bronze-light)]"><Arrow /></span>
              </Link>
            )}
          </section>
        </div>
      </div>

      <BlackWeekBanner />

      <section id="personal-shortcuts" aria-labelledby="personal-shortcuts-title" className={homeWidth + " py-5 sm:py-6"}>
        <div className={matteCard + " flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-5"}>
          <h2 id="personal-shortcuts-title" className="text-sm font-semibold text-[var(--museum-ivory)]">
            <PersonalHomeText text="yourActivity" />
          </h2>
          <ul className="flex min-w-0 flex-wrap gap-x-1">
            {savedLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={smallLink}><PersonalHomeText text={item.label} /></Link>
              </li>
            ))}
            <li><Link href="/dashboard/social" className={smallLink}><PersonalHomeText text="social" /></Link></li>
          </ul>
        </div>
      </section>

      <div className={homeWidth + " grid min-w-0 items-start gap-6 pb-7 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"}>
        <div id="personal-discover" className="min-w-0 scroll-mt-24 space-y-6">
          {otherGalleries.length > 0 && (
            <section aria-labelledby="personal-galleries-title">
              <SectionHeading id="personal-galleries-title" title="browseGalleries" href="/gallerie" action="exploreGalleries" />
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {otherGalleries.map((gallery) => (
                  <li key={gallery.id} className="min-w-0">
                    <Link href={"/gallerie/" + gallery.slug} className={matteCard + " " + cardLink + " h-full"}>
                      {gallery.cover_image_url && (
                        <div className="relative aspect-[2/1] overflow-hidden bg-[var(--museum-charcoal)]">
                          <CoverImage src={gallery.cover_image_url} sizes="(min-width: 640px) 25vw, 100vw" />
                        </div>
                      )}
                      <div className="p-3.5">
                        <p className="break-words font-editorial text-xl leading-tight text-[var(--museum-ivory)]">{gallery.title}</p>
                        {gallery.published_at && (
                          <p className="mt-1 text-xs text-[var(--museum-stone)]">
                            <LocalDateTime value={gallery.published_at} format="date" />
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {featuredArtworks.length > 0 && (
            <section aria-labelledby="personal-artworks-title">
              <SectionHeading id="personal-artworks-title" title="browseWorks" href="/gallerie" action="exploreGalleries" />
              <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {featuredArtworks.map((artwork) => {
                  const cover = getArtworkCardUrl(artwork);
                  return (
                    <li key={artwork.id} className="min-w-0">
                      <Link href={"/gallerie/" + artwork.gallerySlug + "#catalogo"} className={matteCard + " " + cardLink + " h-full"}>
                        {cover && (
                          <div className="relative aspect-square overflow-hidden bg-[var(--museum-charcoal)]">
                            <CoverImage src={cover} sizes="(min-width: 1280px) 14vw, 47vw" />
                          </div>
                        )}
                        <div className="p-3">
                          <p className="break-words font-editorial text-lg leading-tight text-[var(--museum-ivory)]">{artwork.title}</p>
                          {artwork.artist_name && (
                            <p className="mt-1 break-words text-xs leading-5 text-[var(--museum-stone)]">{artwork.artist_name}</p>
                          )}
                          <p className="mt-1 break-words text-xs leading-5 text-[var(--museum-bronze-light)]">{artwork.galleryTitle}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {profilesToDiscover.length > 0 && (
            <section aria-labelledby="personal-profiles-title">
              <SectionHeading id="personal-profiles-title" title="discoverProfiles" href="/profili" action="browsePeople" />
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {profilesToDiscover.map((profile) => (
                  <li key={profile.id} className={matteCard + " min-w-0 p-1"}>
                    <ProfileRow profile={profile} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-5">
          <section id="personal-agenda" aria-labelledby="personal-agenda-title" className={matteCard + " scroll-mt-24 p-4 sm:p-5"}>
            <SectionHeading id="personal-agenda-title" title="agenda" href="/eventi" action="allEvents" />
            {agendaEvents.length > 0 ? (
              <ul className="divide-y divide-[var(--museum-border)]">
                {agendaEvents.map((event) => {
                  const owner = eventOwnersById.get(event.owner_id);
                  const gallery = eventGalleriesById.get(event.gallery_id) || galleriesById.get(event.gallery_id);
                  const heading = owner ? getName(owner) : null;
                  return (
                    <li key={event.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[var(--museum-bronze-light)]">
                        <LocalDateTime value={event.starts_at} format="datetime-weekday" timeZone={event.timezone} />
                        {event.status === "live" && <PersonalHomeText text="live" />}
                      </div>
                      <h3 className="mt-1 break-words text-base font-semibold leading-snug text-[var(--museum-ivory)]">{event.title}</h3>
                      {heading && <p className="mt-1 break-words text-xs text-[var(--museum-stone)]">{heading}</p>}
                      {event.description && (
                        <p className="mt-1 line-clamp-2 break-words text-sm leading-5 text-[var(--museum-stone)]">{event.description}</p>
                      )}
                      {gallery?.status === "published" && (
                        <Link href={"/gallerie/" + gallery.slug} className={smallLink + " -ml-2"}>
                          <PersonalHomeText text="galleryLink" />
                          <Arrow />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-[var(--museum-stone)]"><PersonalHomeText text="noEvents" /></p>
            )}
          </section>

          {canCreate ? (
            <section aria-labelledby="personal-studio-title" className={matteCard + " p-4"}>
              <h2 id="personal-studio-title" className="text-base font-semibold text-[var(--museum-ivory)]">
                <PersonalHomeText text="studio" />
              </h2>
              <div className="mt-1 flex flex-wrap gap-x-1">
                <Link href="/dashboard/gallerie" className={smallLink}><PersonalHomeText text="manageGalleries" /></Link>
                <Link href="/dashboard/opere" className={smallLink}><PersonalHomeText text="manageWorks" /></Link>
              </div>
            </section>
          ) : null}
          <div className="flex flex-wrap gap-x-1">
            {!canCreate && <Link href="/dashboard" className={smallLink}><PersonalHomeText text="dashboard" /></Link>}
            <Link href="/account" className={smallLink}><PersonalHomeText text="account" /></Link>
          </div>
        </aside>
      </div>

      <LegalFooter />
    </main>
  );
}
