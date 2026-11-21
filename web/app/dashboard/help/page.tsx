import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import T from "@/components/i18n/T";
import LegalFooter from "@/components/legal/LegalFooter";
import MuseumHeader from "@/components/site/MuseumHeader";
import { createClient } from "@/lib/supabase/server";

type TutorialStatus = "available" | "coming_soon";
type TutorialLevel = "base" | "intermedio" | "avanzato";

type TutorialItem = {
  id: string;
  titleKey: string;
  titleFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
  categoryKey: string;
  categoryFallback: string;
  durationFallback: string;
  level: TutorialLevel;
  href: string;
  videoUrl?: string | null;
  status: TutorialStatus;
};

type FaqItem = {
  id: string;
  questionKey: string;
  questionFallback: string;
  answerKey: string;
  answerFallback: string;
};

type ProblemItem = {
  id: string;
  titleKey: string;
  titleFallback: string;
  causeKey: string;
  causeFallback: string;
  solutionKey: string;
  solutionFallback: string;
  href: string;
};

const tutorials: TutorialItem[] = [
  {
    id: "first-gallery",
    titleKey: "dashboard.help.tutorials.firstGallery.title",
    titleFallback: "Come creare la tua prima galleria",
    descriptionKey: "dashboard.help.tutorials.firstGallery.description",
    descriptionFallback:
      "Dalla dashboard alla creazione dello spazio: scegli template, titolo, descrizione e prepara la galleria per l’allestimento.",
    categoryKey: "dashboard.help.categories.firstSteps",
    categoryFallback: "Primi passi",
    durationFallback: "3:20",
    level: "base",
    href: "/dashboard/gallerie",
    videoUrl: "https://www.youtube.com/embed/42qCNP6JPBY",
    status: "coming_soon",
  },
  {
    id: "upload-artworks",
    titleKey: "dashboard.help.tutorials.uploadArtworks.title",
    titleFallback: "Come caricare le opere",
    descriptionKey: "dashboard.help.tutorials.uploadArtworks.description",
    descriptionFallback:
      "Carica immagini, titolo, artista, tecnica, dimensioni, prezzo e privacy dell’opera nel tuo archivio personale.",
    categoryKey: "dashboard.help.categories.artworks",
    categoryFallback: "Opere e archivio",
    durationFallback: "2:40",
    level: "base",
    href: "/dashboard/opere",
    videoUrl: "https://www.youtube.com/embed/42qCNP6JPBY",
    status: "coming_soon",
  },
  {
    id: "editor-3d",
    titleKey: "dashboard.help.tutorials.editor3d.title",
    titleFallback: "Come usare l’editor 3D",
    descriptionKey: "dashboard.help.tutorials.editor3d.description",
    descriptionFallback:
      "Apri l’editor, posiziona le opere sulle pareti, controlla dimensioni, cornici e salvataggio dell’allestimento.",
    categoryKey: "dashboard.help.categories.editor",
    categoryFallback: "Editor 3D",
    durationFallback: "5:10",
    level: "intermedio",
    href: "/dashboard/gallerie",
    videoUrl: "https://www.youtube.com/embed/42qCNP6JPBY",
    status: "coming_soon",
  },
  {
    id: "publish-share",
    titleKey: "dashboard.help.tutorials.publishShare.title",
    titleFallback: "Pubblicare e condividere una galleria",
    descriptionKey: "dashboard.help.tutorials.publishShare.description",
    descriptionFallback:
      "Controlla gli step obbligatori, pubblica la galleria e condividi il link pubblico con visitatori, collezionisti o stampa.",
    categoryKey: "dashboard.help.categories.publishing",
    categoryFallback: "Pubblicazione",
    durationFallback: "3:00",
    level: "base",
    href: "/dashboard/gallerie",
    videoUrl: "https://www.youtube.com/embed/42qCNP6JPBY",
    status: "coming_soon",
  },
  {
    id: "catalog-pdf",
    titleKey: "dashboard.help.tutorials.catalogPdf.title",
    titleFallback: "Creare un catalogo PDF",
    descriptionKey: "dashboard.help.tutorials.catalogPdf.description",
    descriptionFallback:
      "Genera un catalogo professionale dalla galleria, scegli layout, dati opera, QR code e impostazioni di esportazione.",
    categoryKey: "dashboard.help.categories.catalog",
    categoryFallback: "Catalogo PDF",
    durationFallback: "4:15",
    level: "intermedio",
    href: "/dashboard/gallerie",
    videoUrl: null,
    status: "coming_soon",
  },
  {
    id: "audio-live",
    titleKey: "dashboard.help.tutorials.audioLive.title",
    titleFallback: "Audio guida, soundtrack e live visit",
    descriptionKey: "dashboard.help.tutorials.audioLive.description",
    descriptionFallback:
      "Scegli una soundtrack, carica un audio guida della galleria e prepara una visita guidata live quando il piano lo consente.",
    categoryKey: "dashboard.help.categories.audioLive",
    categoryFallback: "Audio e visite guidate",
    durationFallback: "5:30",
    level: "avanzato",
    href: "/dashboard/gallerie",
    videoUrl: null,
    status: "coming_soon",
  },
];

