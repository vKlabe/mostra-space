import MuseumHeader from "@/components/site/MuseumHeader";
import T from "@/components/i18n/T";

const launchStartsAtUtc = "20260915T160000Z";
const launchEndsAtUtc = "20260915T170000Z";

const googleCalendarUrl = `https://calendar.google.com/calendar/render?${new URLSearchParams({
  action: "TEMPLATE",
  text: "Presentazione ufficiale MostraSpace",
  dates: `${launchStartsAtUtc}/${launchEndsAtUtc}`,
  details:
    "Presentazione ufficiale di MostraSpace: una visita guidata live dall’interno di una galleria digitale. Pagina evento: https://mostra.space/launch",
  location: "Online — mostra.space/launch",
}).toString()}`;

const trailerUrl = process.env.NEXT_PUBLIC_LAUNCH_TRAILER_URL || "";
const joinUrl = process.env.NEXT_PUBLIC_LAUNCH_JOIN_URL || "";

function getEmbeddableTrailerUrl(url: string) {
  if (!url) {
    return "";
  }

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes("youtube.com")) {
      const videoId = parsedUrl.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }

    if (parsedUrl.hostname.includes("youtu.be")) {
      const videoId = parsedUrl.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }

    if (parsedUrl.hostname.includes("vimeo.com")) {
      const videoId = parsedUrl.pathname.replace("/", "");
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    }

    return url;
  } catch {
    return "";
  }
}

const embeddableTrailerUrl = getEmbeddableTrailerUrl(trailerUrl);

