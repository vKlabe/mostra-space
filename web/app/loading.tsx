export default function LoadingPage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
      <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col justify-center">
        <p className="mb-4 text-xs uppercase tracking-[0.35em] text-neutral-500">
          Caricamento
        </p>

        <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
          Prepariamo lo spazio.
        </h1>

        <p className="mt-6 max-w-2xl text-sm leading-7 text-neutral-400">
          Stiamo caricando dati, gallerie e contenuti della piattaforma.
        </p>

        <div className="mt-8 h-2 max-w-md overflow-hidden rounded-full bg-neutral-900">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-white" />
        </div>
      </section>
    </main>
  );
}