import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublicGalleryInquiryForm from "@/components/public/PublicGalleryInquiryForm";

type PublicGalleryPageProps = {
  params: Promise<{
    slug: string;
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

export default async function PublicGalleryDetailPage({
  params,
}: PublicGalleryPageProps) {
  const { slug } = await params;

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

  const safeGalleryArtworks = (galleryArtworks || []) as GalleryArtworkRow[];

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

  const heroDescription =
    gallery.description ||
    "Una galleria virtuale visitabile direttamente dal browser, con opere selezionate, schede informative e un ambiente 3D navigabile.";

  const publishedDate = gallery.published_at
    ? new Date(gallery.published_at).toLocaleDateString("it-IT")
    : null;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <section className="relative overflow-hidden border-b border-neutral-800">
        {gallery.cover_image_url && (
          <div className="absolute inset-0 opacity-30">
            <img
              src={gallery.cover_image_url}
              alt={gallery.title}
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/50 via-neutral-950/85 to-neutral-950" />
          </div>
        )}

        {!gallery.cover_image_url && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_30%)]" />
        )}

        <div className="relative mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-16">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-green-900 bg-green-950/40 px-3 py-1 text-xs uppercase tracking-[0.18em] text-green-300">
                  Galleria pubblica
                </span>

                {publishedDate && (
                  <span className="text-sm text-neutral-400">
                    Pubblicata il {publishedDate}
                  </span>
                )}
              </div>

              <h1 className="mt-6 max-w-5xl text-4xl font-semibold leading-tight md:text-6xl">
                {gallery.title}
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-8 text-neutral-300">
                {heroDescription}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#viewer"
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                >
                  Entra nella galleria
                </a>

                <a
                  href="#catalogo"
                  className="rounded-full border border-neutral-700 px-6 py-3 text-sm text-neutral-100 transition hover:border-neutral-400"
                >
                  Vedi catalogo opere
                </a>

                <a
                  href="#richiesta"
                  className="rounded-full border border-neutral-700 px-6 py-3 text-sm text-neutral-100 transition hover:border-neutral-400"
                >
                  Richiedi informazioni
                </a>
              </div>
            </div>

            <div className="grid min-w-full gap-3 rounded-3xl border border-neutral-800 bg-neutral-900/80 p-5 backdrop-blur md:min-w-[360px]">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-neutral-500">Opere pubbliche</span>
                <span className="text-neutral-100">{publicArtworks.length}</span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-neutral-500">Esperienza</span>
                <span className="text-neutral-100">Unity WebGL</span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-neutral-500">Accesso</span>
                <span className="text-neutral-100">Browser</span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-neutral-500">Link</span>
                <span className="break-all text-right text-neutral-100">
                  /gallerie/{gallery.slug}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="viewer" className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Viewer 3D
            </p>

            <h2 className="text-3xl font-semibold">Visita lo spazio virtuale</h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
              Muoviti nello spazio, osserva le opere allestite e usa il catalogo
              sotto al viewer per leggere le schede e inviare richieste.
            </p>
          </div>

          <a
            href="#richiesta"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Contatta il gallerista
          </a>
        </div>

        <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-black shadow-2xl">
          <iframe
            src={`/unity-frame?galleryId=${gallery.id}&mode=visitor`}
            title={`Viewer 3D ${gallery.title}`}
            className="block h-[72vh] w-full bg-black"
            allow="fullscreen; gamepad; accelerometer; gyroscope; xr-spatial-tracking"
          />
        </div>

        <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-sm leading-6 text-neutral-400">
            Suggerimento: clicca nel viewer per navigare. Se vuoi tornare a
            usare la pagina, premi ESC o clicca fuori dal viewer.
          </p>
        </div>
      </section>

      <section id="catalogo" className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Catalogo
            </p>

            <h2 className="text-3xl font-semibold">Opere esposte</h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
              Una selezione delle opere visibili al pubblico in questa galleria.
              Per ogni opera puoi inviare una richiesta specifica.
            </p>
          </div>

          <p className="text-sm text-neutral-500">
            Totale opere pubbliche: {publicArtworks.length}
          </p>
        </div>

        {galleryArtworksError && (
          <div className="mt-8 rounded-3xl border border-red-800 bg-red-950/30 p-6">
            <p className="text-lg font-medium">Errore caricamento opere</p>

            <p className="mt-2 text-sm text-red-100">
              {galleryArtworksError.message}
            </p>
          </div>
        )}

        {!galleryArtworksError && publicArtworks.length === 0 && (
          <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-8">
            <p className="text-neutral-300">
              Non ci sono ancora opere pubbliche associate a questa galleria.
            </p>

            <p className="mt-2 text-sm text-neutral-500">
              Torna più avanti oppure contatta il gallerista per informazioni.
            </p>
          </div>
        )}

        {publicArtworks.length > 0 && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {publicArtworks.map(({ galleryArtworkId, artwork }) => {
              const priceLabel = formatPrice(artwork.price, artwork.currency);

              return (
                <article
                  key={galleryArtworkId}
                  className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900"
                >
                  <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                    <div className="aspect-[4/3] bg-neutral-950 md:aspect-auto">
                      <img
                        src={artwork.thumbnail_url || artwork.image_url}
                        alt={artwork.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        {artwork.is_for_sale && (
                          <span className="rounded-full border border-blue-900 bg-blue-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-blue-300">
                            Disponibile
                          </span>
                        )}

                        {priceLabel && artwork.is_for_sale && (
                          <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
                            {priceLabel}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 text-2xl font-medium">
                        {artwork.title}
                      </h3>

                      <p className="mt-2 text-sm text-neutral-400">
                        {artwork.artist_name || "Artista non indicato"}
                        {artwork.year ? `, ${artwork.year}` : ""}
                      </p>

                      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                        {artwork.technique && (
                          <div>
                            <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                              Tecnica
                            </dt>
                            <dd className="mt-1 text-neutral-300">
                              {artwork.technique}
                            </dd>
                          </div>
                        )}

                        {artwork.dimensions && (
                          <div>
                            <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                              Dimensioni
                            </dt>
                            <dd className="mt-1 text-neutral-300">
                              {artwork.dimensions}
                            </dd>
                          </div>
                        )}
                      </dl>

                      {artwork.description && (
                        <p className="mt-4 line-clamp-4 text-sm leading-7 text-neutral-400">
                          {artwork.description}
                        </p>
                      )}

                      <details className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                        <summary className="cursor-pointer text-sm font-medium text-neutral-100">
                          Richiedi informazioni su quest’opera
                        </summary>

                        <div className="mt-5">
                          <PublicGalleryInquiryForm
                            galleryId={gallery.id}
                            galleryTitle={gallery.title}
                            artworkId={artwork.id}
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

      <section id="richiesta" className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-8">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Contatto
            </p>

            <h2 className="text-3xl font-semibold">
              Vuoi informazioni sulla galleria?
            </h2>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              Usa il form per chiedere disponibilità, prezzi, dettagli sulle
              opere, appuntamenti o informazioni sull’allestimento.
            </p>

            <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
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

          <PublicGalleryInquiryForm
            galleryId={gallery.id}
            galleryTitle={gallery.title}
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
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
            >
              Torna al viewer
            </a>

            <a
              href="/gallerie"
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              Altre gallerie
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}