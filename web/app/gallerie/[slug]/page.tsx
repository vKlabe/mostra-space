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

  return new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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
        Anteprima non disponibile
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
    const admin = createAdminClient();

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

  const heroDescription =
    gallery.description ||
    "Una galleria virtuale visitabile direttamente dal browser, con opere selezionate, schede informative e un ambiente immersivo navigabile.";

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
                  Virtual exhibition
                </span>

                <span className="rounded-full border border-[rgba(127,175,123,0.45)] bg-[rgba(127,175,123,0.08)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--museum-success)]">
                  Galleria pubblica
                </span>

                {publishedDate && (
                  <span className="text-sm text-[var(--museum-stone-muted)]">
                    Pubblicata il {publishedDate}
                  </span>
                )}
              </div>

              <h1 className="museum-title mt-7 max-w-5xl text-6xl text-[var(--museum-ivory)] md:text-8xl">
                {gallery.title}
              </h1>

              <p className="museum-subtitle mt-7 max-w-3xl text-base leading-8 text-[var(--museum-stone)] md:text-lg">
                {heroDescription}
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#viewer" className="museum-button-primary px-6 py-3">
                  Entra nello spazio immersivo
                </a>

                <a href="#catalogo" className="museum-button-secondary px-6 py-3">
                  Sfoglia le opere
                </a>

                <a href="#richiesta" className="museum-button-secondary px-6 py-3">
                  Richiedi informazioni
                </a>

                <FavoriteGalleryButton galleryId={gallery.id} />
              </div>

              <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
                <div className="museum-stat-card rounded-[1.5rem] p-5">
                  <p className="font-editorial text-4xl text-[var(--museum-ivory)]">
                    {publicArtworks.length}
                  </p>

                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
                    Opere pubbliche
                  </p>
                </div>

                <div className="museum-stat-card rounded-[1.5rem] p-5">
                  <p className="font-editorial text-4xl text-[var(--museum-ivory)]">
                    {positionedPublicArtworks}
                  </p>

                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
                    In allestimento
                  </p>
                </div>

                <div className="museum-stat-card rounded-[1.5rem] p-5">
                  <p className="font-editorial text-4xl text-[var(--museum-ivory)]">
                    {forSalePublicArtworks}
                  </p>

                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
                    Disponibili
                  </p>
                </div>
              </div>
            </div>

            <aside className="museum-card rounded-[2rem] p-4 shadow-[var(--museum-shadow-soft)]">
              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--museum-border)] bg-[var(--museum-black)]">
                {featuredArtwork ? (
                  <img
                    src={
                      featuredArtwork.artwork.thumbnail_url ||
                      featuredArtwork.artwork.image_url
                    }
                    alt={featuredArtwork.artwork.title}
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
                <p className="museum-label">Opera in evidenza</p>

                <h2 className="mt-3 font-editorial text-4xl font-medium leading-tight text-[var(--museum-ivory)]">
                  {featuredArtwork?.artwork.title || gallery.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-[var(--museum-stone)]">
                  {featuredArtwork
                    ? getArtworkAuthorLine(featuredArtwork.artwork)
                    : "Esperienza immersiva visitabile via browser."}
                </p>

                <div className="mt-6 grid gap-3 text-sm">
                  <div className="flex justify-between gap-4 border-t border-[var(--museum-border)] pt-3">
                    <span className="text-[var(--museum-stone-muted)]">
                      Formato
                    </span>
                    <span className="text-[var(--museum-ivory-soft)]">
                      Galleria immersiva
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-t border-[var(--museum-border)] pt-3">
                    <span className="text-[var(--museum-stone-muted)]">
                      Accesso
                    </span>
                    <span className="text-[var(--museum-ivory-soft)]">
                      Browser
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-t border-[var(--museum-border)] pt-3">
                    <span className="text-[var(--museum-stone-muted)]">
                      Contatto
                    </span>
                    <span className="text-[var(--museum-ivory-soft)]">
                      Catalogo + richieste
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
            <p className="museum-label">Esperienza immersiva</p>

            <h2 className="museum-title mt-4 text-5xl text-[var(--museum-ivory)] md:text-6xl">
              Entra nello spazio virtuale.
            </h2>

            <p className="museum-subtitle mt-5 max-w-3xl text-sm leading-7 text-[var(--museum-stone)]">
              Visita l’allestimento, muoviti tra le pareti e clicca sulle opere
              per aprire le schede informative. Il catalogo sotto resta sempre
              disponibile come accesso alternativo.
            </p>
          </div>

          <a href="#richiesta" className="museum-button-secondary px-5 py-2.5">
            Contatta
          </a>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] shadow-[var(--museum-shadow-soft)]">
          <UnityGalleryViewer galleryId={gallery.id} mode="visitor" />
        </div>

        <div className="museum-card mt-6 rounded-[1.75rem] p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="museum-label">Accesso alternativo</p>

              <h3 className="mt-3 font-editorial text-3xl font-medium text-[var(--museum-ivory)]">
                Se lo spazio immersivo non si carica, la galleria resta
                consultabile.
              </h3>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--museum-stone)]">
                Alcuni dispositivi o browser possono richiedere più tempo per
                avviare l’esperienza 3D. Puoi comunque vedere tutte le opere
                pubbliche nel catalogo e inviare una richiesta informazioni.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <a href="#catalogo" className="museum-button-primary px-5 py-2.5">
                Vai al catalogo
              </a>

              <a
                href="#richiesta"
                className="museum-button-secondary px-5 py-2.5"
              >
                Richiedi informazioni
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            [
              "01",
              "Visita libera",
              "La galleria è navigabile direttamente da browser. Non serve installare nulla: basta entrare nello spazio e iniziare la visita.",
            ],
            [
              "02",
              "Schede opera",
              "Ogni opera può essere approfondita con titolo, artista, tecnica, dimensioni, disponibilità e descrizione.",
            ],
            [
              "03",
              "Richieste dirette",
              "Dal viewer o dal catalogo puoi inviare una richiesta specifica sulla galleria o su una singola opera.",
            ],
          ].map(([number, title, description]) => (
            <article
              key={number}
              className="museum-card rounded-[1.75rem] p-6"
            >
              <p className="museum-label">{number}</p>

              <h3 className="mt-4 font-editorial text-3xl font-medium text-[var(--museum-ivory)]">
                {title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-[var(--museum-stone)]">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="museum-card rounded-[2rem] p-8">
            <p className="museum-label">Il progetto</p>

            <h2 className="museum-title mt-4 text-5xl text-[var(--museum-ivory)]">
              Una galleria pensata per essere visitata anche a distanza.
            </h2>

            <p className="mt-5 text-sm leading-8 text-[var(--museum-stone)]">
              Questa pagina unisce allestimento virtuale, catalogo opere e
              richiesta diretta di informazioni. Il visitatore può entrare nello
              spazio, leggere le schede delle opere e contattare il gallerista
              senza uscire dall’esperienza.
            </p>

            <p className="mt-4 text-sm leading-8 text-[var(--museum-stone)]">
              Il viewer immersivo offre la dimensione spaziale della mostra,
              mentre il catalogo sottostante garantisce sempre un accesso
              semplice e consultabile anche quando l’esperienza 3D non è
              disponibile.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#viewer" className="museum-button-primary px-5 py-2.5">
                Visita lo spazio
              </a>

              <a href="#catalogo" className="museum-button-secondary px-5 py-2.5">
                Consulta catalogo
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              [
                "Come visitare",
                "Entra, muoviti, clicca sulle opere",
                "Apri il viewer, clicca per entrare nella visita, usa i comandi di movimento e seleziona le opere per visualizzarne le schede.",
              ],
              [
                "Catalogo e disponibilità",
                "Ogni opera resta consultabile",
                "Il catalogo pubblico raccoglie immagini, dati tecnici, artista, anno, prezzo o disponibilità. Da ogni scheda puoi inviare una richiesta dedicata.",
              ],
              [
                "Contatto diretto",
                "Dal visitatore al gallerista",
                "Il form raccoglie richieste su opere, disponibilità, prezzi, appuntamenti o informazioni generali sull’allestimento.",
              ],
            ].map(([eyebrow, title, description]) => (
              <article
                key={eyebrow}
                className="museum-card rounded-[1.75rem] p-6"
              >
                <p className="museum-label">{eyebrow}</p>

                <h3 className="mt-3 font-editorial text-3xl font-medium text-[var(--museum-ivory)]">
                  {title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[var(--museum-stone)]">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="catalogo" className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="museum-label">Catalogo opere</p>

            <h2 className="museum-title mt-4 text-5xl text-[var(--museum-ivory)] md:text-6xl">
              Opere esposte.
            </h2>

            <p className="museum-subtitle mt-5 max-w-3xl text-sm leading-7 text-[var(--museum-stone)]">
              Consulta le opere visibili al pubblico. Ogni scheda permette di
              richiedere informazioni, disponibilità o dettagli commerciali.
            </p>
          </div>

          <p className="museum-pill rounded-full px-4 py-2 text-sm">
            {publicArtworks.length} opere pubbliche
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
                ? priceLabel || "Prezzo su richiesta"
                : "Scheda informativa";

              return (
                <article
                  key={galleryArtworkId}
                  className="group overflow-hidden rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] shadow-[var(--museum-shadow-soft)] transition hover:border-[var(--museum-bronze)]"
                >
                  <div className="grid gap-0 md:grid-cols-[260px_1fr]">
                    <div className="relative aspect-[4/3] overflow-hidden bg-[var(--museum-black)] md:aspect-auto">
                      <img
                        src={artwork.thumbnail_url || artwork.image_url}
                        alt={artwork.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />

                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        {artwork.is_for_sale && (
                          <span className="rounded-full border border-[rgba(197,151,94,0.45)] bg-[rgba(168,121,69,0.14)] px-3 py-1 text-xs uppercase tracking-[0.15em] text-[var(--museum-bronze-light)] backdrop-blur">
                            Disponibile
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-6">
                      <p className="museum-label">
                        Opera #{String(galleryArtworkId).slice(0, 8)}
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
                        {availabilityLabel}
                      </div>

                      <dl className="mt-5 space-y-2 text-sm text-[var(--museum-stone-muted)]">
                        {artwork.technique && (
                          <div>
                            <dt className="inline text-[var(--museum-stone-muted)]">
                              Tecnica:{" "}
                            </dt>
                            <dd className="inline text-[var(--museum-ivory-soft)]">
                              {artwork.technique}
                            </dd>
                          </div>
                        )}

                        {artwork.dimensions && (
                          <div>
                            <dt className="inline text-[var(--museum-stone-muted)]">
                              Dimensioni:{" "}
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
                          Richiedi informazioni
                        </a>

                        <a
                          href="#viewer"
                          className="museum-button-secondary px-5 py-2.5"
                        >
                          Vedi nello spazio
                        </a>
                      </div>

                      <details className="mt-6 rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-4">
                        <summary className="cursor-pointer text-sm font-medium text-[var(--museum-ivory-soft)]">
                          Apri form rapido per quest’opera
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
            <p className="museum-label">Contatto</p>

            <h2 className="museum-title mt-4 text-5xl text-[var(--museum-ivory)]">
              {selectedArtwork
                ? "Richiesta per l’opera selezionata."
                : "Vuoi informazioni sulla galleria?"}
            </h2>

            <p className="mt-5 text-sm leading-7 text-[var(--museum-stone)]">
              {selectedArtwork
                ? `Il form è stato predisposto per l’opera "${selectedArtwork.artwork.title}". Puoi modificare liberamente il messaggio prima dell’invio.`
                : "Usa il form per chiedere disponibilità, prezzi, dettagli sulle opere, appuntamenti o informazioni sull’allestimento."}
            </p>

            {selectedArtwork && (
              <div className="mt-6 rounded-2xl border border-[rgba(197,151,94,0.45)] bg-[rgba(168,121,69,0.08)] p-5">
                <p className="museum-label">Opera selezionata</p>

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
                  Cosa puoi chiedere
                </p>

                <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--museum-stone)]">
                  <li>• informazioni su prezzo e disponibilità</li>
                  <li>• dettagli tecnici o documentazione dell’opera</li>
                  <li>• appuntamenti, visite o contatto diretto</li>
                  <li>• richieste generali sull’allestimento virtuale</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-5">
                <p className="text-sm leading-7 text-[var(--museum-stone)]">
                  I dati inviati saranno usati solo per rispondere alla tua
                  richiesta. Puoi leggere l’informativa completa nella pagina
                  privacy.
                </p>

                <Link
                  href="/legal/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="museum-link mt-4 inline-flex text-sm underline-offset-4 hover:underline"
                >
                  Leggi informativa privacy
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
              Stai visualizzando una galleria pubblica.
            </p>

            <p className="mt-1 text-xs text-[var(--museum-stone-muted)]">
              /gallerie/{gallery.slug}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="#viewer" className="museum-button-primary px-5 py-2.5">
              Torna al viewer
            </a>

            <a href="#catalogo" className="museum-button-secondary px-5 py-2.5">
              Catalogo opere
            </a>

            <Link href="/gallerie" className="museum-button-secondary px-5 py-2.5">
              Altre gallerie
            </Link>
          </div>
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}