import Link from "next/link";
import MuseumHeader from "@/components/site/MuseumHeader";
import LegalFooter from "@/components/legal/LegalFooter";

const heroGallery = {
  title: "Dark Little Gallery",
  subtitle: "Template immersivo in evidenza",
  imageUrl: "/home/hero-gallery.jpg",
  href: "/gallerie",
};

const featuredGalleries = [
  {
    initials: "GB",
    title: "Galleria Barattolo",
    location: "Roma, Italia",
    works: "2 opere",
    imageUrl: "/home/featured-1.jpg",
    href: "/gallerie/aaa",
  },
  {
    initials: "DL",
    title: "Dark Little Gallery",
    location: "Spazio virtuale",
    works: "18 opere",
    imageUrl: "/home/featured-2.jpg",
    href: "/gallerie",
  },
  {
    initials: "LG",
    title: "Light Gallery",
    location: "White cube digitale",
    works: "12 opere",
    imageUrl: "/home/featured-3.jpg",
    href: "/gallerie",
  },
  {
    initials: "MR",
    title: "Museum Room",
    location: "Ambiente curatoriale",
    works: "24 opere",
    imageUrl: "/home/featured-4.jpg",
    href: "/gallerie",
  },
];

const featureNotes = [
  {
    title: "Spazi immersivi",
    detail: "Ambienti virtuali curati",
  },
  {
    title: "Browser experience",
    detail: "Accesso diretto senza app",
  },
  {
    title: "Curatela digitale",
    detail: "Schede, opere e richieste",
  },
  {
    title: "Pubblicazione rapida",
    detail: "Dal template allo spazio online",
  },
];

const plans = [
  {
    name: "Free",
    price: "0€",
    description: "1 galleria, 15 opere e anteprima catalogo PDF.",
    href: "/auth/register",
    featured: false,
    badge: "Ingresso",
  },
  {
    name: "Pro",
    price: "14,90€",
    suffix: "/mese",
    description: "5 gallerie, 150 opere e PDF elegante per le tue mostre.",
    href: "/pricing",
    featured: true,
    badge: "Più popolare",
  },
  {
    name: "Business",
    price: "24,90€",
    suffix: "/mese",
    description: "10 gallerie, 250 opere e cataloghi PDF con tutti i layout.",
    href: "/pricing",
    featured: false,
    badge: "Gallerie",
  },
  {
    name: "Diamond",
    price: "49€",
    suffix: "/mese",
    description: "15 gallerie, 500 opere e massima capacità espositiva.",
    href: "/pricing",
    featured: false,
    badge: "Premium",
  },
];

const platformPillars = [
  {
    title: "Mostre online vere",
    detail:
      "Non una semplice pagina portfolio: uno spazio espositivo visitabile, ordinato e condivisibile.",
  },
  {
    title: "Opere, schede e richieste",
    detail:
      "Carichi le opere, costruisci la galleria, ricevi contatti e tieni tutto sotto controllo.",
  },
  {
    title: "Cataloghi PDF",
    detail:
      "Dalla galleria digitale puoi generare cataloghi professionali con QR, testi e layout diversi.",
  },
  {
    title: "Marketplace di spazi",
    detail:
      "Template e ambienti acquistabili per dare alla mostra una forma visiva più forte.",
  },
];