export default function LaunchPage() {
  return (
    <>
      <MuseumHeader />

      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
        <section className="mx-auto max-w-6xl">
          <div className="rounded-[2rem] border border-amber-900/45 bg-[radial-gradient(circle_at_top_left,rgba(197,151,94,0.22),transparent_36%),linear-gradient(135deg,rgba(23,23,23,0.98),rgba(0,0,0,0.96))] p-6 shadow-2xl md:p-10">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-400">
              <T textKey="launchPage.hero.kicker" fallback="Lancio MostraSpace" />
            </p>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <h1 className="font-serif text-5xl leading-tight text-neutral-50 md:text-7xl">
                  <T
                    textKey="launchPage.hero.title"
                    fallback="La presentazione ufficiale di mostra.space"
                  />
                </h1>

                <p className="mt-6 max-w-3xl text-base leading-8 text-neutral-300 md:text-lg">
                  <T
                    textKey="launchPage.hero.description"
                    fallback="Il 15 settembre alle 18:00 presenteremo mostra.space live dall’interno di una galleria digitale: cos’è, come funziona e come artisti, gallerie, curatori, giornalisti e visitatori possono usarlo."
                  />
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  {joinUrl ? (
                    <a
                      href={joinUrl}
                      className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                    >
                      <T
                        textKey="launchPage.hero.joinEvent"
                        fallback="Partecipa all’evento live"
                      />
                    </a>
                  ) : (
                    <span className="rounded-full border border-amber-900 bg-amber-950/25 px-6 py-3 text-sm font-semibold text-amber-100">
                      <T
                        textKey="launchPage.hero.joinLinkSoon"
                        fallback="Il link per partecipare sarà disponibile qui prima dell’evento"
                      />
                    </span>
                  )}

                  <a
                    href={googleCalendarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-100 transition hover:border-neutral-400"
                  >
                    <T
                      textKey="launchPage.hero.addGoogleCalendar"
                      fallback="Aggiungi a Google Calendar"
                    />
                  </a>

                  <a
                    href="/api/launch-calendar"
                    className="rounded-full border border-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-100 transition hover:border-neutral-400"
                  >
                    <T
                      textKey="launchPage.hero.downloadIcs"
                      fallback="Scarica file calendario"
                    />
                  </a>
                </div>
              </div>

              <aside className="rounded-[1.6rem] border border-neutral-800 bg-black/45 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">
                  <T textKey="launchPage.info.label" fallback="Dettagli evento" />
                </p>

                <dl className="mt-5 grid gap-4 text-sm">
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                    <dt className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      <T textKey="launchPage.info.when.label" fallback="Quando" />
                    </dt>
                    <dd className="mt-2 text-neutral-100">
                      <T
                        textKey="launchPage.info.when.value"
                        fallback="15 settembre 2026, 18:00–19:00 · Europe/Rome"
                      />
                    </dd>
                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                    <dt className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      <T textKey="launchPage.info.where.label" fallback="Dove" />
                    </dt>
                    <dd className="mt-2 text-neutral-100">
                      <T
                        textKey="launchPage.info.where.value"
                        fallback="Online, dentro una galleria digitale di mostra.space"
                      />
                    </dd>
                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                    <dt className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      <T textKey="launchPage.info.forWhom.label" fallback="Per chi" />
                    </dt>
                    <dd className="mt-2 text-neutral-100">
                      <T
                        textKey="launchPage.info.forWhom.value"
                        fallback="Artisti, gallerie, curatori, giornalisti, istituzioni e visitatori"
                      />
                    </dd>
                  </div>
                </dl>
              </aside>
            </div>
          </div>

          <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
            <article className="rounded-[2rem] border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-amber-500">
                <T textKey="launchPage.trailer.label" fallback="Trailer" />
              </p>

              <h2 className="mt-3 font-serif text-3xl text-neutral-50">
                <T
                  textKey="launchPage.trailer.title"
                  fallback="Un’anteprima dello spazio"
                />
              </h2>

              <div className="mt-6 aspect-video overflow-hidden rounded-[1.5rem] border border-neutral-800 bg-black">
                {embeddableTrailerUrl ? (
                  <iframe
                    src={embeddableTrailerUrl}
                    title="Trailer di lancio MostraSpace"
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-8 text-center">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-neutral-600">
                        <T
                          textKey="launchPage.trailer.placeholder.label"
                          fallback="Trailer in arrivo"
                        />
                      </p>
                      <p className="mt-4 max-w-lg text-sm leading-7 text-neutral-400">
                        <T
                          textKey="launchPage.trailer.placeholder.description"
                          fallback="Il trailer di lancio sarà disponibile qui prima della presentazione."
                        />
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[2rem] border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-amber-500">
                <T textKey="launchPage.program.label" fallback="Programma" />
              </p>

              <h2 className="mt-3 font-serif text-3xl text-neutral-50">
                <T
                  textKey="launchPage.program.title"
                  fallback="Cosa succederà dalle 18:00 alle 19:00"
                />
              </h2>

              <div className="mt-6 grid gap-3">
                {[
                  {
                    timeKey: "launchPage.program.item1.time",
                    timeFallback: "18:00",
                    titleKey: "launchPage.program.item1.title",
                    titleFallback: "Benvenuto e apertura live",
                    descriptionKey: "launchPage.program.item1.description",
                    descriptionFallback:
                      "Una breve introduzione al progetto e alla galleria digitale da cui si svolge il lancio.",
                  },
                  {
                    timeKey: "launchPage.program.item2.time",
                    timeFallback: "18:10",
                    titleKey: "launchPage.program.item2.title",
                    titleFallback: "Che cos’è mostra.space",
                    descriptionKey: "launchPage.program.item2.description",
                    descriptionFallback:
                      "La piattaforma, il suo posizionamento e l’idea di dare alle opere uno spazio digitale visitabile.",
                  },
                  {
                    timeKey: "launchPage.program.item3.time",
                    timeFallback: "18:25",
                    titleKey: "launchPage.program.item3.title",
                    titleFallback: "Visita guidata live dentro una galleria",
                    descriptionKey: "launchPage.program.item3.description",
                    descriptionFallback:
                      "Un percorso guidato tra viewer, opere, catalogo e funzioni di interazione.",
                  },
                  {
                    timeKey: "launchPage.program.item4.time",
                    timeFallback: "18:40",
                    titleKey: "launchPage.program.item4.title",
                    titleFallback: "Strumenti per artisti, gallerie e istituzioni",
                    descriptionKey: "launchPage.program.item4.description",
                    descriptionFallback:
                      "Iscrizione gratuita, prima galleria, mostre pubbliche/private, incorporamento nel sito e offerte di lancio.",
                  },
                  {
                    timeKey: "launchPage.program.item5.time",
                    timeFallback: "18:50",
                    titleKey: "launchPage.program.item5.title",
                    titleFallback: "Domande e prossimi passi",
                    descriptionKey: "launchPage.program.item5.description",
                    descriptionFallback:
                      "Una fase finale di domande e indicazioni pratiche per aprire un account e creare il primo spazio.",
                  },
                ].map((item) => (
                  <div
                    key={item.timeKey}
                    className="grid gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 md:grid-cols-[82px_1fr]"
                  >
                    <p className="text-sm font-semibold text-amber-300">
                      <T textKey={item.timeKey} fallback={item.timeFallback} />
                    </p>
                    <div>
                      <h3 className="font-medium text-neutral-100">
                        <T textKey={item.titleKey} fallback={item.titleFallback} />
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">
                        <T
                          textKey={item.descriptionKey}
                          fallback={item.descriptionFallback}
                        />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="mt-10 rounded-[2rem] border border-neutral-800 bg-neutral-900 p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-amber-500">
                  <T textKey="launchPage.finalCta.label" fallback="Un solo link per la campagna" />
                </p>
                <h2 className="mt-3 font-serif text-3xl text-neutral-50">
                  <T
                    textKey="launchPage.finalCta.title"
                    fallback="Salva questa pagina e torna il giorno del lancio"
                  />
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                  <T
                    textKey="launchPage.finalCta.description"
                    fallback="Questa è la pagina centrale per il lancio ufficiale di mostra.space: link calendario, trailer, programma e accesso alla presentazione live resteranno tutti qui."
                  />
                </p>
              </div>

              <div className="flex flex-wrap gap-3 md:justify-end">
                {joinUrl ? (
                  <a
                    href={joinUrl}
                    className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                  >
                    <T
                      textKey="launchPage.finalCta.join"
                      fallback="Partecipa alla presentazione"
                    />
                  </a>
                ) : null}

                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-100 transition hover:border-neutral-400"
                >
                  <T
                    textKey="launchPage.finalCta.calendar"
                    fallback="Aggiungi al calendario"
                  />
                </a>
              </div>
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
