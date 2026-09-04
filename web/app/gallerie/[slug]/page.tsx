import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import MuseumHeader from "@/components/site/MuseumHeader";
import LegalFooter from "@/components/legal/LegalFooter";
import PublicGalleryInquiryForm from "@/components/public/PublicGalleryInquiryForm";
import UnityGalleryViewer from "@/components/unity/UnityGalleryViewer";
import DataErrorCard from "@/components/system/DataErrorCard";
import EmptyStateCard from "@/components/system/EmptyStateCard";
import { getErrorMessage } from "@/lib/system/getErrorMessage";
import FavoriteGalleryButton from "@/components/galleries/FavoriteGalleryButton";
import FavoriteArtworkButton from "@/components/galleries/FavoriteArtworkButton";
import FollowProfileButton from "@/components/profiles/FollowProfileButton";
import T from "@/components/i18n/T";
import LocalDateTime from "@/components/time/LocalDateTime";
import {
  getArtworkCardUrl,
  getArtworkDetailUrl,
} from "@/lib/artworks/imageUrls";

type PublicGalleryPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    artworkId?: string;
    galleryArtworkId?: string;
  }>;
};

type Gallery = {
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

type OwnerProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "gallerist" | "admin";
  profile_slug: string | null;
  public_profile_enabled: boolean;
};

type FollowRow = {
  following_id: string;
};

type Artwork = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
  technique: string | null;
  dimensions: string | null;
  price: number | string | null;
  currency: string | null;
  description: string | null;
  image_url: string;
  thumbnail_url: string | null;
  card_url: string | null;
  optimized_url: string | null;
  is_for_sale: boolean;
  is_public: boolean;
};

type GalleryArtworkRow = {
  id: string;
  gallery_id: string;
  artwork_id: string;
  sort_order: number;
  wall_key: string | null;
  artworks: Artwork | Artwork[] | null;
};

function normalizeArtwork(value: Artwork | Artwork[] | null) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

function getOwnerDisplayName(profile: OwnerProfile | null) {
  if (!profile) {
    return "Gallerista";
  }

  return (
    profile.display_name ||
    profile.full_name ||
    profile.email?.split("@")[0] ||
    "Gallerista mostra.space"
  );
}

function formatPrice(price: number | string | null, currency: string | null) {
  if (price === null || price === undefined || price === "") {
    return null;
  }

  const numericPrice = Number(price);

  if (Number.isNaN(numericPrice)) {
    return `${price} ${currency || "EUR"}`;
  }

  try {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: currency || "EUR",
      maximumFractionDigits: 0,
    }).format(numericPrice);
  } catch {
    return `${numericPrice} ${currency || "EUR"}`;
  }
}

function buildArtworkInquiryHref(
  slug: string,
  artworkId: string,
  galleryArtworkId: string
) {
  return `/gallerie/${slug}?artworkId=${encodeURIComponent(
    artworkId
  )}&galleryArtworkId=${encodeURIComponent(galleryArtworkId)}#richiesta`;
}

function getArtworkAuthorLine(artwork: Artwork) {
  const artist = artwork.artist_name || "Artista non indicato";

  if (artwork.year) {
    return `${artist}, ${artwork.year}`;
  }

  return artist;
}

function formatPublishedDate(value: string | null) {
  if (!value) {
    return null;
  }

  return <LocalDateTime value={value} format="date" />;
}

function GalleryImagePreview({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  if (!src) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-[1.5rem] border border-[var(--museum-border)] bg-[radial-gradient(circle_at_35%_15%,rgba(243,237,226,0.2),transparent_12rem),linear-gradient(135deg,rgba(168,121,69,0.2),rgba(8,7,5,0.92))] text-sm text-[var(--museum-stone-muted)]">
        <T
          textKey="galleries.detail.preview.unavailable"
          fallback="Anteprima non disponibile"
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="aspect-[4/3] w-full rounded-[1.5rem] object-cover"
    />
  );
}

