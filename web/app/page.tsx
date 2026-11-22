import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import JsonLd from "@/components/seo/JsonLd";
import { BlackWeekBanner, BlackWeekPlanPrice } from "@/components/billing/BlackWeek";
import styles from "@/components/home/public/PublicHome.module.css";
import { PublicHomeEventDate, PublicHomeText } from "@/components/home/public/PublicHomeText";
import MuseumHeader from "@/components/site/MuseumHeader";
import LegalFooter from "@/components/legal/LegalFooter";
import { getArtworkCardUrl, type ArtworkImageUrls } from "@/lib/artworks/imageUrls";
import { PLAN_LIMITS } from "@/lib/plans";
import {
  absoluteUrl,
  createPublicMetadata,
  DEFAULT_SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/seo/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = createPublicMetadata({
  title: "Mostra.Space — L’arte senza confini",
  description: DEFAULT_SITE_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
});

const homeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": absoluteUrl("/") + "#organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/pwa/icon-512x512.png"),
      },
    },
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/") + "#website",
      name: SITE_NAME,
      url: absoluteUrl("/"),
      inLanguage: "it-IT",
      publisher: {
        "@id": absoluteUrl("/") + "#organization",
      },
    },
  ],
};

type ViewerClient = Awaited<ReturnType<typeof createClient>>;

type Gallery = {
  id: string;
  slug: string;
  title: string;
  status: string;
  cover_image_url: string | null;
};

type PublicProfile = {
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  profile_slug: string | null;
  public_profile_enabled: boolean;
};

type Artwork = ArtworkImageUrls & {
  id: string;
  title: string;
  artist_name: string | null;
  is_public: boolean;
};

type ArtworkPlacement = {
  gallery_id: string;
  artworks: Artwork | Artwork[] | null;
};

type CataloguePreview = {
  id: string;
  title: string;
  artist: string | null;
  image: string;
  gallery: Gallery;
};

type GalleryEvent = {
  title: string;
  starts_at: string;
  ends_at: string;
  timezone: string | null;
  is_listed: boolean;
  status: string;
  access_mode: string;
};

function galleryPath(slug: string) {
  return "/gallerie/" + encodeURIComponent(slug);
}

function imageSource(value?: string | null) {
  const src = value?.trim();
  if (!src) return null;
  if (src.startsWith("/") && !src.startsWith("//")) return src;
  try {
    return new URL(src).protocol === "https:" ? src : null;
  } catch {
    return null;
  }
}

async function loadGalleries(supabase: ViewerClient) {
  const { data } = await supabase
    .from("galleries")
    .select("id, slug, title, status, cover_image_url")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(6)
    .returns<Gallery[]>();

  return (data ?? []).filter((gallery) => gallery.status === "published" && gallery.slug && gallery.title?.trim());
}

async function loadCataloguePreviews(supabase: ViewerClient, galleries: Gallery[]) {
  if (!galleries.length) return [];

  const galleriesById = new Map(galleries.map((gallery) => [gallery.id, gallery]));
  const { data } = await supabase
    .from("gallery_artworks")
    .select("gallery_id, artworks!inner(id, title, artist_name, image_url, thumbnail_url, card_url, optimized_url, is_public)")
    .in("gallery_id", [...galleriesById.keys()])
    .eq("artworks.is_public", true)
    .order("sort_order")
    .limit(24)
    .returns<ArtworkPlacement[]>();

  const works = new Map<string, CataloguePreview>();
  for (const row of data ?? []) {
    const gallery = galleriesById.get(row.gallery_id);
    const artwork = Array.isArray(row.artworks) ? row.artworks[0] : row.artworks;
    if (!gallery || artwork?.is_public !== true || !artwork.title?.trim() || works.has(artwork.id)) continue;
    const image = imageSource(getArtworkCardUrl(artwork));
    if (!image) continue;

    works.set(artwork.id, {
      id: artwork.id,
      title: artwork.title,
      artist: artwork.artist_name,
      image,
      gallery,
    });
    if (works.size === 4) break;
  }

  return [...works.values()];
}

