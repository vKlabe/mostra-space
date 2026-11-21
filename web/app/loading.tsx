import T from "@/components/i18n/T";

export default function LoadingPage() {
  return (
    <main className="museum-page min-h-screen px-5 py-10 text-[var(--museum-ivory)]">
      <section role="status" className="mx-auto flex min-h-[70vh] max-w-4xl flex-col justify-center">
        <p className="mb-4 text-xs uppercase tracking-[0.35em] text-[var(--museum-stone-muted)]">
          <T textKey="loading.header.label" fallback="Caricamento" />
        </p>

        <h1 className="museum-title text-[clamp(2.4rem,7vw,4rem)]">
          <T
            textKey="loading.header.title"
            fallback="Prepariamo lo spazio."
          />
        </h1>

        <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--museum-stone)]">
          <T
            textKey="loading.header.description"
            fallback="Stiamo caricando dati, gallerie e contenuti della piattaforma."
          />
        </p>

        <div aria-hidden="true" className="mt-7 h-1 w-12 rounded-full bg-[var(--museum-bronze-light)] motion-safe:animate-pulse" />
      </section>
    </main>
  );
}