const faqs: Array<{
  id: string;
  titleKey: string;
  titleFallback: string;
  items: FaqItem[];
}> = [
  {
    id: "plans",
    titleKey: "dashboard.help.faq.sections.plans",
    titleFallback: "Account e piani",
    items: [
      {
        id: "free-expiration",
        questionKey: "dashboard.help.faq.freeExpiration.question",
        questionFallback: "Il piano Free ha una scadenza?",
        answerKey: "dashboard.help.faq.freeExpiration.answer",
        answerFallback:
          "No. Il piano Free può restare attivo senza scadenza. Puoi usarlo per testare mostra.space e pubblicare una prima galleria nei limiti previsti dal piano.",
      },
      {
        id: "upgrade-needed",
        questionKey: "dashboard.help.faq.upgradeNeeded.question",
        questionFallback: "Quando devo passare a un piano superiore?",
        answerKey: "dashboard.help.faq.upgradeNeeded.answer",
        answerFallback:
          "Serve un upgrade quando hai bisogno di più gallerie, più opere, più spazio, funzioni avanzate, cataloghi più strutturati, audio guida o strumenti live disponibili solo da determinati piani.",
      },
    ],
  },
  {
    id: "galleries",
    titleKey: "dashboard.help.faq.sections.galleries",
    titleFallback: "Gallerie e pubblicazione",
    items: [
      {
        id: "publish-gallery",
        questionKey: "dashboard.help.faq.publishGallery.question",
        questionFallback: "Cosa serve per pubblicare una galleria?",
        answerKey: "dashboard.help.faq.publishGallery.answer",
        answerFallback:
          "Devi avere titolo, dati principali, cover, almeno un’opera associata e almeno un’opera posizionata nell’editor 3D. La pagina dettaglio galleria mostra gli step mancanti prima della pubblicazione.",
      },
      {
        id: "artworks-not-visible",
        questionKey: "dashboard.help.faq.artworksNotVisible.question",
        questionFallback: "Perché un’opera non appare nel viewer 3D?",
        answerKey: "dashboard.help.faq.artworksNotVisible.answer",
        answerFallback:
          "Di solito l’opera è associata alla galleria ma non è stata posizionata nell’editor, oppure non è pubblica. Controlla lo stato dell’opera e l’allestimento 3D dalla pagina della galleria.",
      },
      {
        id: "change-template",
        questionKey: "dashboard.help.faq.changeTemplate.question",
        questionFallback: "Posso cambiare template dopo aver creato la galleria?",
        answerKey: "dashboard.help.faq.changeTemplate.answer",
        answerFallback:
          "Sì, puoi cambiare template dalla gestione della galleria. Prima di farlo controlla limiti, opere già inserite e allestimento, perché un cambio template può richiedere una nuova verifica dello spazio.",
      },
    ],
  },
  {
    id: "audio",
    titleKey: "dashboard.help.faq.sections.audio",
    titleFallback: "Audio e visite guidate",
    items: [
      {
        id: "soundtrack-vs-guide",
        questionKey: "dashboard.help.faq.soundtrackVsGuide.question",
        questionFallback: "Che differenza c’è tra soundtrack e audio guida?",
        answerKey: "dashboard.help.faq.soundtrackVsGuide.answer",
        answerFallback:
          "La soundtrack è una musica ambientale scelta tra le tracce disponibili. L’audio guida è una traccia caricata dal proprietario della galleria, pensata come introduzione curatoriale, commento o guida alla visita.",
      },
      {
        id: "audio-limits",
        questionKey: "dashboard.help.faq.audioLimits.question",
        questionFallback: "Quali sono i limiti dell’audio guida?",
        answerKey: "dashboard.help.faq.audioLimits.answer",
        answerFallback:
          "L’audio guida è disponibile dai piani Business in su. Business consente fino a 10 minuti; Diamond, Institution e Admin arrivano fino a 20 minuti, nel limite massimo di peso previsto dal sistema.",
      },
      {
        id: "live-visits",
        questionKey: "dashboard.help.faq.liveVisits.question",
        questionFallback: "A cosa servono le Live guided visits?",
        answerKey: "dashboard.help.faq.liveVisits.answer",
        answerFallback:
          "Le Live guided visits permettono di accompagnare i visitatori dentro una galleria con una stanza audio live, ruoli vocali, moderazione e accesso collegato agli eventi quando la funzione è disponibile per il piano.",
      },
    ],
  },
  {
    id: "technical",
    titleKey: "dashboard.help.faq.sections.technical",
    titleFallback: "Problemi tecnici",
    items: [
      {
        id: "webgl-load",
        questionKey: "dashboard.help.faq.webglLoad.question",
        questionFallback: "Il viewer 3D non si carica: cosa faccio?",
        answerKey: "dashboard.help.faq.webglLoad.answer",
        answerFallback:
          "Ricarica la pagina, usa Chrome o Edge aggiornati, controlla che WebGL sia attivo e prova da desktop. Se il problema resta, consulta il catalogo sotto il viewer o contatta il supporto.",
      },
      {
        id: "pdf-catalog",
        questionKey: "dashboard.help.faq.pdfCatalog.question",
        questionFallback: "Il catalogo PDF non si genera: cosa controllo?",
        answerKey: "dashboard.help.faq.pdfCatalog.answer",
        answerFallback:
          "Controlla che la galleria abbia opere valide, immagini accessibili e dati sufficienti. Se una generazione resta bloccata, ricarica la pagina e riprova dalla sezione catalogo della galleria.",
      },
    ],
  },
];