async function loadPublicCommunity() {
  try {
    // Match the public profile directory and events visibility before selecting any display fields.
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const [profilesResponse, eventsResponse] = await Promise.all([
      admin
        .from("profiles")
        .select("display_name, full_name, avatar_url, profile_slug, public_profile_enabled")
        .eq("public_profile_enabled", true)
        .not("profile_slug", "is", null)
        .order("created_at", { ascending: false })
        .limit(6)
        .returns<PublicProfile[]>(),
      admin
        .from("gallery_events")
        .select("title, starts_at, ends_at, timezone, is_listed, status, access_mode")
        .eq("is_listed", true)
        .eq("access_mode", "public")
        .in("status", ["scheduled", "live"])
        .gt("ends_at", now)
        .order("starts_at", { ascending: true })
        .limit(1)
        .returns<GalleryEvent[]>(),
    ]);

    const profiles = (profilesResponse.data ?? [])
      .flatMap((profile) => {
        const name = profile.display_name?.trim() || profile.full_name?.trim();
        if (profile.public_profile_enabled !== true || !profile.profile_slug || !name) return [];
        return [{ name, slug: profile.profile_slug, image: imageSource(profile.avatar_url) }];
      })
      .slice(0, 4);

    const event = eventsResponse.data?.find((item) =>
      item.is_listed === true && item.access_mode === "public" && item.title?.trim() &&
      (item.status === "scheduled" || item.status === "live") && Date.parse(item.ends_at) > Date.parse(now)
    );

    return { profiles, event };
  } catch {
    return { profiles: [], event: undefined };
  }
}

function featuredGallery(galleries: Gallery[]) {
  return galleries.find((gallery) => imageSource(gallery.cover_image_url)) ?? galleries[0];
}

function GalleryPlaceholder({ loading = false }: { loading?: boolean }) {
  return (
    <Link
      href="/gallerie"
      className="group flex aspect-[5/3] min-h-44 items-end overflow-hidden rounded-2xl border border-[var(--museum-border)] bg-[radial-gradient(ellipse_at_top_right,rgba(168,121,69,0.22),transparent_65%),var(--museum-surface)] p-5 sm:p-8"
    >
      <div className="max-w-xs">
        <p className="font-editorial text-3xl leading-tight text-[var(--museum-ivory)] sm:text-4xl">
          <PublicHomeText id="heroFallback" />
        </p>
        {!loading && (
          <p className="mt-2 text-sm leading-6 text-[var(--museum-stone)]">
            <PublicHomeText id="heroFallbackDescription" />
          </p>
        )}
        <p className="mt-3 text-sm font-medium text-[var(--museum-bronze-light)] group-hover:underline">
          <PublicHomeText id="galleryArchive" /> <span aria-hidden="true">↗</span>
        </p>
      </div>
    </Link>
  );
}

async function HeroGallery({ galleries }: { galleries: Promise<Gallery[]> }) {
  const gallery = featuredGallery(await galleries);
  if (!gallery) return <GalleryPlaceholder />;

  const cover = imageSource(gallery.cover_image_url);
  return (
    <figure className="group relative isolate aspect-[5/3] min-h-44 overflow-hidden rounded-2xl border border-[var(--museum-border)] bg-[radial-gradient(ellipse_at_top_right,rgba(168,121,69,0.22),transparent_65%),var(--museum-surface)]">
      {cover && (
        <>
          <Image
            fill
            unoptimized
            fetchPriority="high"
            loading="eager"
            src={cover}
            alt=""
            sizes="(min-width: 1024px) 55vw, 92vw"
            className="object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-transparent" />
        </>
      )}
      <figcaption className="absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-white/15 bg-[rgba(8,7,5,0.94)] p-3 sm:inset-x-4 sm:bottom-4 sm:p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--museum-ivory-soft)]"><PublicHomeText id="gallery" /></p>
          <p className="mt-1 font-editorial text-3xl leading-none text-[var(--museum-ivory)] [overflow-wrap:anywhere] sm:text-4xl">
            {gallery.title}
          </p>
        </div>
        <Link
          href={galleryPath(gallery.slug)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--museum-border)] bg-[var(--museum-black)]/90 px-3 text-sm font-medium text-[var(--museum-ivory)] transition-colors hover:border-[var(--museum-bronze-light)]"
        >
          <PublicHomeText id="openGallery" /> <span aria-hidden="true">↗</span>
        </Link>
      </figcaption>
    </figure>
  );
}
function ArchiveLink({ href, id }: { href: string; id: "galleryArchive" | "peopleArchive" | "cultureCalendar" | "comparePlans" }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--museum-bronze-light)] underline-offset-4 hover:underline"
    >
      <PublicHomeText id={id} /> <span aria-hidden="true">↗</span>
    </Link>
  );
}