export default async function PublicGalleryDetailPage({
  params,
  searchParams,
}: PublicGalleryPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const selectedArtworkId = resolvedSearchParams.artworkId || "";
  const selectedGalleryArtworkId = resolvedSearchParams.galleryArtworkId || "";

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select(
      "id, owner_id, title, slug, description, status, cover_image_url, published_at, created_at"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single<Gallery>();

  if (galleryError || !gallery) {
    notFound();
  }

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (currentUser) {
    await admin.from("recent_gallery_visits").upsert(
      {
        user_id: currentUser.id,
        gallery_id: gallery.id,
        visited_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,gallery_id",
      }
    );
  }

  const { data: ownerProfileData } = await admin
    .from("profiles")
    .select(
      "id, email, full_name, display_name, avatar_url, role, profile_slug, public_profile_enabled"
    )
    .eq("id", gallery.owner_id)
    .maybeSingle<OwnerProfile>();

  const ownerProfile =
    ownerProfileData && ownerProfileData.public_profile_enabled
      ? ownerProfileData
      : null;

  const ownerDisplayName = getOwnerDisplayName(ownerProfile);
  const ownerProfileHref =
    ownerProfile?.profile_slug ? `/profili/${ownerProfile.profile_slug}` : null;

  let ownerFollowerCount = 0;
  let isFollowingOwner = false;

  if (ownerProfile) {
    const { count } = await admin
      .from("account_follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", ownerProfile.id);

    ownerFollowerCount = count || 0;

    if (currentUser && currentUser.id !== ownerProfile.id) {
      const { data: followRow } = await admin
        .from("account_follows")
        .select("following_id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", ownerProfile.id)
        .maybeSingle<FollowRow>();

      isFollowingOwner = Boolean(followRow);
    }
  }

  const { data: galleryArtworks, error: galleryArtworksError } = await supabase
    .from("gallery_artworks")
    .select(
      `
      id,
      gallery_id,
      artwork_id,
      sort_order,
      wall_key,
      artworks (
        id,
        title,
        artist_name,
        year,
        technique,
        dimensions,
        price,
        currency,
        description,
        image_url,
        thumbnail_url,
        card_url,
        optimized_url,
        is_for_sale,
        is_public
      )
    `
    )
    .eq("gallery_id", gallery.id)
    .order("sort_order", { ascending: true });

  const safeGalleryArtworks =
    (galleryArtworks || []) as unknown as GalleryArtworkRow[];

  const publicArtworks = safeGalleryArtworks
    .map((item) => {
      const artwork = normalizeArtwork(item.artworks);

      if (!artwork || artwork.is_public !== true) {
        return null;
      }

      return {
        galleryArtworkId: item.id,
        sortOrder: item.sort_order,
        wallKey: item.wall_key,
        artwork,
      };
    })
    .filter(Boolean) as Array<{
    galleryArtworkId: string;
    sortOrder: number;
    wallKey: string | null;
    artwork: Artwork;
  }>;

  const selectedArtwork =
    publicArtworks.find((item) => {
      if (selectedGalleryArtworkId) {
        return item.galleryArtworkId === selectedGalleryArtworkId;
      }

      if (selectedArtworkId) {
        return item.artwork.id === selectedArtworkId;
      }

      return false;
    }) || null;

  const heroDescription = gallery.description;

  const publishedDate = formatPublishedDate(gallery.published_at);

  const positionedPublicArtworks = publicArtworks.filter(
    (item) => item.wallKey && item.wallKey.trim().length > 0
  ).length;

  const forSalePublicArtworks = publicArtworks.filter(
    (item) => item.artwork.is_for_sale
  ).length;

  const featuredArtwork = selectedArtwork || publicArtworks[0] || null;

  return (
    <main className="museum-page min-h-screen overflow-hidden">
      <MuseumHeader />

      <section className="relative isolate overflow-hidden border-b border-[var(--museum-border)]">
        {gallery.cover_image_url && (
          <div className="absolute inset-0 -z-10">
            <img
              src={gallery.cover_image_url}
              alt={gallery.title}
              className="h-full w-full scale-105 object-cover opacity-25 blur-[1px]"
            />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,7,5,0.38),rgba(8,7,5,0.96)),linear-gradient(90deg,rgba(8,7,5,0.98),rgba(8,7,5,0.78),rgba(8,7,5,0.46))]" />
          </div>
        )}

        {!gallery.cover_image_url && (
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(168,121,69,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(216,205,187,0.08),transparent_28%)]" />
        )}

        <div className="relative mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.8fr] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="museum-pill rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em]">
                  <T
                    textKey="galleries.detail.hero.virtualExhibition"
                    fallback="Virtual exhibition"
                  />
                </span>

                <span className="rounded-full border border-[rgba(127,175,123,0.45)] bg-[rgba(127,175,123,0.08)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--museum-success)]">
                  <T
                    textKey="galleries.detail.hero.publicGallery"
                    fallback="Galleria pubblica"
                  />
                </span>

                {publishedDate && (
                  <span className="text-sm text-[var(--museum-stone-muted)]">
                    <T
                      textKey="galleries.detail.hero.publishedOn"
                      fallback="Pubblicata il"
                    />{" "}
                    {publishedDate}
                  </span>
                )}
              </div>

              <h1 className="museum-title mt-7 max-w-5xl text-6xl text-[var(--museum-ivory)] md:text-8xl">
                {gallery.title}
              </h1>

              <p className="museum-subtitle mt-7 max-w-3xl text-base leading-8 text-[var(--museum-stone)] md:text-lg">
                {heroDescription ? (
                  heroDescription
                ) : (
                  <T
                    textKey="galleries.detail.hero.defaultDescription"
                    fallback="Una galleria virtuale visitabile direttamente dal browser, con opere selezionate, schede informative e un ambiente immersivo navigabile."
                  />
                )}
              </p>

              {ownerProfile && (
                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-[var(--museum-stone-muted)]">
                  <span>
                    <T
                      textKey="galleries.detail.hero.curatedBy"
                      fallback="A cura di"
                    />
                  </span>

                  {ownerProfileHref ? (
                    <Link
                      href={ownerProfileHref}
                      className="rounded-full border border-[var(--museum-border-soft)] px-3 py-1 text-[var(--museum-ivory-soft)] transition hover:border-[var(--museum-bronze)] hover:text-[var(--museum-ivory)]"
                    >
                      {ownerDisplayName}
                    </Link>
                  ) : (
                    <span className="rounded-full border border-[var(--museum-border-soft)] px-3 py-1 text-[var(--museum-ivory-soft)]">
                      {ownerDisplayName}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#viewer" className="museum-button-primary px-6 py-3">
                  <T
                    textKey="galleries.detail.hero.enterImmersiveSpace"
                    fallback="Entra nello spazio immersivo"
                  />
                </a>

                <a href="#catalogo" className="museum-button-secondary px-6 py-3">
                  <T
                    textKey="galleries.detail.hero.browseArtworks"
                    fallback="Sfoglia le opere"
                  />
                </a>

                <a href="#richiesta" className="museum-button-secondary px-6 py-3">
                  <T
                    textKey="galleries.detail.actions.requestInformation"
                    fallback="Richiedi informazioni"
                  />
                </a>

                <FavoriteGalleryButton galleryId={gallery.id} />

                {ownerProfile && (
                  <FollowProfileButton
                    profileId={ownerProfile.id}
                    initialIsFollowing={isFollowingOwner}
                    initialFollowerCount={ownerFollowerCount}
                    canFollow={Boolean(currentUser)}
                    isOwnProfile={currentUser?.id === ownerProfile.id}
                    label="Segui il gallerista"
                    followingLabel="Segui già il gallerista"
                    ownLabel="La tua galleria"
                    showCount={false}
                    compact
                  />
                )}
              </div>

              <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
                <div className="museum-stat-card rounded-[1.5rem] p-5">
                  <p className="font-editorial text-4xl text-[var(--museum-ivory)]">
                    {publicArtworks.length}
                  </p>

                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
                    <T
                      textKey="galleries.detail.stats.publicArtworks"
                      fallback="Opere pubbliche"
                    />
                  </p>
                </div>

                <div className="museum-stat-card rounded-[1.5rem] p-5">
                  <p className="font-editorial text-4xl text-[var(--museum-ivory)]">
                    {positionedPublicArtworks}
                  </p>

                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
                    <T
                      textKey="galleries.detail.stats.positionedArtworks"
                      fallback="In allestimento"
                    />
                  </p>
                </div>

                <div className="museum-stat-card rounded-[1.5rem] p-5">
                  <p className="font-editorial text-4xl text-[var(--museum-ivory)]">
                    {forSalePublicArtworks}
                  </p>

                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
                    <T
                      textKey="galleries.detail.stats.availableArtworks"
                      fallback="Disponibili"
                    />
                  </p>
                </div>
              </div>
            </div>

            <aside className="museum-card rounded-[2rem] p-4 shadow-[var(--museum-shadow-soft)]">
              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--museum-border)] bg-[var(--museum-black)]">
                {featuredArtwork ? (
                  <img
                    src={getArtworkDetailUrl(featuredArtwork.artwork)}
                    alt={featuredArtwork.artwork.title}
                    decoding="async"
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <GalleryImagePreview
                    src={gallery.cover_image_url}
                    alt={gallery.title}
                  />
                )}
              </div>

              <div className="p-3">
                <p className="museum-label">
                  <T
                    textKey="galleries.detail.featuredArtwork.label"
                    fallback="Opera in evidenza"
                  />
                </p>

                <h2 className="mt-3 font-editorial text-4xl font-medium leading-tight text-[var(--museum-ivory)]">
                  {featuredArtwork?.artwork.title || gallery.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-[var(--museum-stone)]">
                  {featuredArtwork ? (
                    getArtworkAuthorLine(featuredArtwork.artwork)
                  ) : (
                    <T
                      textKey="galleries.detail.featuredArtwork.defaultDescription"
                      fallback="Esperienza immersiva visitabile via browser."
                    />
                  )}
                </p>

                <div className="mt-6 grid gap-3 text-sm">
                  <div className="flex justify-between gap-4 border-t border-[var(--museum-border)] pt-3">
                    <span className="text-[var(--museum-stone-muted)]">
                      <T
                        textKey="galleries.detail.featuredArtwork.formatLabel"
                        fallback="Formato"
                      />
                    </span>
                    <span className="text-[var(--museum-ivory-soft)]">
                      <T
                        textKey="galleries.detail.featuredArtwork.formatValue"
                        fallback="Galleria immersiva"
                      />
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-t border-[var(--museum-border)] pt-3">
                    <span className="text-[var(--museum-stone-muted)]">
                      <T
                        textKey="galleries.detail.featuredArtwork.accessLabel"
                        fallback="Accesso"
                      />
                    </span>
                    <span className="text-[var(--museum-ivory-soft)]">
                      <T
                        textKey="galleries.detail.featuredArtwork.accessValue"
                        fallback="Browser"
                      />
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-t border-[var(--museum-border)] pt-3">
                    <span className="text-[var(--museum-stone-muted)]">
                      <T
                        textKey="galleries.detail.featuredArtwork.contactLabel"
                        fallback="Contatto"
                      />
                    </span>
                    <span className="text-[var(--museum-ivory-soft)]">
                      <T
                        textKey="galleries.detail.featuredArtwork.contactValue"
                        fallback="Catalogo + richieste"
                      />
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section id="viewer" className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="mb-7 grid gap-5 lg:grid-cols-[0.8fr_0.2fr] lg:items-end">
          <div>
            <p className="museum-label">
              <T
                textKey="galleries.detail.viewer.label"
                fallback="Esperienza immersiva"
              />
            </p>

            <h2 className="museum-title mt-4 text-5xl text-[var(--museum-ivory)] md:text-6xl">
              <T
                textKey="galleries.detail.viewer.title"
                fallback="Entra nello spazio virtuale."
              />
            </h2>

            <p className="museum-subtitle mt-5 max-w-3xl text-sm leading-7 text-[var(--museum-stone)]">
              <T
                textKey="galleries.detail.viewer.subtitle"
                fallback="Visita l’allestimento, muoviti tra le pareti e clicca sulle opere per aprire le schede informative. Il catalogo sotto resta sempre disponibile come accesso alternativo."
              />
            </p>
          </div>

          <a href="#richiesta" className="museum-button-secondary px-5 py-2.5">
            <T
              textKey="galleries.detail.viewer.contact"
              fallback="Contatta"
            />
          </a>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] shadow-[var(--museum-shadow-soft)]">
          <UnityGalleryViewer galleryId={gallery.id} mode="visitor" />
        </div>

        <div className="museum-card mt-6 rounded-[1.75rem] p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="museum-label">
                <T
                  textKey="galleries.detail.alternativeAccess.label"
                  fallback="Accesso alternativo"
                />
              </p>

              <h3 className="mt-3 font-editorial text-3xl font-medium text-[var(--museum-ivory)]">
                <T
                  textKey="galleries.detail.alternativeAccess.title"
                  fallback="Se lo spazio immersivo non si carica, la galleria resta consultabile."
                />
              </h3>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--museum-stone)]">
                <T
                  textKey="galleries.detail.alternativeAccess.description"
                  fallback="Alcuni dispositivi o browser possono richiedere più tempo per avviare l’esperienza 3D. Puoi comunque vedere tutte le opere pubbliche nel catalogo e inviare una richiesta informazioni."
                />
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <a href="#catalogo" className="museum-button-primary px-5 py-2.5">
                <T
                  textKey="galleries.detail.alternativeAccess.goToCatalog"
                  fallback="Vai al catalogo"
                />
              </a>

              <a
                href="#richiesta"
                className="museum-button-secondary px-5 py-2.5"
              >
                <T
                  textKey="galleries.detail.actions.requestInformation"
                  fallback="Richiedi informazioni"
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              number: "01",
              titleKey: "galleries.detail.features.freeVisit.title",
              titleFallback: "Visita libera",
              descriptionKey: "galleries.detail.features.freeVisit.description",
              descriptionFallback:
                "La galleria è navigabile direttamente da browser. Non serve installare nulla: basta entrare nello spazio e iniziare la visita.",
            },
            {
              number: "02",
              titleKey: "galleries.detail.features.artworkSheets.title",
              titleFallback: "Schede opera",
              descriptionKey:
                "galleries.detail.features.artworkSheets.description",
              descriptionFallback:
                "Ogni opera può essere approfondita con titolo, artista, tecnica, dimensioni, disponibilità e descrizione.",
            },
            {
              number: "03",
              titleKey: "galleries.detail.features.directRequests.title",
              titleFallback: "Richieste dirette",
              descriptionKey:
                "galleries.detail.features.directRequests.description",
              descriptionFallback:
                "Dal viewer o dal catalogo puoi inviare una richiesta specifica sulla galleria o su una singola opera.",
            },
          ].map((item) => (
            <article
              key={item.number}
              className="museum-card rounded-[1.75rem] p-6"
            >
              <p className="museum-label">{item.number}</p>

              <h3 className="mt-4 font-editorial text-3xl font-medium text-[var(--museum-ivory)]">
                <T textKey={item.titleKey} fallback={item.titleFallback} />
              </h3>

              <p className="mt-3 text-sm leading-7 text-[var(--museum-stone)]">
                <T
                  textKey={item.descriptionKey}
                  fallback={item.descriptionFallback}
                />
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="museum-card rounded-[2rem] p-8">
            <p className="museum-label">
              <T
                textKey="galleries.detail.project.label"
                fallback="Il progetto"
              />
            </p>

            <h2 className="museum-title mt-4 text-5xl text-[var(--museum-ivory)]">
              <T
                textKey="galleries.detail.project.title"
                fallback="Una galleria pensata per essere visitata anche a distanza."
              />
            </h2>

            <p className="mt-5 text-sm leading-8 text-[var(--museum-stone)]">
              <T
                textKey="galleries.detail.project.descriptionOne"
                fallback="Questa pagina unisce allestimento virtuale, catalogo opere e richiesta diretta di informazioni. Il visitatore può entrare nello spazio, leggere le schede delle opere e contattare il gallerista senza uscire dall’esperienza."
              />
            </p>

            <p className="mt-4 text-sm leading-8 text-[var(--museum-stone)]">
              <T
                textKey="galleries.detail.project.descriptionTwo"
                fallback="Il viewer immersivo offre la dimensione spaziale della mostra, mentre il catalogo sottostante garantisce sempre un accesso semplice e consultabile anche quando l’esperienza 3D non è disponibile."
              />
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#viewer" className="museum-button-primary px-5 py-2.5">
                <T
                  textKey="galleries.detail.project.visitSpace"
                  fallback="Visita lo spazio"
                />
              </a>

              <a href="#catalogo" className="museum-button-secondary px-5 py-2.5">
                <T
                  textKey="galleries.detail.project.viewCatalog"
                  fallback="Consulta catalogo"
                />
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              {
                eyebrowKey: "galleries.detail.guide.howToVisit.eyebrow",
                eyebrowFallback: "Come visitare",
                titleKey: "galleries.detail.guide.howToVisit.title",
                titleFallback: "Entra, muoviti, clicca sulle opere",
                descriptionKey:
                  "galleries.detail.guide.howToVisit.description",
                descriptionFallback:
                  "Apri il viewer, clicca per entrare nella visita, usa i comandi di movimento e seleziona le opere per visualizzarne le schede.",
              },
              {
                eyebrowKey: "galleries.detail.guide.catalog.eyebrow",
                eyebrowFallback: "Catalogo e disponibilità",
                titleKey: "galleries.detail.guide.catalog.title",
                titleFallback: "Ogni opera resta consultabile",
                descriptionKey: "galleries.detail.guide.catalog.description",
                descriptionFallback:
                  "Il catalogo pubblico raccoglie immagini, dati tecnici, artista, anno, prezzo o disponibilità. Da ogni scheda puoi inviare una richiesta dedicata.",
              },
              {
                eyebrowKey: "galleries.detail.guide.directContact.eyebrow",
                eyebrowFallback: "Contatto diretto",
                titleKey: "galleries.detail.guide.directContact.title",
                titleFallback: "Dal visitatore al gallerista",
                descriptionKey:
                  "galleries.detail.guide.directContact.description",
                descriptionFallback:
                  "Il form raccoglie richieste su opere, disponibilità, prezzi, appuntamenti o informazioni generali sull’allestimento.",
              },
            ].map((item) => (
              <article
                key={item.eyebrowKey}
                className="museum-card rounded-[1.75rem] p-6"
              >
                <p className="museum-label">
                  <T
                    textKey={item.eyebrowKey}
                    fallback={item.eyebrowFallback}
                  />
                </p>

                <h3 className="mt-3 font-editorial text-3xl font-medium text-[var(--museum-ivory)]">
                  <T textKey={item.titleKey} fallback={item.titleFallback} />
                </h3>

                <p className="mt-3 text-sm leading-7 text-[var(--museum-stone)]">
                  <T
                    textKey={item.descriptionKey}
                    fallback={item.descriptionFallback}
                  />
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="catalogo" className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="museum-label">
              <T
                textKey="galleries.detail.catalog.label"
                fallback="Catalogo opere"
              />
            </p>

            <h2 className="museum-title mt-4 text-5xl text-[var(--museum-ivory)] md:text-6xl">
              <T
                textKey="galleries.detail.catalog.title"
                fallback="Opere esposte."
              />
            </h2>

            <p className="museum-subtitle mt-5 max-w-3xl text-sm leading-7 text-[var(--museum-stone)]">
              <T
                textKey="galleries.detail.catalog.subtitle"
                fallback="Consulta le opere visibili al pubblico. Ogni scheda permette di richiedere informazioni, disponibilità o dettagli commerciali."
              />
            </p>
          </div>

          <p className="museum-pill rounded-full px-4 py-2 text-sm">
            {publicArtworks.length}{" "}
            <T
              textKey="galleries.detail.catalog.publicArtworksCount"
              fallback="opere pubbliche"
            />
          </p>
        </div>

        {galleryArtworksError && (
          <div className="mt-8">
            <DataErrorCard
              title="Non riesco a caricare le opere della galleria"
              message="La galleria è stata caricata, ma le opere associate non sono state recuperate correttamente. Puoi ricaricare la pagina oppure inviare una richiesta generale."
              details={getErrorMessage(galleryArtworksError)}
              actionHref={`/gallerie/${gallery.slug}`}
              actionLabel="Ricarica galleria"
              secondaryHref="#richiesta"
              secondaryLabel="Invia richiesta"
            />
          </div>
        )}

        {!galleryArtworksError && publicArtworks.length === 0 && (
          <div className="mt-8">
            <EmptyStateCard
              eyebrow="Catalogo vuoto"
              title="Non ci sono ancora opere pubbliche associate a questa galleria"
              message="Torna più avanti oppure contatta il gallerista per informazioni sull’allestimento e sulle opere disponibili."
              actionHref="#richiesta"
              actionLabel="Contatta il gallerista"
            />
          </div>
        )}

        {publicArtworks.length > 0 && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {publicArtworks.map(({ galleryArtworkId, artwork }) => {
              const priceLabel = formatPrice(artwork.price, artwork.currency);
              const inquiryHref = buildArtworkInquiryHref(
                gallery.slug,
                artwork.id,
                galleryArtworkId
              );
              const availabilityLabel = artwork.is_for_sale
                ? priceLabel
                : null;

              return (
                <article
                  key={galleryArtworkId}
                  className="group overflow-hidden rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] shadow-[var(--museum-shadow-soft)] transition hover:border-[var(--museum-bronze)]"
                >
                  <div className="grid gap-0 md:grid-cols-[260px_1fr]">
                    <div className="relative aspect-[4/3] overflow-hidden bg-[var(--museum-black)] md:aspect-auto">
                      <img
                        src={getArtworkCardUrl(artwork)}
                        alt={artwork.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />

                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        {artwork.is_for_sale && (
                          <span className="rounded-full border border-[rgba(197,151,94,0.45)] bg-[rgba(168,121,69,0.14)] px-3 py-1 text-xs uppercase tracking-[0.15em] text-[var(--museum-bronze-light)] backdrop-blur">
                            <T
                              textKey="galleries.detail.catalog.available"
                              fallback="Disponibile"
                            />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-6">
                      <p className="museum-label">
                        <T
                          textKey="galleries.detail.catalog.artworkLabel"
                          fallback="Opera"
                        />{" "}
                        #{String(galleryArtworkId).slice(0, 8)}
                      </p>

                      <h3 className="mt-3 font-editorial text-3xl font-medium leading-tight text-[var(--museum-ivory)]">
                        {artwork.title}
                      </h3>

                      <div className="mt-4">
                        <FavoriteArtworkButton artworkId={artwork.id} />
                      </div>

                      <p className="mt-3 text-sm text-[var(--museum-stone)]">
                        {getArtworkAuthorLine(artwork)}
                      </p>

                      <div className="mt-5 inline-flex rounded-full border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] px-4 py-2 text-sm text-[var(--museum-ivory-soft)]">
                        {artwork.is_for_sale ? (
                          availabilityLabel || (
                            <T
                              textKey="galleries.detail.catalog.priceOnRequest"
                              fallback="Prezzo su richiesta"
                            />
                          )
                        ) : (
                          <T
                            textKey="galleries.detail.catalog.informationalSheet"
                            fallback="Scheda informativa"
                          />
                        )}
                      </div>

                      <dl className="mt-5 space-y-2 text-sm text-[var(--museum-stone-muted)]">
                        {artwork.technique && (
                          <div>
                            <dt className="inline text-[var(--museum-stone-muted)]">
                              <T
                                textKey="galleries.detail.catalog.technique"
                                fallback="Tecnica:"
                              />{" "}
                            </dt>
                            <dd className="inline text-[var(--museum-ivory-soft)]">
                              {artwork.technique}
                            </dd>
                          </div>
                        )}

                        {artwork.dimensions && (
                          <div>
                            <dt className="inline text-[var(--museum-stone-muted)]">
                              <T
                                textKey="galleries.detail.catalog.dimensions"
                                fallback="Dimensioni:"
                              />{" "}
                            </dt>
                            <dd className="inline text-[var(--museum-ivory-soft)]">
                              {artwork.dimensions}
                            </dd>
                          </div>
                        )}
                      </dl>

                      {artwork.description && (
                        <p className="mt-5 line-clamp-3 text-sm leading-7 text-[var(--museum-stone)]">
                          {artwork.description}
                        </p>
                      )}

                      <div className="mt-6 flex flex-wrap gap-3">
                        <a
                          href={inquiryHref}
                          className="museum-button-primary px-5 py-2.5"
                        >
                          <T
                            textKey="galleries.detail.actions.requestInformation"
                            fallback="Richiedi informazioni"
                          />
                        </a>

                        <a
                          href="#viewer"
                          className="museum-button-secondary px-5 py-2.5"
                        >
                          <T
                            textKey="galleries.detail.catalog.viewInSpace"
                            fallback="Vedi nello spazio"
                          />
                        </a>
                      </div>

                      <details className="mt-6 rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-4">
                        <summary className="cursor-pointer text-sm font-medium text-[var(--museum-ivory-soft)]">
                          <T
                            textKey="galleries.detail.catalog.openQuickForm"
                            fallback="Apri form rapido per quest’opera"
                          />
                        </summary>

                        <div className="mt-5">
                          <PublicGalleryInquiryForm
                            galleryId={gallery.id}
                            galleryTitle={gallery.title}
                            artworkId={artwork.id}
                            galleryArtworkId={galleryArtworkId}
                            artworkTitle={artwork.title}
                          />
                        </div>
                      </details>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="richiesta" className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="museum-card rounded-[2rem] p-8">
            <p className="museum-label">
              <T
                textKey="galleries.detail.contact.label"
                fallback="Contatto"
              />
            </p>

            <h2 className="museum-title mt-4 text-5xl text-[var(--museum-ivory)]">
              {selectedArtwork ? (
                <T
                  textKey="galleries.detail.contact.selectedArtworkTitle"
                  fallback="Richiesta per l’opera selezionata."
                />
              ) : (
                <T
                  textKey="galleries.detail.contact.generalTitle"
                  fallback="Vuoi informazioni sulla galleria?"
                />
              )}
            </h2>

            <p className="mt-5 text-sm leading-7 text-[var(--museum-stone)]">
              {selectedArtwork ? (
                <>
                  <T
                    textKey="galleries.detail.contact.selectedArtworkPrefix"
                    fallback="Il form è stato predisposto per l’opera"
                  />{" "}
                  &quot;{selectedArtwork.artwork.title}&quot;.{" "}
                  <T
                    textKey="galleries.detail.contact.selectedArtworkSuffix"
                    fallback="Puoi modificare liberamente il messaggio prima dell’invio."
                  />
                </>
              ) : (
                <T
                  textKey="galleries.detail.contact.generalDescription"
                  fallback="Usa il form per chiedere disponibilità, prezzi, dettagli sulle opere, appuntamenti o informazioni sull’allestimento."
                />
              )}
            </p>

            {selectedArtwork && (
              <div className="mt-6 rounded-2xl border border-[rgba(197,151,94,0.45)] bg-[rgba(168,121,69,0.08)] p-5">
                <p className="museum-label">
                  <T
                    textKey="galleries.detail.contact.selectedArtworkLabel"
                    fallback="Opera selezionata"
                  />
                </p>

                <p className="mt-3 font-editorial text-3xl text-[var(--museum-ivory)]">
                  {selectedArtwork.artwork.title}
                </p>

                <p className="mt-2 text-sm text-[var(--museum-stone)]">
                  {getArtworkAuthorLine(selectedArtwork.artwork)}
                </p>
              </div>
            )}

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-5">
                <p className="text-sm font-medium text-[var(--museum-ivory-soft)]">
                  <T
                    textKey="galleries.detail.contact.whatYouCanAsk"
                    fallback="Cosa puoi chiedere"
                  />
                </p>

                <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--museum-stone)]">
                  <li>
                    •{" "}
                    <T
                      textKey="galleries.detail.contact.questions.priceAvailability"
                      fallback="informazioni su prezzo e disponibilità"
                    />
                  </li>
                  <li>
                    •{" "}
                    <T
                      textKey="galleries.detail.contact.questions.technicalDetails"
                      fallback="dettagli tecnici o documentazione dell’opera"
                    />
                  </li>
                  <li>
                    •{" "}
                    <T
                      textKey="galleries.detail.contact.questions.appointments"
                      fallback="appuntamenti, visite o contatto diretto"
                    />
                  </li>
                  <li>
                    •{" "}
                    <T
                      textKey="galleries.detail.contact.questions.general"
                      fallback="richieste generali sull’allestimento virtuale"
                    />
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-5">
                <p className="text-sm leading-7 text-[var(--museum-stone)]">
                  <T
                    textKey="galleries.detail.contact.privacyNotice"
                    fallback="I dati inviati saranno usati solo per rispondere alla tua richiesta. Puoi leggere l’informativa completa nella pagina privacy."
                  />
                </p>

                <Link
                  href="/legal/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="museum-link mt-4 inline-flex text-sm underline-offset-4 hover:underline"
                >
                  <T
                    textKey="galleries.detail.contact.readPrivacy"
                    fallback="Leggi informativa privacy"
                  />
                </Link>
              </div>
            </div>
          </div>

          <PublicGalleryInquiryForm
            galleryId={gallery.id}
            galleryTitle={gallery.title}
            artworkId={selectedArtwork?.artwork.id || null}
            galleryArtworkId={selectedArtwork?.galleryArtworkId || null}
            artworkTitle={selectedArtwork?.artwork.title || null}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-4 md:px-8">
        <div className="flex flex-col justify-between gap-4 rounded-[1.75rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] p-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-[var(--museum-stone)]">
              <T
                textKey="galleries.detail.footer.publicGalleryNotice"
                fallback="Stai visualizzando una galleria pubblica."
              />
            </p>

            <p className="mt-1 text-xs text-[var(--museum-stone-muted)]">
              /gallerie/{gallery.slug}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="#viewer" className="museum-button-primary px-5 py-2.5">
              <T
                textKey="galleries.detail.footer.backToViewer"
                fallback="Torna al viewer"
              />
            </a>

            <a href="#catalogo" className="museum-button-secondary px-5 py-2.5">
              <T
                textKey="galleries.detail.footer.catalog"
                fallback="Catalogo opere"
              />
            </a>

            <Link href="/gallerie" className="museum-button-secondary px-5 py-2.5">
              <T
                textKey="galleries.detail.footer.otherGalleries"
                fallback="Altre gallerie"
              />
            </Link>
          </div>
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}
