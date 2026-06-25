import Link from "next/link";
import MuseumHeader from "@/components/site/MuseumHeader";
import LegalFooter from "@/components/legal/LegalFooter";

const featuredGalleries = [
  {
    initials: "MA",
    title: "Maroncelli Art Gallery",
    location: "Milano, Italia",
    works: "24 opere",
    tone: "from-stone-200/70 via-stone-500/40 to-black",
  },
  {
    initials: "LF",
    title: "Lumen Fine Art",
    location: "Londra, Regno Unito",
    works: "18 opere",
    tone: "from-[#8A6A46]/55 via-[#31251B]/80 to-black",
  },
  {
    initials: "GA",
    title: "Galleria Aurora",
    location: "Torino, Italia",
    works: "31 opere",
    tone: "from-[#E8E1D2]/80 via-[#756F65]/60 to-black",
  },
  {
    initials: "NR",
    title: "Noir Contemporary",
    location: "Berlino, Germania",
    works: "27 opere",
    tone: "from-[#4D4A43]/70 via-[#1B1915]/80 to-black",
  },
];

const stats = [
  {
    value: "12.458",
    label: "Visitatori oggi",
  },
  {
    value: "3.217",
    label: "Opere esposte",
  },
  {
    value: "482",
    label: "Gallerie attive",
  },
  {
    value: "61",
    label: "Paesi",
  },
];

const plans = [
  {
    name: "Collezionista",
    price: "Gratuito",
    description: "Esplora le gallerie, salva opere e crea le tue collezioni.",
    href: "/auth/register",
    featured: false,
  },
  {
    name: "Artista",
    price: "€19",
    suffix: "/mese",
    description: "Mostra le tue opere in una galleria personale immersiva.",
    href: "/pricing",
    featured: true,
  },
  {
    name: "Gallerista",
    price: "€49",
    suffix: "/mese",
    description: "Uno spazio professionale per la tua galleria.",
    href: "/pricing",
    featured: false,
  },
];