const commonProblems: ProblemItem[] = [
  {
    id: "no-artworks-viewer",
    titleKey: "dashboard.help.problems.noArtworks.title",
    titleFallback: "Non vedo le opere nel viewer 3D",
    causeKey: "dashboard.help.problems.noArtworks.cause",
    causeFallback: "Causa probabile: le opere sono state caricate nell’archivio ma non associate o non posizionate nella galleria.",
    solutionKey: "dashboard.help.problems.noArtworks.solution",
    solutionFallback: "Soluzione: apri la galleria, associa le opere e poi entra nell’editor 3D per posizionarle sulle pareti.",
    href: "/dashboard/gallerie",
  },
  {
    id: "publish-blocked",
    titleKey: "dashboard.help.problems.publishBlocked.title",
    titleFallback: "La galleria non si pubblica",
    causeKey: "dashboard.help.problems.publishBlocked.cause",
    causeFallback: "Causa probabile: manca uno step obbligatorio come cover, opere associate o opere posizionate.",
    solutionKey: "dashboard.help.problems.publishBlocked.solution",
    solutionFallback: "Soluzione: controlla il blocco onboarding nella pagina della galleria e completa gli step indicati come mancanti.",
    href: "/dashboard/gallerie",
  },
  {
    id: "audio-rejected",
    titleKey: "dashboard.help.problems.audioRejected.title",
    titleFallback: "Il file audio non viene accettato",
    causeKey: "dashboard.help.problems.audioRejected.cause",
    causeFallback: "Causa probabile: formato non supportato, file troppo pesante, durata superiore al limite o piano non abilitato.",
    solutionKey: "dashboard.help.problems.audioRejected.solution",
    solutionFallback: "Soluzione: usa MP3, WAV, OGG, M4A o AAC, controlla peso e durata e verifica di avere almeno un piano Business.",
    href: "/dashboard/gallerie",
  },
  {
    id: "template-locked",
    titleKey: "dashboard.help.problems.templateLocked.title",
    titleFallback: "Non trovo o non posso usare un template",
    causeKey: "dashboard.help.problems.templateLocked.cause",
    causeFallback: "Causa probabile: il template richiede un piano superiore oppure è un template marketplace non acquistato.",
    solutionKey: "dashboard.help.problems.templateLocked.solution",
    solutionFallback: "Soluzione: controlla i piani, visita il marketplace o scegli un template disponibile per il tuo account.",
    href: "/marketplace",
  },
];

