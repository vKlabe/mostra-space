import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MuseumHeader from "@/components/site/MuseumHeader";
import LegalFooter from "@/components/legal/LegalFooter";
import DataErrorCard from "@/components/system/DataErrorCard";
import EmptyStateCard from "@/components/system/EmptyStateCard";
import { getErrorMessage } from "@/lib/system/getErrorMessage";

type PublicGallery = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
};

type EditorialGalleryConfig = {
  slug: string;
  location: string;
  worksLabel: string;
};

type EditorialGallery = PublicGallery & {
  editorialLocation: string;
  editorialWorksLabel: string;
};

const selectedGalleryConfig: EditorialGalleryConfig = {
  slug: "aaa",
  location: "Roma, Italia",
  worksLabel: "2 opere",
};

const featuredGalleryConfigs: EditorialGalleryConfig[] = [
  {
    slug: "aaa",
    location: "Roma, Italia",
    worksLabel: "2 opere",
  },
  {
    slug: "x",
    location: "Spazio virtuale",
    worksLabel: "0 opere",
  },
  {
    slug: "prima-galleria-definitiva",
    location: "Italia",
    worksLabel: "0 opere",
  },
];

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getInitials(title: string) {
  return title
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function PublicGalleryCover({
  src,
  title,
}: {
  src: string | null;
  title: string;
}) {
  if (!src) {
    return (
      <div className="flex h-full min-h-full items-center justify-center bg-[radial-gradient(circle_at_35%_15%,rgba(243,237,226,0.26),transparent_11rem),linear-gradient(135deg,rgba(168,121,69,0.26),rgba(8,7,5,0.92))] px-6 text-center text-sm text-[var(--museum-stone)]">
        Anteprima galleria non disponibile
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title}
      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
    />
  );
}

function SmallEditorialGalleryCard({ gallery }: { gallery: EditorialGallery }) {
  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] shadow-[var(--museum-shadow-soft)] transition hover:border-[var(--museum-bronze)]">
      <Link href={`/gallerie/${gallery.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-[var(--museum-charcoal)]">
          <PublicGalleryCover
            src={gallery.cover_image_url}
            title={gallery.title}
          />

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(8,7,5,0.78))]" />

          <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--museum-ivory-soft)] bg-black/80 font-editorial text-lg text-[var(--museum-ivory)]">
            {getInitials(gallery.title)}
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[rgba(127,175,123,0.45)] bg-[rgba(127,175,123,0.08)] px-3 py-1 text-xs uppercase tracking-[0.15em] text-[var(--museum-success)]">
              Pubblicata
            </span>

            {formatDate(gallery.published_at) && (
              <span className="text-xs text-[var(--museum-stone-muted)]">
                {formatDate(gallery.published_at)}
              </span>
            )}
          </div>

          <h3 className="mt-5 font-editorial text-3xl font-medium leading-tight text-[var(--museum-ivory)]">
            {gallery.title}
          </h3>

          <p className="mt-3 text-sm text-[var(--museum-stone-muted)]">
            {gallery.editorialLocation}
          </p>

          <p className="mt-1 text-sm text-[var(--museum-stone-muted)]">
            {gallery.editorialWorksLabel}
          </p>

          <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--museum-stone)]">
            {gallery.description ||
              "Galleria virtuale visitabile direttamente dal browser."}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="museum-button-primary px-4 py-2">
              Apri galleria
            </span>

            <span className="museum-button-secondary px-4 py-2">
              Catalogo
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default async function PublicGalleriesIndexPage() {
  const supabase = await createClient();

  const { data: galleries, error } = await supabase
    .from("galleries")
    .select(
      "id, title, slug, description, status, cover_image_url, published_at, created_at"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const safeGalleries = (galleries || []) as PublicGallery[];

  const selectedGallery =
    safeGalleries.find(
      (gallery) => gallery.slug === selectedGalleryConfig.slug
    ) || null;

  const editorialFeaturedGalleries = featuredGalleryConfigs
    .map((config) => {
      const gallery = safeGalleries.find(
        (item) => item.slug === config.slug
      );

      if (!gallery) {
        return null;
      }

      return {
        ...gallery,
        editorialLocation: config.location,
        editorialWorksLabel: config.worksLabel,
      };
    })
    .filter((gallery): gallery is EditorialGallery => gallery !== null);

  return (
    <main className="museum-page min-h-screen overflow-hidden">
      <MuseumHeader />

      <section className="border-b border-[var(--museum-border)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1.05fr_0.75fr] lg:items-end">
          <div>
            <p className="museum-label">Gallerie virtuali</p>

            <h1 className="museum-title mt-6 max-w-5xl text-6xl text-[var(--museum-ivory)] md:text-7xl">
              Esplora spazi espositivi digitali.
            </h1>

            <p className="museum-subtitle mt-7 max-w-3xl text-base text-[var(--museum-stone)] md:text-lg">
              Entra nelle gallerie pubblicate, visita gli ambienti 3D, consulta
              le opere esposte e richiedi informazioni al gallerista.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a href="#gallerie" className="museum-button-primary px-7 py-3.5">
                Sfoglia gallerie
              </a>

              <Link
                href="/pricing"
                className="museum-button-secondary px-7 py-3.5"
              >
                Crea il tuo spazio
              </Link>
            </div>
          </div>

          <div className="museum-card rounded-[1.75rem] p-6">
            <p className="museum-label">Esperienza pubblica</p>

            <div className="mt-6 space-y-4">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[var(--museum-stone-muted)]">
                  Gallerie pubbliche
                </span>
                <span className="text-[var(--museum-ivory-soft)]">
                  {safeGalleries.length}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[var(--museum-stone-muted)]">
                  Esperienza
                </span>
                <span className="text-[var(--museum-ivory-soft)]">
                  Unity WebGL
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[var(--museum-stone-muted)]">
                  Accesso
                </span>
                <span className="text-[var(--museum-ivory-soft)]">
                  Browser
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[var(--museum-stone-muted)]">
                  Interazione
                </span>
                <span className="text-[var(--museum-ivory-soft)]">
                  Form richieste
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <section className="mx-auto max-w-7xl px-4 py-10 md:px-8">
          <DataErrorCard
            title="Non riesco a caricare le gallerie pubbliche"
            message="Le gallerie pubbliche non sono state recuperate correttamente da Supabase. Puoi ricaricare la pagina oppure tornare alla home."
            details={getErrorMessage(error)}
            actionHref="/gallerie"
            actionLabel="Ricarica gallerie"
            secondaryHref="/"
            secondaryLabel="Home"
          />
        </section>
      )}

      {!error && safeGalleries.length === 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <EmptyStateCard
            eyebrow="Nessuna galleria"
            title="Non ci sono ancora gallerie pubblicate"
            message="Le gallerie create dai galleristi appariranno qui solo dopo la pubblicazione. Puoi tornare più avanti oppure creare il tuo spazio dalla dashboard."
            actionHref="/pricing"
            actionLabel="Vedi i piani"
          />
        </section>
      )}

      {!error && selectedGallery && (
        <section className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="museum-label">Scelta curatoriale</p>

              <h2 className="museum-title mt-4 text-5xl text-[var(--museum-ivory)] md:text-6xl">
                Galleria selezionata.
              </h2>

              <p className="museum-subtitle mt-5 max-w-3xl text-sm text-[var(--museum-stone)]">
                Uno spazio scelto dalla redazione di mostra.space, in evidenza
                per qualità, allestimento o progetto espositivo.
              </p>
            </div>

            <a href="#gallerie" className="museum-button-secondary px-5 py-2.5">
              Vai all’archivio
            </a>
          </div>

          <article className="group overflow-hidden rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] shadow-[var(--museum-shadow-soft)]">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <div className="min-h-[420px] overflow-hidden bg-[var(--museum-charcoal)]">
                <PublicGalleryCover
                  src={selectedGallery.cover_image_url}
                  title={selectedGallery.title}
                />
              </div>

              <div className="flex flex-col justify-between p-8">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[rgba(197,151,94,0.45)] bg-[rgba(168,121,69,0.1)] px-3 py-1 text-xs uppercase tracking-[0.15em] text-[var(--museum-bronze-light)]">
                      In homepage gallerie
                    </span>

                    {formatDate(selectedGallery.published_at) && (
                      <span className="text-xs text-[var(--museum-stone-muted)]">
                        {formatDate(selectedGallery.published_at)}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-6 font-editorial text-5xl font-medium leading-tight text-[var(--museum-ivory)]">
                    {selectedGallery.title}
                  </h3>

                  <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--museum-stone-muted)]">
                    <span>{selectedGalleryConfig.location}</span>
                    <span>•</span>
                    <span>{selectedGalleryConfig.worksLabel}</span>
                  </div>

                  <p className="mt-5 text-sm leading-7 text-[var(--museum-stone)]">
                    {selectedGallery.description ||
                      "Galleria virtuale visitabile direttamente dal browser, con opere, schede e ambiente 3D navigabile."}
                  </p>

                  <p className="mt-5 break-all text-xs text-[var(--museum-stone-muted)]">
                    /gallerie/{selectedGallery.slug}
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={`/gallerie/${selectedGallery.slug}`}
                    className="museum-button-primary px-6 py-3"
                  >
                    Entra nella galleria
                  </Link>

                  <Link
                    href={`/gallerie/${selectedGallery.slug}#catalogo`}
                    className="museum-button-secondary px-6 py-3"
                  >
                    Vedi catalogo
                  </Link>

                  <Link
                    href={`/gallerie/${selectedGallery.slug}#richiesta`}
                    className="museum-button-secondary px-6 py-3"
                  >
                    Richiedi informazioni
                  </Link>
                </div>
              </div>
            </div>
          </article>
        </section>
      )}

      {!error && editorialFeaturedGalleries.length > 0 && (
        <section className="border-t border-[var(--museum-border)]">
          <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="museum-label">In evidenza</p>

                <h2 className="museum-title mt-4 text-5xl text-[var(--museum-ivory)] md:text-6xl">
                  Tre spazi da visitare.
                </h2>

                <p className="museum-subtitle mt-5 max-w-3xl text-sm text-[var(--museum-stone)]">
                  Una selezione editoriale di gallerie pubbliche scelte da
                  mostra.space.
                </p>
              </div>

              <a
                href="#gallerie"
                className="museum-button-secondary px-5 py-2.5"
              >
                Vedi tutte
              </a>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {editorialFeaturedGalleries.map((gallery) => (
                <SmallEditorialGalleryCard
                  key={`${gallery.slug}-${gallery.id}`}
                  gallery={gallery}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {!error && safeGalleries.length > 0 && (
        <section
          id="gallerie"
          className="mx-auto max-w-7xl px-4 py-12 md:px-8"
        >
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="museum-label">Archivio pubblico</p>

              <h2 className="museum-title mt-4 text-5xl text-[var(--museum-ivory)] md:text-6xl">
                Tutte le gallerie.
              </h2>

              <p className="museum-subtitle mt-5 max-w-3xl text-sm text-[var(--museum-stone)]">
                Ogni card apre una pagina dedicata con viewer 3D, catalogo opere
                e form di richiesta informazioni.
              </p>
            </div>

            <p className="museum-pill rounded-full px-4 py-2 text-xs uppercase tracking-[0.16em]">
              Totale: {safeGalleries.length}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {safeGalleries.map((gallery) => (
              <article
                key={gallery.id}
                className="group overflow-hidden rounded-[1.75rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] shadow-[var(--museum-shadow-soft)] transition hover:border-[var(--museum-bronze)]"
              >
                <Link href={`/gallerie/${gallery.slug}`} className="block">
                  <div className="aspect-[16/10] overflow-hidden bg-[var(--museum-charcoal)]">
                    <PublicGalleryCover
                      src={gallery.cover_image_url}
                      title={gallery.title}
                    />
                  </div>

                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[rgba(127,175,123,0.45)] bg-[rgba(127,175,123,0.08)] px-3 py-1 text-xs uppercase tracking-[0.15em] text-[var(--museum-success)]">
                        Pubblicata
                      </span>

                      {formatDate(gallery.published_at) && (
                        <span className="text-xs text-[var(--museum-stone-muted)]">
                          {formatDate(gallery.published_at)}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-5 font-editorial text-3xl font-medium leading-tight text-[var(--museum-ivory)]">
                      {gallery.title}
                    </h3>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--museum-stone)]">
                      {gallery.description ||
                        "Galleria virtuale visitabile direttamente dal browser."}
                    </p>

                    <p className="mt-4 break-all text-xs text-[var(--museum-stone-muted)]">
                      /gallerie/{gallery.slug}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2">
                      <span className="museum-button-primary px-4 py-2">
                        Apri galleria
                      </span>

                      <span className="museum-button-secondary px-4 py-2">
                        Catalogo
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <LegalFooter />
    </main>
  );
}