function GalleryImage({
  src,
  alt,
  initials,
}: {
  src: string;
  alt: string;
  initials: string;
}) {
  if (!src) {
    return (
      <div className="relative h-full min-h-full bg-[radial-gradient(circle_at_35%_20%,rgba(243,237,226,0.28),transparent_11rem),linear-gradient(135deg,rgba(168,121,69,0.34),rgba(8,7,5,0.92))]">
        <div className="absolute bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--museum-ivory-soft)] bg-black/80 font-editorial text-lg text-[var(--museum-ivory)]">
          {initials}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-full overflow-hidden bg-[var(--museum-charcoal)]">
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05),rgba(8,7,5,0.78))]" />

      <div className="absolute bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--museum-ivory-soft)] bg-black/80 font-editorial text-lg text-[var(--museum-ivory)]">
        {initials}
      </div>
    </div>
  );
}

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
              {featureNotes.map((item) => (
                <div key={item.title}>
                  <p className="font-editorial text-2xl leading-none text-[var(--museum-ivory)]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--museum-stone-muted)]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Link
            href={heroGallery.href}
            className="group relative min-h-[520px] overflow-hidden rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-charcoal)] shadow-[var(--museum-shadow-soft)]"
          >
            {heroGallery.imageUrl ? (
              <>
                <img
                  src={heroGallery.imageUrl}
                  alt={heroGallery.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,7,5,0.18),rgba(8,7,5,0.62)),linear-gradient(180deg,rgba(8,7,5,0.08),rgba(8,7,5,0.78))]" />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(243,237,226,0.18),transparent_22rem),linear-gradient(120deg,rgba(0,0,0,0.1),rgba(0,0,0,0.72))]" />
                <div className="absolute left-1/2 top-10 h-36 w-72 -translate-x-1/2 rounded-b-full border border-[rgba(243,237,226,0.28)] bg-[radial-gradient(circle_at_center,rgba(243,237,226,0.55),rgba(243,237,226,0.08)_45%,transparent_70%)] blur-[0.2px]" />
                <div className="absolute inset-x-16 top-28 h-[22rem] rounded-t-full border border-[rgba(197,151,94,0.26)] bg-[linear-gradient(180deg,rgba(216,205,187,0.08),rgba(0,0,0,0.2))]" />
                <div className="absolute left-1/2 top-48 h-44 w-24 -translate-x-1/2 rounded-full border-[10px] border-[rgba(168,121,69,0.88)] opacity-90 shadow-[0_0_60px_rgba(168,121,69,0.18)]" />
                <div className="absolute left-1/2 top-60 h-32 w-16 -translate-x-1/2 rotate-45 rounded-full border-[8px] border-[rgba(197,151,94,0.75)] opacity-90" />
              </>
            )}

            <div className="absolute right-10 top-10 max-w-[12rem]">
              <p className="museum-label leading-7">
                Spazi immersivi
                <br />
                Esperienze reali
                <br />
                Connessioni globali
              </p>
              <div className="mt-5 h-px w-12 bg-[var(--museum-bronze)]" />
            </div>

            <div className="absolute bottom-8 left-8 right-8 rounded-3xl border border-[rgba(216,205,187,0.16)] bg-[rgba(8,7,5,0.68)] p-5 backdrop-blur-md">
              <p className="museum-label">{heroGallery.subtitle}</p>

              <h2 className="mt-3 font-editorial text-4xl leading-tight text-[var(--museum-ivory)]">
                {heroGallery.title}
              </h2>

              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--museum-bronze-light)]">
                Visita la galleria →
              </p>
            </div>
          </Link>
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
                  href={gallery.href}
                  className="group overflow-hidden rounded-2xl border border-[var(--museum-border)] bg-[var(--museum-surface)] transition hover:border-[var(--museum-bronze)]"
                >
                  <div className="h-44">
                    <GalleryImage
                      src={gallery.imageUrl}
                      alt={gallery.title}
                      initials={gallery.initials}
                    />
                  </div>

                  <div className="p-4">
                    <h3 className="font-editorial text-xl leading-tight text-[var(--museum-ivory)]">
                      {gallery.title}
                    </h3>

                    <p className="mt-2 text-xs text-[var(--museum-stone-muted)]">
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

            <div className="grid gap-4 sm:grid-cols-2">
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

                  {!plan.featured && plan.badge && (
                    <span className="mb-4 inline-flex rounded-full border border-[var(--museum-border)] px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-[var(--museum-stone-muted)]">
                      {plan.badge}
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

                  <p className="mt-4 min-h-20 text-xs leading-5 text-[var(--museum-stone)]">
                    {plan.description}
                  </p>

                  <span
                    className={
                      plan.featured
                        ? "museum-button-primary mt-6 w-full px-4 py-3"
                        : "museum-button-secondary mt-6 w-full px-4 py-3"
                    }
                  >
                    {plan.name === "Free" ? "Inizia gratis" : "Vedi il piano"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--museum-border)]">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-18">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="museum-label">Cos’è mostra.space</p>

              <h2 className="museum-title mt-5 max-w-3xl text-5xl text-[var(--museum-ivory)] md:text-6xl">
                La tua mostra online, pronta da visitare, condividere e vendere.
              </h2>

              <p className="museum-subtitle mt-6 max-w-2xl text-sm text-[var(--museum-stone)] md:text-base">
                MostraSpace trasforma opere, testi, immagini e identità visiva
                in uno spazio espositivo digitale completo: una galleria
                immersiva da browser, una dashboard per gestirla e strumenti
                professionali per presentarla al pubblico.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/auth/register"
                  className="museum-button-primary px-7 py-3.5"
                >
                  Crea il tuo spazio
                </Link>

                <Link
                  href="/marketplace"
                  className="museum-button-secondary px-7 py-3.5"
                >
                  Scopri il marketplace
                </Link>
              </div>
            </div>

            <div className="museum-card-soft rounded-[1.75rem] p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {platformPillars.map((item, index) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--museum-bronze-light)]">
                      {String(index + 1).padStart(2, "0")}
                    </p>

                    <h3 className="mt-5 font-editorial text-2xl leading-tight text-[var(--museum-ivory)]">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-xs leading-6 text-[var(--museum-stone)]">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-[rgba(197,151,94,0.34)] bg-[rgba(168,121,69,0.08)] p-5">
                <p className="museum-label">Dal portfolio alla mostra</p>

                <p className="mt-4 font-editorial text-3xl leading-tight text-[var(--museum-ivory)]">
                  Carichi le opere. Scegli lo spazio. Pubblici la galleria.
                  Generi il catalogo.
                </p>

                <p className="mt-4 text-sm leading-7 text-[var(--museum-stone)]">
                  Tutto in un unico flusso: più rapido di un sito su misura, più
                  professionale di un semplice portfolio, più immersivo di una
                  pagina statica.
                </p>
              </div>
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
              ["Spazi", "Template", "Gallerie configurabili"],
              ["Opere", "Catalogo", "Schede e immagini"],
              ["Richieste", "Lead", "Contatti dal pubblico"],
              ["Piano", "Billing", "Limiti e abbonamento"],
            ].map(([label, value, detail]) => (
              <div
                key={label}
                className="rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-4"
              >
                <p className="text-xs text-[var(--museum-stone-muted)]">
                  {label}
                </p>

                <p className="mt-3 font-editorial text-2xl text-[var(--museum-ivory)]">
                  {value}
                </p>

                <p className="mt-2 text-xs text-[var(--museum-stone-muted)]">
                  {detail}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1.25fr]">
            <div className="rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-4">
              <p className="museum-label">Attività recenti</p>

              <div className="mt-4 space-y-3 text-xs text-[var(--museum-stone)]">
                <p>Nuova richiesta ricevuta da una galleria pubblica</p>
                <p>Opera salvata da un collezionista</p>
                <p>Template aggiornato nello spazio espositivo</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-4">
              <div className="flex items-center justify-between">
                <p className="museum-label">Flusso espositivo</p>

                <p className="font-editorial text-2xl text-[var(--museum-ivory)]">
                  Live
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