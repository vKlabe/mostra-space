import { createClient } from "@/lib/supabase/server";

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

  const featuredGallery = safeGalleries[0] || null;
  const otherGalleries = featuredGallery ? safeGalleries.slice(1) : safeGalleries;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <section className="relative overflow-hidden border-b border-neutral-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_30%)]" />

        <div className="relative mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-16">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="mb-4 text-xs uppercase tracking-[0.35em] text-neutral-500">
                Gallerie virtuali
              </p>

              <h1 className="max-w-5xl text-4xl font-semibold leading-tight md:text-6xl">
                Esplora spazi espositivi digitali, direttamente dal browser.
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-8 text-neutral-300">
                Entra nelle gallerie pubblicate, visita gli ambienti 3D,
                consulta le opere esposte e richiedi informazioni al gallerista.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#gallerie"
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                >
                  Sfoglia gallerie
                </a>

                <a
                  href="/pricing"
                  className="rounded-full border border-neutral-700 px-6 py-3 text-sm text-neutral-100 transition hover:border-neutral-400"
                >
                  Crea il tuo spazio
                </a>
              </div>
            </div>

            <div className="grid min-w-full gap-3 rounded-3xl border border-neutral-800 bg-neutral-900/80 p-5 backdrop-blur md:min-w-[360px]">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-neutral-500">Gallerie pubbliche</span>
                <span className="text-neutral-100">{safeGalleries.length}</span>
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
                <span className="text-neutral-500">Interazione</span>
                <span className="text-neutral-100">Form richieste</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="rounded-3xl border border-red-800 bg-red-950/30 p-6">
            <p className="text-lg font-medium">Errore caricamento gallerie</p>

            <p className="mt-2 text-sm text-red-100">{error.message}</p>
          </div>
        </section>
      )}

      {!error && safeGalleries.length === 0 && (
        <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-8">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Nessuna galleria
            </p>

            <h2 className="text-3xl font-semibold">
              Non ci sono ancora gallerie pubblicate.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-400">
              Le gallerie create dai galleristi appariranno qui solo dopo la
              pubblicazione.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/dashboard"
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                Vai alla dashboard
              </a>

              <a
                href="/pricing"
                className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
              >
                Vedi i piani
              </a>
            </div>
          </div>
        </section>
      )}

      {!error && featuredGallery && (
        <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                In evidenza
              </p>

              <h2 className="text-3xl font-semibold">
                Ultima galleria pubblicata
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                Lo spazio più recente disponibile alla visita pubblica.
              </p>
            </div>

            <a
              href="#gallerie"
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              Vedi tutte
            </a>
          </div>

          <article className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
            <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="min-h-[360px] bg-neutral-950">
                {featuredGallery.cover_image_url ? (
                  <img
                    src={featuredGallery.cover_image_url}
                    alt={featuredGallery.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-[360px] items-center justify-center px-6 text-center text-sm text-neutral-500">
                    Anteprima galleria non disponibile
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between p-8">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-green-900 bg-green-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-green-300">
                      Pubblicata
                    </span>

                    {formatDate(featuredGallery.published_at) && (
                      <span className="text-xs text-neutral-500">
                        {formatDate(featuredGallery.published_at)}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-5 text-4xl font-semibold leading-tight">
                    {featuredGallery.title}
                  </h3>

                  <p className="mt-5 text-sm leading-7 text-neutral-400">
                    {featuredGallery.description ||
                      "Galleria virtuale visitabile direttamente dal browser, con opere, schede e ambiente 3D navigabile."}
                  </p>

                  <p className="mt-5 break-all text-xs text-neutral-600">
                    /gallerie/{featuredGallery.slug}
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href={`/gallerie/${featuredGallery.slug}`}
                    className="rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                  >
                    Entra nella galleria
                  </a>

                  <a
                    href={`/gallerie/${featuredGallery.slug}#catalogo`}
                    className="rounded-full border border-neutral-700 px-6 py-3 text-sm text-neutral-100 transition hover:border-neutral-400"
                  >
                    Vedi catalogo
                  </a>

                  <a
                    href={`/gallerie/${featuredGallery.slug}#richiesta`}
                    className="rounded-full border border-neutral-700 px-6 py-3 text-sm text-neutral-100 transition hover:border-neutral-400"
                  >
                    Richiedi informazioni
                  </a>
                </div>
              </div>
            </div>
          </article>
        </section>
      )}

      {!error && safeGalleries.length > 0 && (
        <section id="gallerie" className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                Archivio pubblico
              </p>

              <h2 className="text-3xl font-semibold">Tutte le gallerie</h2>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                Ogni card apre una pagina dedicata con viewer 3D, catalogo opere
                e form di richiesta informazioni.
              </p>
            </div>

            <p className="text-sm text-neutral-500">
              Totale: {safeGalleries.length}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {(featuredGallery ? otherGalleries : safeGalleries).map(
              (gallery) => (
                <article
                  key={gallery.id}
                  className="group overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 transition hover:border-neutral-600"
                >
                  <a href={`/gallerie/${gallery.slug}`} className="block">
                    <div className="aspect-[16/10] overflow-hidden bg-neutral-950">
                      {gallery.cover_image_url ? (
                        <img
                          src={gallery.cover_image_url}
                          alt={gallery.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-neutral-500">
                          Anteprima galleria non disponibile
                        </div>
                      )}
                    </div>
                  </a>

                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-green-900 bg-green-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-green-300">
                        Pubblicata
                      </span>

                      {formatDate(gallery.published_at) && (
                        <span className="text-xs text-neutral-500">
                          {formatDate(gallery.published_at)}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-2xl font-medium leading-tight">
                      {gallery.title}
                    </h3>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-400">
                      {gallery.description ||
                        "Galleria virtuale visitabile direttamente dal browser."}
                    </p>

                    <p className="mt-4 break-all text-xs text-neutral-600">
                      /gallerie/{gallery.slug}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2">
                      <a
                        href={`/gallerie/${gallery.slug}`}
                        className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                      >
                        Apri galleria
                      </a>

                      <a
                        href={`/gallerie/${gallery.slug}#catalogo`}
                        className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                      >
                        Catalogo
                      </a>
                    </div>
                  </div>
                </article>
              )
            )}

            {featuredGallery && otherGalleries.length === 0 && (
              <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-8">
                <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                  Archivio
                </p>

                <h3 className="text-2xl font-medium">
                  Per ora c’è una sola galleria pubblicata.
                </h3>

                <p className="mt-3 text-sm leading-7 text-neutral-400">
                  Quando verranno pubblicate nuove gallerie, appariranno qui.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 pb-12 pt-4 lg:px-8">
        <div className="flex flex-col justify-between gap-4 rounded-3xl border border-neutral-800 bg-neutral-900 p-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-neutral-300">
              Vuoi creare una galleria virtuale pubblica?
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              Carica opere, scegli un template, pubblica lo spazio e condividi
              il link.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/pricing"
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
            >
              Vedi i piani
            </a>

            <a
              href="/dashboard"
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              Dashboard
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}