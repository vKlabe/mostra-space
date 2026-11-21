import Link from "next/link";
import T from "@/components/i18n/T";

export default function NotFoundPage() {
  return (
    <main className="museum-page min-h-screen px-5 py-10 text-[var(--museum-ivory)]">
      <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col justify-center">
        <p className="mb-4 text-xs uppercase tracking-[0.35em] text-[var(--museum-stone-muted)]">
          <T textKey="notFound.header.label" fallback="404" />
        </p>

        <h1 className="museum-title text-[clamp(2.4rem,7vw,4rem)]">
          <T
            textKey="notFound.header.title"
            fallback="Questa pagina non esiste o non è più disponibile."
          />
        </h1>

        <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--museum-stone)]">
          <T
            textKey="notFound.header.description"
            fallback="Il link potrebbe essere stato modificato, la galleria potrebbe essere stata archiviata oppure la risorsa non è pubblica."
          />
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/gallerie"
            className="museum-button-primary px-5 py-2.5 text-sm"
          >
            <T
              textKey="notFound.actions.exploreGalleries"
              fallback="Esplora gallerie"
            />
          </Link>

          <Link
            href="/dashboard"
            className="museum-button-secondary px-5 py-2.5 text-sm"
          >
            <T
              textKey="notFound.actions.dashboard"
              fallback="Vai alla dashboard"
            />
          </Link>

          <Link
            href="/"
            className="rounded-full border border-neutral-800 px-5 py-2 text-sm text-neutral-400 transition hover:border-neutral-600 hover:text-neutral-100"
          >
            <T textKey="notFound.actions.home" fallback="Home" />
          </Link>
        </div>
      </section>
    </main>
  );
}
