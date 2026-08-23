import MuseumHeader from "@/components/site/MuseumHeader";
import T from "@/components/i18n/T";

const launchStartsAtUtc = "20260915T160000Z";
const launchEndsAtUtc = "20260915T170000Z";

const googleCalendarUrl = `https://calendar.google.com/calendar/render?${new URLSearchParams({
  action: "TEMPLATE",
  text: "MostraSpace Launch Presentation",
  dates: `${launchStartsAtUtc}/${launchEndsAtUtc}`,
  details:
    "Official MostraSpace presentation: a live guided presentation from inside a digital gallery. Landing page: https://mostra.space/launch",
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
              <T textKey="launch.hero.kicker" fallback="MostraSpace launch" />
            </p>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <h1 className="font-serif text-5xl leading-tight text-neutral-50 md:text-7xl">
                  <T
                    textKey="launch.hero.title"
                    fallback="The official presentation of mostra.space"
                  />
                </h1>

                <p className="mt-6 max-w-3xl text-base leading-8 text-neutral-300 md:text-lg">
                  <T
                    textKey="launch.hero.description"
                    fallback="On 15 September at 18:00, we will present mostra.space live from inside a digital gallery: what it is, how it works, and how artists, galleries, curators, journalists and visitors can use it."
                  />
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  {joinUrl ? (
                    <a
                      href={joinUrl}
                      className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                    >
                      <T
                        textKey="launch.hero.joinEvent"
                        fallback="Join the live event"
                      />
                    </a>
                  ) : (
                    <span className="rounded-full border border-amber-900 bg-amber-950/25 px-6 py-3 text-sm font-semibold text-amber-100">
                      <T
                        textKey="launch.hero.joinLinkSoon"
                        fallback="The live link will appear here before the event"
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
                      textKey="launch.hero.addGoogleCalendar"
                      fallback="Add to Google Calendar"
                    />
                  </a>

                  <a
                    href="/api/launch-calendar"
                    className="rounded-full border border-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-100 transition hover:border-neutral-400"
                  >
                    <T
                      textKey="launch.hero.downloadIcs"
                      fallback="Download calendar file"
                    />
                  </a>
                </div>
              </div>

              <aside className="rounded-[1.6rem] border border-neutral-800 bg-black/45 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">
                  <T textKey="launch.info.label" fallback="Event details" />
                </p>

                <dl className="mt-5 grid gap-4 text-sm">
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                    <dt className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      <T textKey="launch.info.when.label" fallback="When" />
                    </dt>
                    <dd className="mt-2 text-neutral-100">
                      <T
                        textKey="launch.info.when.value"
                        fallback="15 September 2026, 18:00–19:00 · Europe/Rome"
                      />
                    </dd>
                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                    <dt className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      <T textKey="launch.info.where.label" fallback="Where" />
                    </dt>
                    <dd className="mt-2 text-neutral-100">
                      <T
                        textKey="launch.info.where.value"
                        fallback="Online, inside a mostra.space digital gallery"
                      />
                    </dd>
                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                    <dt className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      <T textKey="launch.info.forWhom.label" fallback="For whom" />
                    </dt>
                    <dd className="mt-2 text-neutral-100">
                      <T
                        textKey="launch.info.forWhom.value"
                        fallback="Artists, galleries, curators, journalists, institutions and visitors"
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
                <T textKey="launch.trailer.label" fallback="Trailer" />
              </p>

              <h2 className="mt-3 font-serif text-3xl text-neutral-50">
                <T
                  textKey="launch.trailer.title"
                  fallback="A preview of the space"
                />
              </h2>

              <div className="mt-6 aspect-video overflow-hidden rounded-[1.5rem] border border-neutral-800 bg-black">
                {embeddableTrailerUrl ? (
                  <iframe
                    src={embeddableTrailerUrl}
                    title="MostraSpace launch trailer"
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-8 text-center">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-neutral-600">
                        <T
                          textKey="launch.trailer.placeholder.label"
                          fallback="Trailer coming soon"
                        />
                      </p>
                      <p className="mt-4 max-w-lg text-sm leading-7 text-neutral-400">
                        <T
                          textKey="launch.trailer.placeholder.description"
                          fallback="The launch trailer will be available here before the presentation."
                        />
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[2rem] border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-amber-500">
                <T textKey="launch.program.label" fallback="Programme" />
              </p>

              <h2 className="mt-3 font-serif text-3xl text-neutral-50">
                <T
                  textKey="launch.program.title"
                  fallback="What will happen from 18:00 to 19:00"
                />
              </h2>

              <div className="mt-6 grid gap-3">
                {[
                  {
                    timeKey: "launch.program.item1.time",
                    timeFallback: "18:00",
                    titleKey: "launch.program.item1.title",
                    titleFallback: "Welcome and live opening",
                    descriptionKey: "launch.program.item1.description",
                    descriptionFallback:
                      "A short introduction to the project and to the digital gallery where the launch takes place.",
                  },
                  {
                    timeKey: "launch.program.item2.time",
                    timeFallback: "18:10",
                    titleKey: "launch.program.item2.title",
                    titleFallback: "What mostra.space is",
                    descriptionKey: "launch.program.item2.description",
                    descriptionFallback:
                      "The platform, its positioning and the idea of giving artworks a digital space people can visit.",
                  },
                  {
                    timeKey: "launch.program.item3.time",
                    timeFallback: "18:25",
                    titleKey: "launch.program.item3.title",
                    titleFallback: "Live walkthrough inside a gallery",
                    descriptionKey: "launch.program.item3.description",
                    descriptionFallback:
                      "A guided visit through the viewer, artworks, catalogue and interaction features.",
                  },
                  {
                    timeKey: "launch.program.item4.time",
                    timeFallback: "18:40",
                    titleKey: "launch.program.item4.title",
                    titleFallback: "Tools for artists, galleries and institutions",
                    descriptionKey: "launch.program.item4.description",
                    descriptionFallback:
                      "Free registration, first gallery, public/private exhibitions, website embedding and launch offers.",
                  },
                  {
                    timeKey: "launch.program.item5.time",
                    timeFallback: "18:50",
                    titleKey: "launch.program.item5.title",
                    titleFallback: "Questions and next steps",
                    descriptionKey: "launch.program.item5.description",
                    descriptionFallback:
                      "A final Q&A and practical instructions for opening an account and creating the first space.",
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
                  <T textKey="launch.finalCta.label" fallback="One link for the campaign" />
                </p>
                <h2 className="mt-3 font-serif text-3xl text-neutral-50">
                  <T
                    textKey="launch.finalCta.title"
                    fallback="Save this page and come back on launch day"
                  />
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                  <T
                    textKey="launch.finalCta.description"
                    fallback="This is the central page for the official mostra.space launch: calendar links, trailer, programme and access to the live presentation will all stay here."
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
                      textKey="launch.finalCta.join"
                      fallback="Join the presentation"
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
                    textKey="launch.finalCta.calendar"
                    fallback="Add to calendar"
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