async function GalleryDiscovery({ galleries }: { galleries: Promise<Gallery[]> }) {
  const published = await galleries;
  const featured = featuredGallery(published);
  const remaining = published.filter((gallery) => gallery.id !== featured?.id).slice(0, 3);

  return (
    <section aria-labelledby="public-home-galleries" className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-x-3">
        <h2 id="public-home-galleries" className="font-editorial text-3xl text-[var(--museum-ivory)] sm:text-4xl">
          <PublicHomeText id="discoverHeading" />
        </h2>
        <ArchiveLink href="/gallerie" id="galleryArchive" />
      </div>
      {remaining.length ? (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          {remaining.map((gallery) => {
            const cover = imageSource(gallery.cover_image_url);
            return (
              <li key={gallery.id} className="min-w-0">
                <Link
                  href={galleryPath(gallery.slug)}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--museum-border)] bg-[var(--museum-surface)] transition-colors hover:border-[var(--museum-bronze-light)]"
                >
                  {cover && (
                    <div className="relative aspect-[16/10] overflow-hidden bg-[var(--museum-black)]">
                      <Image fill unoptimized loading="lazy" src={cover} alt="" sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 90vw" className="object-cover" />
                    </div>
                  )}
                  <div className="flex grow items-center justify-between gap-2 p-2 sm:p-3">
                    <span className="font-editorial text-base leading-tight text-[var(--museum-ivory)] [overflow-wrap:anywhere] sm:text-xl">{gallery.title}</span>
                    <span aria-hidden="true" className="hidden text-[var(--museum-bronze-light)] sm:inline">↗</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-[var(--museum-border)] p-4 text-sm leading-6 text-[var(--museum-stone)]">
          <PublicHomeText id="heroFallbackDescription" />
        </p>
      )}
    </section>
  );
}

async function CommunityDiscovery({ community }: { community: ReturnType<typeof loadPublicCommunity> }) {
  const { profiles } = await community;
  return (
    <section aria-labelledby="public-home-community" className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-x-3">
        <h2 id="public-home-community" className="font-editorial text-3xl text-[var(--museum-ivory)] sm:text-4xl">
          <PublicHomeText id="peopleHeading" />
        </h2>
        <ArchiveLink href="/profili" id="peopleArchive" />
      </div>
      {profiles.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {profiles.map((profile) => (
            <li key={profile.slug} className="min-w-0">
              <Link
                href={"/profili/" + encodeURIComponent(profile.slug)}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-[var(--museum-border)] bg-[var(--museum-surface)] p-2.5 transition-colors hover:border-[var(--museum-bronze-light)]"
              >
                <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--museum-black)] text-lg text-[var(--museum-bronze-light)]">
                  {profile.image ? (
                    <Image fill unoptimized loading="lazy" src={profile.image} alt="" sizes="40px" className="object-cover" />
                  ) : (
                    <span aria-hidden="true">{profile.name.slice(0, 1).toUpperCase()}</span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[var(--museum-ivory)] [overflow-wrap:anywhere]">{profile.name}</span>
                  <span className="mt-0.5 block text-xs text-[var(--museum-stone)]"><PublicHomeText id="publicProfile" /></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function ArtworkDiscovery({ artwork }: { artwork: Promise<CataloguePreview[]> }) {
  const works = await artwork;
  if (!works.length) return null;

  return (
    <section aria-labelledby="public-home-artwork" className="border-t border-[var(--museum-border)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8 md:py-12">
        <h2 id="public-home-artwork" className="font-editorial text-3xl text-[var(--museum-ivory)] sm:text-4xl">
          <PublicHomeText id="artHeading" />
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--museum-stone)]">
          <PublicHomeText id="artDescription" />
        </p>
        <ul className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {works.map((work) => (
            <li key={work.id} className="min-w-0">
              <Link
                href={galleryPath(work.gallery.slug) + "#catalogo"}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--museum-border)] bg-[var(--museum-surface)] transition-colors hover:border-[var(--museum-bronze-light)]"
              >
                <div className="relative aspect-[5/4] overflow-hidden bg-[var(--museum-black)]">
                  <Image fill unoptimized loading="lazy" src={work.image} alt="" sizes="(min-width: 1024px) 25vw, 45vw" className="object-contain" />
                </div>
                <div className="flex grow flex-col gap-1 p-3 sm:p-4">
                  <span className="font-editorial text-xl leading-tight text-[var(--museum-ivory)] [overflow-wrap:anywhere] sm:text-2xl">{work.title}</span>
                  {work.artist && <span className="text-sm text-[var(--museum-stone)] [overflow-wrap:anywhere]">{work.artist}</span>}
                  <span className="mt-auto pt-2 text-xs text-[var(--museum-bronze-light)] underline-offset-4 group-hover:underline">
                    <PublicHomeText id="artCatalogue" /> <span className="sr-only"> — {work.gallery.title}</span><span aria-hidden="true"> ↗</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

async function CultureDiscovery({ community }: { community: ReturnType<typeof loadPublicCommunity> }) {
  const { event } = await community;
  return (
    <section aria-labelledby="public-home-culture" className="rounded-2xl border border-[var(--museum-border)] bg-[var(--museum-surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-1">
        <div className="min-w-0">
          <h2 id="public-home-culture" className="font-editorial text-3xl text-[var(--museum-ivory)]"><PublicHomeText id="cultureHeading" /></h2>
          <p className="mt-1 text-sm leading-6 text-[var(--museum-stone)]"><PublicHomeText id="cultureDescription" /></p>
        </div>
        <ArchiveLink href="/eventi" id="cultureCalendar" />
      </div>
      {event && (
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-t border-[var(--museum-border)] pt-4">
          <p className="font-editorial text-xl leading-tight text-[var(--museum-ivory)] [overflow-wrap:anywhere] sm:text-2xl">{event.title}</p>
          <div className="text-sm text-[var(--museum-bronze-light)]"><PublicHomeEventDate value={event.starts_at} timeZone={event.timezone} /></div>
        </div>
      )}
    </section>
  );
}

const audiencePaths = [
  { title: "visitorTitle", description: "visitorDescription", action: "explore", href: "/gallerie" },
  { title: "creatorTitle", description: "creatorDescription", action: "register", href: "/auth/register" },
  { title: "curatorTitle", description: "curatorDescription", action: "templates", href: "/marketplace" },
] as const;

function AudiencePaths() {
  return (
    <section aria-labelledby="public-home-audience" className="mt-9">
      <h2 id="public-home-audience" className="font-editorial text-3xl text-[var(--museum-ivory)] sm:text-4xl">
        <PublicHomeText id="audienceHeading" />
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {audiencePaths.map((item) => (
          <article key={item.title} className="flex min-w-0 flex-col rounded-xl border border-[var(--museum-border)] bg-[var(--museum-surface)] p-4 sm:p-5">
            <h3 className="font-editorial text-2xl leading-tight text-[var(--museum-ivory)]"><PublicHomeText id={item.title} /></h3>
            <p className="mt-2 text-sm leading-6 text-[var(--museum-stone)]"><PublicHomeText id={item.description} /></p>
            <Link href={item.href} className="mt-auto inline-flex min-h-11 items-center gap-2 pt-2 text-sm font-medium text-[var(--museum-bronze-light)] hover:underline">
              <PublicHomeText id={item.action} /> <span aria-hidden="true">↗</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

const publicPlans = ["free", "pro", "business", "diamond"] as const;

function PlanOverview() {
  return (
    <section aria-labelledby="public-home-plans" className="border-y border-[var(--museum-border)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-x-4">
          <h2 id="public-home-plans" className="font-editorial text-3xl text-[var(--museum-ivory)] sm:text-4xl">
            <PublicHomeText id="planHeading" />
          </h2>
          <ArchiveLink href="/pricing" id="comparePlans" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {publicPlans.map((plan) => (
            <Link
              key={plan}
              href={plan === "free" ? "/auth/register" : "/pricing"}
              className="flex min-w-0 flex-col rounded-xl border border-[var(--museum-border)] bg-[var(--museum-surface)] p-3 transition-colors hover:border-[var(--museum-bronze-light)] sm:p-5"
            >
              <span className="text-sm font-semibold text-[var(--museum-ivory)]">{PLAN_LIMITS[plan].label}</span>
              <span className="mt-2 block font-editorial text-2xl leading-tight text-[var(--museum-ivory)] sm:text-3xl">
                <BlackWeekPlanPrice plan={plan === "pro" || plan === "business" ? plan : undefined}>
                  {PLAN_LIMITS[plan].monthlyPriceLabel}
                </BlackWeekPlanPrice>
              </span>
              <span className="mt-auto block pt-3 text-xs font-medium text-[var(--museum-bronze-light)]">
                <PublicHomeText id={plan === "free" ? "freePlanAction" : "planAction"} /> <span aria-hidden="true">↗</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/home");

  const galleries = loadGalleries(supabase);
  const community = loadPublicCommunity();
  const artwork = galleries.then((published) => loadCataloguePreviews(supabase, published));

  return (
    <main className={"museum-page " + styles.page}>
      <JsonLd data={homeStructuredData} />
      <MuseumHeader />

      <section aria-labelledby="public-home-title" className="border-b border-[var(--museum-border)]">
        <div className="mx-auto grid max-w-7xl items-center gap-5 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-9 lg:px-8 lg:py-12">
          <div className="min-w-0">
            <h1 id="public-home-title" className={"font-editorial font-medium leading-[0.98] tracking-tight text-[var(--museum-ivory)] [overflow-wrap:anywhere] " + styles.heroHeading}>
              <span className="block"><PublicHomeText id="heroHeadingFirst" /></span>{" "}
              <span className="block"><PublicHomeText id="heroHeadingSecond" /></span>
            </h1>
            <p className={"mt-3 max-w-lg text-base leading-6 text-[var(--museum-ivory-soft)] sm:mt-5 sm:text-lg sm:leading-7 " + styles.heroDescription}>
              <PublicHomeText id="heroDescription" />
            </p>
            <div className="mt-4 flex flex-col items-start gap-2 sm:mt-6 sm:flex-row sm:flex-wrap">
              <Link href="/auth/register" className="museum-button-primary min-h-11 max-w-full px-4 py-2.5 sm:px-5">
                <PublicHomeText id="register" />
              </Link>
              <Link href="/gallerie" className="museum-button-secondary min-h-11 max-w-full px-4 py-2.5 sm:px-5">
                <PublicHomeText id="explore" />
              </Link>
            </div>
            <p className={"mt-3 max-w-lg text-xs leading-5 text-[var(--museum-stone)] sm:text-sm sm:leading-6 " + styles.heroBenefit}>
              <PublicHomeText id="heroBenefit" />
            </p>
          </div>
          <Suspense fallback={<GalleryPlaceholder loading />}>
            <HeroGallery galleries={galleries} />
          </Suspense>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 md:px-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-9 lg:py-10">
        <Suspense fallback={<div aria-hidden="true" className="min-h-28 rounded-xl border border-[var(--museum-border)] bg-[var(--museum-surface)] lg:min-h-44" />}>
          <GalleryDiscovery galleries={galleries} />
        </Suspense>
        <Suspense fallback={<div aria-hidden="true" className="min-h-24 rounded-xl border border-[var(--museum-border)] bg-[var(--museum-surface)]" />}>
          <CommunityDiscovery community={community} />
        </Suspense>
      </div>

      <BlackWeekBanner className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 md:px-8" />

      <Suspense fallback={null}><ArtworkDiscovery artwork={artwork} /></Suspense>

      <div className="mx-auto max-w-7xl px-4 pb-8 pt-2 sm:px-6 md:px-8 md:pb-12">
        <Suspense fallback={null}><CultureDiscovery community={community} /></Suspense>
        <AudiencePaths />
      </div>
      <PlanOverview />
      <LegalFooter />
    </main>
  );
}
