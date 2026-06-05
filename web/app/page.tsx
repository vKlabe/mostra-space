export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-neutral-400">
            Art Portal Immersivo
          </p>

          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
            Gallerie virtuali per vendere, visitare e vivere l’arte online.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
            Una piattaforma web immersiva dove galleristi, artisti, musei e
            fondazioni possono creare spazi espositivi virtuali, caricare opere,
            allestire mostre in 3D e pubblicare esperienze visitabili da browser.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
  <a
    href="/auth/register"
    className="rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
  >
    Crea account
  </a>

  <a
    href="/auth/login"
    className="rounded-full border border-neutral-700 px-6 py-3 text-sm font-medium text-neutral-100 transition hover:border-neutral-400"
  >
    Login
  </a>

  <a
    href="/gallerie"
    className="rounded-full border border-neutral-700 px-6 py-3 text-sm font-medium text-neutral-100 transition hover:border-neutral-400"
  >
    Esplora gallerie
  </a>
</div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6">
            <h2 className="text-xl font-medium">Per galleristi</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              Crea una galleria virtuale, carica le opere, allestiscile nello
              spazio 3D e pubblica un link condivisibile.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6">
            <h2 className="text-xl font-medium">Per visitatori</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              Esplora mostre online, clicca sulle opere, leggi le schede e
              richiedi informazioni o acquisto.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6">
            <h2 className="text-xl font-medium">Unity WebGL</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              L’esperienza 3D sarà integrata nel sito come viewer ed editor
              browser, leggera e pronta per PC e smartphone.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}