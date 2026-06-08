import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublicGalleryInquiryForm from "@/components/public/PublicGalleryInquiryForm";
import UnityGalleryViewer from "@/components/unity/UnityGalleryViewer";
import DataErrorCard from "@/components/system/DataErrorCard";
import EmptyStateCard from "@/components/system/EmptyStateCard";
import { getErrorMessage } from "@/lib/system/getErrorMessage";

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
    "Una galleria virtuale visitabile direttamente dal browser, con opere selezionate, schede informative e un ambiente 3D navigabile.";

  const publishedDate = gallery.published_at
    ? new Date(gallery.published_at).toLocaleDateString("it-IT")
    : null;

  const positionedPublicArtworks = publicArtworks.filter(
    (item) => item.wallKey && item.wallKey.trim().length > 0
  ).length;

  const forSalePublicArtworks = publicArtworks.filter(
    (item) => item.artwork.is_for_sale
  ).length;

  const featuredArtwork = selectedArtwork || publicArtworks[0] || null;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <section className="relative isolate overflow-hidden border-b border-neutral-800">
        {gallery.cover_image_url && (
          <div className="absolute inset-0 -z-10">
            <img
              src={gallery.cover_image_url}
              alt={gallery.title}
              className="h-full w-full scale-105 object-cover opacity-35 blur-[1px]"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/40 via-neutral-950/80 to-neutral-950" />
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/85 to-neutral-950/35" />
          </div>
        )}

        {!gallery.cover_image_url && (
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.15),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_28%)]" />
        )}

        <div className="relative mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80 backdrop-blur">
                  Virtual exhibition
                </span>

                <span className="rounded-full border border-green-900 bg-green-950/40 px-3 py-1 text-xs uppercase tracking-[0.18em] text-green-300">
                  Galleria pubblica
                </span>

                {publishedDate && (
                  <span className="text-sm text-neutral-400">
                    Pubblicata il {publishedDate}
                  </span>
                )}
              </div>

              <h1 className="mt-7 max-w-5xl text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
                {gallery.title}
              </h1>

              <p className="mt-7 max-w-3xl text-base leading-8 text-neutral-300 md:text-lg">
                {heroDescription}
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <a
                  href="#viewer"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                >
                  Entra nello spazio 3D
                </a>

                <a
                  href="#catalogo"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-neutral-600 px-6 text-sm font-medium text-neutral-100 transition hover:border-neutral-300"
                >
                  Sfoglia le opere
                </a>

                <a
                  href="#richiesta"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-neutral-700 px-6 text-sm font-medium text-neutral-300 transition hover:border-neutral-400 hover:text-white"
                >
                  Richiedi informazioni
                </a>
              </div>

              <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur">
                  <p className="text-3xl font-semibold">
                    {publicArtworks.length}
                  </p>

                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
                    Opere pubbliche
                  </p>
                </div>

                <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur">
                  <p className="text-3xl font-semibold">
                    {positionedPublicArtworks}
                  </p>

                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
                    Allestite in 3D
                  </p>
                </div>

                <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur">
                  <p className="text-3xl font-semibold">
                    {forSalePublicArtworks}
                  </p>

                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
                    Disponibili
                  </p>
                </div>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-neutral-800 bg-neutral-900/80 p-4 shadow-2xl backdrop-blur">
              <div className="overflow-hidden rounded-[1.5rem] border border-neutral-800 bg-neutral-950">
                {featuredArtwork ? (
                  <img
                    src={
                      featuredArtwork.artwork.thumbnail_url ||
                      featuredArtwork.artwork.image_url
                    }
                    alt={featuredArtwork.artwork.title}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : gallery.cover_image_url ? (
                  <img
                    src={gallery.cover_image_url}
                    alt={gallery.title}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-neutral-950 text-sm text-neutral-600">
                    Anteprima non disponibile
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                  Opera in evidenza
                </p>

                <h2 className="mt-3 text-2xl font-medium">
                  {featuredArtwork?.artwork.title || gallery.title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  {featuredArtwork
                    ? getArtworkAuthorLine(featuredArtwork.artwork)
                    : "Esperienza digitale visitabile via browser."}
                </p>

                <div className="mt-5 grid gap-3 text-sm">
                  <div className="flex justify-between gap-4 border-t border-neutral-800 pt-3">
                    <span className="text-neutral-500">Esperienza</span>
                    <span className="text-neutral-100">Unity WebGL</span>
                  </div>

                  <div className="flex justify-between gap-4 border-t border-neutral-800 pt-3">
                    <span className="text-neutral-500">Accesso</span>
                    <span className="text-neutral-100">Browser</span>
                  </div>

                  <div className="flex justify-between gap-4 border-t border-neutral-800 pt-3">
                    <span className="text-neutral-500">Fallback</span>
                    <span className="text-neutral-100">Catalogo + form</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section id="viewer" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="mb-7 grid gap-5 lg:grid-cols-[0.8fr_0.2fr] lg:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Esperienza immersiva
            </p>

            <h2 className="text-3xl font-semibold md:text-4xl">
              Entra nello spazio virtuale
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-400">
              Visita l’allestimento 3D, muoviti tra le pareti e clicca sulle
              opere per aprire le schede informative. Il catalogo sotto resta
              sempre disponibile come fallback pubblico.
            </p>
          </div>

          <a
            href="#richiesta"
            className="inline-flex h-10 items-center justify-center rounded-full border border-neutral-700 px-5 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Contatta
          </a>
        </div>

        <UnityGalleryViewer galleryId={gallery.id} mode="visitor" />

        <div className="mt-5 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.22em] text-neutral-500">
                Accesso alternativo
              </p>

              <h3 className="text-xl font-medium text-neutral-100">
                Se il 3D non si carica, la galleria resta consultabile
              </h3>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                Unity WebGL può richiedere qualche secondo al primo avvio o non
                essere disponibile su alcuni browser/dispositivi. Puoi comunque
                vedere tutte le opere pubbliche nel catalogo e inviare una
                richiesta informazioni.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <a
                href="#catalogo"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                Vai al catalogo
              </a>

              <a
                href="#richiesta"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-neutral-700 px-5 text-sm font-medium text-neutral-100 transition hover:border-neutral-400"
              >
                Richiedi informazioni
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="mb-3 text-xs uppercase tracking-[0.22em] text-neutral-500">
              01
            </p>

            <h3 className="text-xl font-medium">Visita libera</h3>

            <p className="mt-3 text-sm leading-7 text-neutral-400">
              La galleria è navigabile direttamente da browser. Non serve
              installare nulla: basta entrare nello spazio e iniziare la visita.
            </p>
          </article>

          <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="mb-3 text-xs uppercase tracking-[0.22em] text-neutral-500">
              02
            </p>

            <h3 className="text-xl font-medium">Schede opera</h3>

            <p className="mt-3 text-sm leading-7 text-neutral-400">
              Ogni opera può essere approfondita con titolo, artista, tecnica,
              dimensioni, disponibilità e descrizione.
            </p>
          </article>

          <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="mb-3 text-xs uppercase tracking-[0.22em] text-neutral-500">
              03
            </p>

            <h3 className="text-xl font-medium">Richieste dirette</h3>

            <p className="mt-3 text-sm leading-7 text-neutral-400">
              Dal viewer o dal catalogo puoi inviare una richiesta specifica
              sulla galleria o su una singola opera.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-neutral-800 bg-neutral-900 p-8">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Il progetto
            </p>

            <h2 className="text-3xl font-semibold md:text-4xl">
              Una galleria pensata per essere visitata anche a distanza
            </h2>

            <p className="mt-5 text-sm leading-8 text-neutral-400">
              Questa pagina unisce allestimento virtuale, catalogo opere e
              richiesta diretta di informazioni. Il visitatore può entrare nello
              spazio 3D, leggere le schede delle opere e contattare il
              gallerista senza uscire dall’esperienza.
            </p>

            <p className="mt-4 text-sm leading-8 text-neutral-400">
              Il viewer immersivo offre la dimensione spaziale della mostra,
              mentre il catalogo sottostante garantisce sempre un accesso
              semplice e consultabile anche quando il 3D non è disponibile.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#viewer"
                className="inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                Visita in 3D
              </a>

              <a
                href="#catalogo"
                className="inline-flex h-10 items-center justify-center rounded-full border border-neutral-700 px-5 text-sm text-neutral-100 transition hover:border-neutral-400"
              >
                Consulta catalogo
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                Come visitare
              </p>

              <h3 className="mt-3 text-xl font-medium">
                Entra, muoviti, clicca sulle opere
              </h3>

              <p className="mt-3 text-sm leading-7 text-neutral-400">
                Apri il viewer, clicca per entrare nella visita, usa i comandi
                di movimento e seleziona le opere per visualizzarne le schede.
              </p>
            </article>

            <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                Catalogo e disponibilità
              </p>

              <h3 className="mt-3 text-xl font-medium">
                Ogni opera resta consultabile
              </h3>

              <p className="mt-3 text-sm leading-7 text-neutral-400">
                Il catalogo pubblico raccoglie immagini, dati tecnici, artista,
                anno, prezzo o disponibilità. Da ogni scheda puoi inviare una
                richiesta dedicata.
              </p>
            </article>

            <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                Contatto diretto
              </p>

              <h3 className="mt-3 text-xl font-medium">
                Dal visitatore al gallerista
              </h3>

              <p className="mt-3 text-sm leading-7 text-neutral-400">
                Il form raccoglie richieste su opere, disponibilità, prezzi,
                appuntamenti o informazioni generali sull’allestimento.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="catalogo" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Catalogo opere
            </p>

            <h2 className="text-3xl font-semibold md:text-4xl">
              Opere esposte
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-400">
              Consulta le opere visibili al pubblico. Ogni scheda permette di
              richiedere informazioni, disponibilità o dettagli commerciali.
            </p>
          </div>

          <p className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-400">
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
                  className="group overflow-hidden rounded-[2rem] border border-neutral-800 bg-neutral-900 transition hover:border-neutral-600"
                >
                  <div className="grid gap-0 md:grid-cols-[260px_1fr]">
                    <div className="relative aspect-[4/3] overflow-hidden bg-neutral-950 md:aspect-auto">
                      <img
                        src={artwork.thumbnail_url || artwork.image_url}
                        alt={artwork.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />

                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        {artwork.is_for_sale && (
                          <span className="rounded-full border border-blue-900 bg-blue-950/80 px-3 py-1 text-xs uppercase tracking-[0.15em] text-blue-200 backdrop-blur">
                            Disponibile
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-6">
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                        Opera #{String(galleryArtworkId).slice(0, 8)}
                      </p>

                      <h3 className="mt-3 text-2xl font-medium leading-tight">
                        {artwork.title}
                      </h3>

                      <p className="mt-2 text-sm text-neutral-400">
                        {getArtworkAuthorLine(artwork)}
                      </p>

                      <div className="mt-5 inline-flex rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-neutral-200">
                        {availabilityLabel}
                      </div>

                      <dl className="mt-5 space-y-2 text-sm text-neutral-500">
                        {artwork.technique && (
                          <div>
                            <dt className="inline text-neutral-600">
                              Tecnica:{" "}
                            </dt>
                            <dd className="inline text-neutral-300">
                              {artwork.technique}
                            </dd>
                          </div>
                        )}

                        {artwork.dimensions && (
                          <div>
                            <dt className="inline text-neutral-600">
                              Dimensioni:{" "}
                            </dt>
                            <dd className="inline text-neutral-300">
                              {artwork.dimensions}
                            </dd>
                          </div>
                        )}
                      </dl>

                      {artwork.description && (
                        <p className="mt-5 line-clamp-3 text-sm leading-7 text-neutral-400">
                          {artwork.description}
                        </p>
                      )}

                      <div className="mt-6 flex flex-wrap gap-3">
                        <a
                          href={inquiryHref}
                          className="inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                        >
                          Richiedi informazioni
                        </a>

                        <a
                          href="#viewer"
                          className="inline-flex h-10 items-center justify-center rounded-full border border-neutral-700 px-5 text-sm text-neutral-100 transition hover:border-neutral-400"
                        >
                          Vedi nel 3D
                        </a>
                      </div>

                      <details className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                        <summary className="cursor-pointer text-sm font-medium text-neutral-100">
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

      <section id="richiesta" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-neutral-800 bg-neutral-900 p-8">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Contatto
            </p>

            <h2 className="text-3xl font-semibold md:text-4xl">
              {selectedArtwork
                ? "Richiesta per l’opera selezionata"
                : "Vuoi informazioni sulla galleria?"}
            </h2>

            <p className="mt-5 text-sm leading-7 text-neutral-400">
              {selectedArtwork
                ? `Il form è stato predisposto per l’opera "${selectedArtwork.artwork.title}". Puoi modificare liberamente il messaggio prima dell’invio.`
                : "Usa il form per chiedere disponibilità, prezzi, dettagli sulle opere, appuntamenti o informazioni sull’allestimento."}
            </p>

            {selectedArtwork && (
              <div className="mt-6 rounded-2xl border border-blue-900 bg-blue-950/30 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-blue-300">
                  Opera selezionata
                </p>

                <p className="mt-2 text-base font-medium text-neutral-100">
                  {selectedArtwork.artwork.title}
                </p>

                <p className="mt-1 text-sm text-neutral-400">
                  {getArtworkAuthorLine(selectedArtwork.artwork)}
                </p>
              </div>
            )}

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                <p className="text-sm font-medium text-neutral-100">
                  Cosa puoi chiedere
                </p>

                <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-400">
                  <li>• informazioni su prezzo e disponibilità</li>
                  <li>• dettagli tecnici o documentazione dell’opera</li>
                  <li>• appuntamenti, visite o contatto diretto</li>
                  <li>• richieste generali sull’allestimento virtuale</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                <p className="text-sm leading-7 text-neutral-400">
                  I dati inviati saranno usati solo per rispondere alla tua
                  richiesta. Puoi leggere l’informativa completa nella pagina
                  privacy.
                </p>

                <a
                  href="/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm text-neutral-100 underline underline-offset-4 hover:text-white"
                >
                  Leggi informativa privacy
                </a>
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

      <section className="mx-auto max-w-7xl px-5 pb-12 pt-4 lg:px-8">
        <div className="flex flex-col justify-between gap-4 rounded-3xl border border-neutral-800 bg-neutral-900 p-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-neutral-400">
              Stai visualizzando una galleria pubblica.
            </p>

            <p className="mt-1 text-xs text-neutral-600">
              /gallerie/{gallery.slug}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="#viewer"
              className="inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
            >
              Torna al viewer
            </a>

            <a
              href="#catalogo"
              className="inline-flex h-10 items-center justify-center rounded-full border border-neutral-700 px-5 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              Catalogo opere
            </a>

            <a
              href="/gallerie"
              className="inline-flex h-10 items-center justify-center rounded-full border border-neutral-700 px-5 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              Altre gallerie
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}