function getLevelLabel(level: TutorialLevel) {
  if (level === "avanzato") {
    return <T textKey="dashboard.help.level.advanced" fallback="Avanzato" />;
  }

  if (level === "intermedio") {
    return <T textKey="dashboard.help.level.intermediate" fallback="Intermedio" />;
  }

  return <T textKey="dashboard.help.level.basic" fallback="Base" />;
}

function TutorialCard({ tutorial, canUseFeature }: { tutorial: TutorialItem; canUseFeature: boolean }) {
  const videoUrl = tutorial.status === "available" ? tutorial.videoUrl : null;
  return (
    <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5">
      {videoUrl && (
        <iframe
          src={videoUrl}
          title={tutorial.titleFallback}
          className="aspect-video w-full rounded-[1.5rem] border border-neutral-800 bg-black"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}

      <div className={`flex flex-wrap items-center gap-2 ${videoUrl ? "mt-5" : ""}`}>
        <span className="rounded-full border border-amber-800 bg-amber-950/25 px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-amber-200">
          <T textKey={tutorial.categoryKey} fallback={tutorial.categoryFallback} />
        </span>

        <span className="rounded-full border border-neutral-800 px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-neutral-400">
          {getLevelLabel(tutorial.level)}
        </span>

        <span className="text-xs text-[var(--museum-stone-muted)]">
          {videoUrl ? tutorial.durationFallback : (
            <T textKey="dashboard.help.video.notAvailable" fallback="Video in arrivo" />
          )}
        </span>
      </div>

      <h3 className="mt-4 text-xl font-semibold text-neutral-100">
        <T textKey={tutorial.titleKey} fallback={tutorial.titleFallback} />
      </h3>

      <p className="mt-3 text-sm leading-6 text-neutral-400">
        <T
          textKey={tutorial.descriptionKey}
          fallback={tutorial.descriptionFallback}
        />
      </p>

      {canUseFeature && (
        <Link
          href={tutorial.href}
          className="museum-button-secondary mt-5 min-h-11 px-5 py-2 text-sm"
        >
          <T textKey="dashboard.help.video.goToFeature" fallback="Vai alla funzione" />
        </Link>
      )}
    </article>
  );
}

export default async function DashboardHelpPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user
    ? (await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()).data
    : null;
  const isCreator = profile?.role === "gallerist" || profile?.role === "admin";
  const quickSteps = [
    {
      number: "01",
      titleKey: "dashboard.help.quickSteps.artworks.title",
      titleFallback: "Carica le opere",
      descriptionKey: "dashboard.help.quickSteps.artworks.description",
      descriptionFallback: "Aggiungi immagini, dati tecnici, descrizioni e impostazioni di visibilità.",
      href: "/dashboard/opere",
    },
    {
      number: "02",
      titleKey: "dashboard.help.quickSteps.gallery.title",
      titleFallback: "Crea una galleria",
      descriptionKey: "dashboard.help.quickSteps.gallery.description",
      descriptionFallback: "Scegli titolo, slug pubblico e template architettonico disponibile per il tuo piano.",
      href: "/dashboard/gallerie",
    },
    {
      number: "03",
      titleKey: "dashboard.help.quickSteps.editor.title",
      titleFallback: "Allestisci in 3D",
      descriptionKey: "dashboard.help.quickSteps.editor.description",
      descriptionFallback: "Posiziona le opere sulle pareti, regola dimensioni e controlla l’esperienza visitatore.",
      href: "/dashboard/gallerie",
    },
    {
      number: "04",
      titleKey: "dashboard.help.quickSteps.publish.title",
      titleFallback: "Pubblica e condividi",
      descriptionKey: "dashboard.help.quickSteps.publish.description",
      descriptionFallback: "Apri la pagina pubblica, condividi il link e raccogli richieste dai visitatori.",
      href: "/gallerie",
    },
  ];

  const title = <T textKey="dashboard.help.header.title" fallback="Guida & FAQ" />;
  const subtitle = (
    <T
      textKey="dashboard.help.header.subtitle"
      fallback="Tutorial, risposte rapide e strumenti per usare al meglio mostra.space."
    />
  );
  const actions = (
    <div className="flex flex-wrap gap-2">
      <a href="#tutorial" className="museum-button-secondary min-h-11 px-4 py-2 text-sm">
        <T textKey="dashboard.help.actions.watchTutorials" fallback="Sfoglia i tutorial" />
      </a>
      <a href="#faq" className="museum-button-primary min-h-11 px-4 py-2 text-sm">
        <T textKey="dashboard.help.actions.readFaq" fallback="Leggi FAQ" />
      </a>
      <a href="mailto:support@mostra.space" className="museum-button-secondary min-h-11 px-4 py-2 text-sm">
        <T textKey="dashboard.help.actions.contactSupport" fallback="Contatta supporto" />
      </a>
    </div>
  );
  const content = (
      <div className="space-y-8">
        <section className="museum-dashboard-card min-w-0 rounded-3xl p-5 sm:p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-amber-500">
            <T textKey="dashboard.help.start.label" fallback="Inizia da qui" />
          </p>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-semibold text-neutral-100">
                <T
                  textKey="dashboard.help.start.title"
                  fallback="Il percorso più semplice per pubblicare la prima galleria."
                />
              </h2>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-400">
                <T
                  textKey="dashboard.help.start.description"
                  fallback="Segui questi passaggi nell’ordine corretto: prima costruisci l’archivio opere, poi crei la galleria, allestisci lo spazio e infine pubblichi il link pubblico."
                />
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {quickSteps.map((step) => {
                const className = "rounded-2xl border border-neutral-800 bg-neutral-950 p-4";
                const stepContent = (
                  <>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--museum-stone-muted)]">
                      {step.number}
                    </p>
                    <h3 className="mt-3 font-medium text-neutral-100">
                      <T textKey={step.titleKey} fallback={step.titleFallback} />
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--museum-stone)]">
                      <T textKey={step.descriptionKey} fallback={step.descriptionFallback} />
                    </p>
                  </>
                );
                return isCreator || step.href === "/gallerie" ? (
                  <Link key={step.number} href={step.href} className={`${className} transition hover:border-neutral-500`}>
                    {stepContent}
                  </Link>
                ) : (
                  <article key={step.number} className={className}>{stepContent}</article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="tutorial" className="museum-dashboard-card min-w-0 scroll-mt-40 rounded-3xl p-5 sm:p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                <T textKey="dashboard.help.tutorials.label" fallback="Video tutorial" />
              </p>

              <h2 className="text-3xl font-semibold text-neutral-100">
                <T
                  textKey="dashboard.help.tutorials.title"
                  fallback="Tutorial operativi per ogni funzione."
                />
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
                <T
                  textKey="dashboard.help.tutorials.description"
                  fallback="Consulta le schede su gallerie, opere, editor 3D, pubblicazione, catalogo e visite live."
                />
              </p>
            </div>

          </div>

          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {tutorials.map((tutorial) => (
              <TutorialCard key={tutorial.id} tutorial={tutorial} canUseFeature={isCreator} />
            ))}
          </div>
        </section>

        <section id="faq" className="museum-dashboard-card min-w-0 scroll-mt-40 rounded-3xl p-5 sm:p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            <T textKey="dashboard.help.faq.label" fallback="Domande frequenti" />
          </p>

          <h2 className="text-3xl font-semibold text-neutral-100">
            <T textKey="dashboard.help.faq.title" fallback="FAQ divise per area." />
          </h2>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {faqs.map((section) => (
              <article
                key={section.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
              >
                <h3 className="text-lg font-semibold text-neutral-100">
                  <T textKey={section.titleKey} fallback={section.titleFallback} />
                </h3>

                <div className="mt-4 space-y-3">
                  {section.items.map((item) => (
                    <details
                      key={item.id}
                      className="rounded-2xl border border-neutral-800 bg-black/25 p-4"
                    >
                      <summary className="cursor-pointer text-sm font-medium text-neutral-100">
                        <T
                          textKey={item.questionKey}
                          fallback={item.questionFallback}
                        />
                      </summary>

                      <p className="mt-3 text-sm leading-6 text-neutral-400">
                        <T textKey={item.answerKey} fallback={item.answerFallback} />
                      </p>
                    </details>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="museum-dashboard-card min-w-0 rounded-3xl p-5 sm:p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            <T textKey="dashboard.help.problems.label" fallback="Problemi comuni" />
          </p>

          <h2 className="text-3xl font-semibold text-neutral-100">
            <T
              textKey="dashboard.help.problems.title"
              fallback="Soluzioni rapide prima di contattare il supporto."
            />
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {commonProblems.map((problem) => (
              <article
                key={problem.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
              >
                <h3 className="text-lg font-semibold text-neutral-100">
                  <T textKey={problem.titleKey} fallback={problem.titleFallback} />
                </h3>

                <p className="mt-3 text-sm leading-6 text-neutral-500">
                  <T textKey={problem.causeKey} fallback={problem.causeFallback} />
                </p>

                <p className="mt-3 text-sm leading-6 text-neutral-300">
                  <T
                    textKey={problem.solutionKey}
                    fallback={problem.solutionFallback}
                  />
                </p>

                {(isCreator || problem.href === "/marketplace") && (
                  <Link href={problem.href} className="museum-button-secondary mt-5 min-h-11 px-5 py-2 text-sm">
                    <T textKey="dashboard.help.problems.goToArea" fallback="Vai alla sezione" />
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-amber-900 bg-amber-950/15 p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-amber-400">
                <T textKey="dashboard.help.support.label" fallback="Supporto" />
              </p>

              <h2 className="text-3xl font-semibold text-neutral-100">
                <T
                  textKey="dashboard.help.support.title"
                  fallback="Non hai trovato la risposta?"
                />
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
                <T
                  textKey="dashboard.help.support.description"
                  fallback="Scrivici indicando account, galleria interessata, problema riscontrato e screenshot se disponibile. Ti aiutiamo a completare configurazione, pubblicazione o allestimento."
                />
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <a
                href="mailto:support@mostra.space"
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                support@mostra.space
              </a>

              {user && <Link
                href="/dashboard"
                className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
              >
                <T textKey="dashboard.help.support.backToDashboard" fallback="Torna alla dashboard" />
              </Link>}
            </div>
          </div>
        </section>
      </div>
  );

  if (!user) {
    return (
      <main className="museum-page min-h-screen">
        <MuseumHeader initialAccountName={null} />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="mb-8 space-y-4">
            <h1 className="museum-title text-5xl text-[var(--museum-ivory)]">{title}</h1>
            <p className="text-[var(--museum-stone)]">{subtitle}</p>
            {actions}
          </header>
          {content}
        </div>
        <LegalFooter />
      </main>
    );
  }

  return (
    <DashboardShell title={title} subtitle={subtitle} activeSection="help" navMode={isCreator ? "creator" : "community"} actions={actions}>
      {content}
    </DashboardShell>
  );
}
