export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
      <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col justify-center">
        <p className="mb-4 text-xs uppercase tracking-[0.35em] text-neutral-500">
          404
        </p>

        <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
          Questa pagina non esiste o non è più disponibile.
        </h1>

        <p className="mt-6 max-w-2xl text-sm leading-7 text-neutral-400">
          Il link potrebbe essere stato modificato, la galleria potrebbe essere
          stata archiviata oppure la risorsa non è pubblica.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/gallerie"
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            Esplora gallerie
          </a>

          <a
            href="/dashboard"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Vai alla dashboard
          </a>

          <a
            href="/"
            className="rounded-full border border-neutral-800 px-5 py-2 text-sm text-neutral-400 transition hover:border-neutral-600 hover:text-neutral-100"
          >
            Home
          </a>
        </div>
      </section>
    </main>
  );
}