export default function HomePage() {
  return (
    <main className="museum-page overflow-hidden">
      <MuseumHeader />

      <section className="border-b border-[var(--museum-border)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[0.95fr_1.25fr] md:px-8 md:py-20">
          <div className="flex flex-col justify-center">
            <p className="museum-label">L’arte senza confini</p>

            <h1 className="museum-title mt-6 max-w-2xl text-6xl text-[var(--museum-ivory)] md:text-7xl lg:text-8xl">
              L’arte merita uno spazio senza confini.
            </h1>

            <p className="museum-subtitle mt-7 max-w-xl text-base text-[var(--museum-stone)] md:text-lg">
              mostra.space è il portale per vivere, esporre e collezionare arte
              in gallerie virtuali immersive.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/gallerie"
                className="museum-button-primary px-7 py-3.5"
              >
                Esplora le gallerie
              </Link>

              <Link
                href="/auth/register"
                className="museum-button-secondary px-7 py-3.5"
              >
                Crea la tua galleria
              </Link>
            </div>

            <div className="mt-11 grid grid-cols-2 gap-6 border-t border-[var(--museum-border)] pt-7 md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="font-editorial text-3xl leading-none text-[var(--museum-ivory)]">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-[var(--museum-stone-muted)]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-charcoal)] shadow-[var(--museum-shadow-soft)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(243,237,226,0.18),transparent_22rem),linear-gradient(120deg,rgba(0,0,0,0.1),rgba(0,0,0,0.72))]" />

            <div className="absolute left-1/2 top-10 h-36 w-72 -translate-x-1/2 rounded-b-full border border-[rgba(243,237,226,0.28)] bg-[radial-gradient(circle_at_center,rgba(243,237,226,0.55),rgba(243,237,226,0.08)_45%,transparent_70%)] blur-[0.2px]" />

            <div className="absolute inset-x-16 top-28 h-[22rem] rounded-t-full border border-[rgba(197,151,94,0.26)] bg-[linear-gradient(180deg,rgba(216,205,187,0.08),rgba(0,0,0,0.2))]" />

            <div className="absolute inset-x-24 bottom-0 h-52 bg-[linear-gradient(180deg,rgba(197,151,94,0.09),rgba(0,0,0,0.84))]" />

            <div className="absolute left-1/2 top-48 h-44 w-24 -translate-x-1/2 rounded-full border-[10px] border-[rgba(168,121,69,0.88)] opacity-90 shadow-[0_0_60px_rgba(168,121,69,0.18)]" />
            <div className="absolute left-1/2 top-60 h-32 w-16 -translate-x-1/2 rotate-45 rounded-full border-[8px] border-[rgba(197,151,94,0.75)] opacity-90" />

            <div className="absolute left-14 top-36 h-52 w-24 rounded-sm border border-[var(--museum-border)] bg-[linear-gradient(160deg,rgba(197,151,94,0.28),rgba(0,0,0,0.7))]" />
            <div className="absolute right-14 top-44 h-40 w-28 rounded-sm border border-[var(--museum-border)] bg-[linear-gradient(160deg,rgba(216,205,187,0.18),rgba(0,0,0,0.76))]" />
            <div className="absolute left-40 bottom-32 h-32 w-28 rounded-sm border border-[var(--museum-border)] bg-[linear-gradient(160deg,rgba(216,205,187,0.22),rgba(0,0,0,0.8))]" />

            <div className="absolute bottom-0 left-1/2 h-28 w-[70%] -translate-x-1/2 border-t border-[rgba(197,151,94,0.28)] bg-[linear-gradient(90deg,transparent,rgba(197,151,94,0.12),transparent)]" />

            <div className="absolute right-10 top-28 max-w-[11rem]">
              <p className="museum-label leading-7">
                Spazi immersivi
                <br />
                Esperienze reali
                <br />
                Connessioni globali
              </p>
              <div className="mt-5 h-px w-12 bg-[var(--museum-bronze)]" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--museum-border)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.45fr_0.9fr] md:px-8">
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="museum-label">Gallerie in evidenza</h2>

              <Link
                href="/gallerie"
                className="text-xs uppercase tracking-[0.16em] text-[var(--museum-stone-muted)] transition hover:text-[var(--museum-bronze-light)]"
              >
                Vedi tutte →
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredGalleries.map((gallery) => (
                <Link
                  key={gallery.title}
                  href="/gallerie"
                  className="group overflow-hidden rounded-2xl border border-[var(--museum-border)] bg-[var(--museum-surface)] transition hover:border-[var(--museum-bronze)]"
                >
                  <div
                    className={`relative h-40 bg-gradient-to-br ${gallery.tone}`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_20%,rgba(243,237,226,0.24),transparent_12rem)]" />
                    <div className="absolute bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--museum-ivory-soft)] bg-black/80 font-editorial text-lg text-[var(--museum-ivory)]">
                      {gallery.initials}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-editorial text-xl text-[var(--museum-ivory)]">
                      {gallery.title}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--museum-stone-muted)]">
                      {gallery.location}
                    </p>
                    <p className="mt-4 text-right text-xs text-[var(--museum-stone-muted)]">
                      {gallery.works}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="museum-card rounded-[1.75rem] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="museum-label">Scegli il tuo spazio</h2>

              <Link
                href="/pricing"
                className="text-xs uppercase tracking-[0.16em] text-[var(--museum-stone-muted)] transition hover:text-[var(--museum-bronze-light)]"
              >
                Vedi tutti i piani →
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <Link
                  key={plan.name}
                  href={plan.href}
                  className={
                    plan.featured
                      ? "relative rounded-2xl border border-[var(--museum-bronze)] bg-[rgba(168,121,69,0.08)] p-5 shadow-[var(--museum-shadow-bronze)]"
                      : "rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.38)] p-5 transition hover:border-[var(--museum-bronze)]"
                  }
                >
                  {plan.featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--museum-bronze)] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--museum-black)]">
                      Più popolare
                    </span>
                  )}

                  <p className="font-editorial text-xl text-[var(--museum-ivory-soft)]">
                    {plan.name}
                  </p>

                  <p className="mt-4 font-editorial text-3xl text-[var(--museum-ivory)]">
                    {plan.price}
                    {plan.suffix && (
                      <span className="ml-1 font-ui text-xs text-[var(--museum-stone-muted)]">
                        {plan.suffix}
                      </span>
                    )}
                  </p>

                  <p className="mt-4 min-h-16 text-xs leading-5 text-[var(--museum-stone)]">
                    {plan.description}
                  </p>

                  <span
                    className={
                      plan.featured
                        ? "museum-button-primary mt-6 w-full px-4 py-3"
                        : "museum-button-secondary mt-6 w-full px-4 py-3"
                    }
                  >
                    Inizia ora
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[0.85fr_1.45fr] md:px-8">
        <div className="flex flex-col justify-center">
          <p className="museum-label">Il tuo mondo, tutto in un luogo</p>

          <h2 className="museum-title mt-5 text-5xl text-[var(--museum-ivory)] md:text-6xl">
            Dashboard intuitiva.
            <br />
            Controllo totale.
          </h2>

          <p className="museum-subtitle mt-6 max-w-md text-sm text-[var(--museum-stone)]">
            Gestisci le tue opere, la tua galleria e le tue attività con
            strumenti professionali e semplici da usare.
          </p>

          <Link
            href="/dashboard"
            className="mt-7 inline-flex text-xs font-semibold uppercase tracking-[0.16em] text-[var(--museum-bronze-light)] transition hover:text-[var(--museum-ivory)]"
          >
            Scopri la dashboard →
          </Link>
        </div>

        <div className="museum-card-soft rounded-[1.75rem] p-5">
          <div className="flex items-center justify-between border-b border-[var(--museum-border)] pb-4">
            <div>
              <p className="museum-logo text-2xl text-[var(--museum-ivory)]">
                mostra<span className="text-[var(--museum-bronze-light)]">.</span>
                <span className="text-[var(--museum-ivory-soft)]">space</span>
              </p>
              <p className="mt-2 text-xs text-[var(--museum-stone-muted)]">
                Panoramica
              </p>
            </div>

            <Link
              href="/dashboard"
              className="museum-button-secondary px-4 py-2"
            >
              Visita la mia galleria
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {[
              ["Visitatori", "2.349", "+12% rispetto a ieri"],
              ["Visualizzazioni opere", "8.672", "+8% rispetto a ieri"],
              ["Opere esposte", "36", "—"],
              ["Richieste ricevute", "18", "+3 rispetto a ieri"],
            ].map(([label, value, detail]) => (
              <div
                key={label}
                className="rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-4"
              >
                <p className="text-xs text-[var(--museum-stone-muted)]">
                  {label}
                </p>
                <p className="mt-3 text-2xl font-semibold text-[var(--museum-ivory)]">
                  {value}
                </p>
                <p className="mt-2 text-xs text-[var(--museum-success)]">
                  {detail}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1.25fr]">
            <div className="rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-4">
              <p className="museum-label">Attività recenti</p>
              <div className="mt-4 space-y-3 text-xs text-[var(--museum-stone)]">
                <p>Nuova richiesta di informazioni per “Materia 01”</p>
                <p>Opera “Soglia #4” salvata da un collezionista</p>
                <p>Galleria “Notturno” pubblicata</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-4">
              <div className="flex items-center justify-between">
                <p className="museum-label">Visitatori negli ultimi 7 giorni</p>
                <p className="font-editorial text-2xl text-[var(--museum-ivory)]">
                  2.349
                </p>
              </div>

              <div className="mt-8 flex h-28 items-end gap-2">
                {[32, 48, 38, 62, 55, 86, 74].map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t-full bg-[linear-gradient(180deg,var(--museum-bronze-light),rgba(168,121,69,0.18))]"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}