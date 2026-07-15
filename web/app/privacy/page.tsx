import T from "@/components/i18n/T";

export default function PrivacyPage() {
  const lastUpdate = "4 giugno 2026";

  return (
    <main className="min-h-screen bg-neutral-950 px-5 py-8 text-neutral-50 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <header className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.35em] text-neutral-500">
              <T
                textKey="legal.privacy.header.label"
                fallback="Privacy policy"
              />
            </p>

            <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
              <T
                textKey="legal.privacy.header.title"
                fallback="Informativa sul trattamento dei dati personali."
              />
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.header.description"
                fallback="Questa informativa descrive come vengono trattati i dati personali inviati tramite i form di richiesta informazioni presenti nelle gallerie virtuali del portale."
              />
            </p>

            <p className="mt-3 text-sm text-neutral-500">
              <T
                textKey="legal.privacy.header.lastUpdate"
                fallback="Ultimo aggiornamento:"
              />{" "}
              {lastUpdate}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              <T
                textKey="legal.privacy.actions.dashboard"
                fallback="Dashboard"
              />
            </a>

            <a
              href="/gallerie"
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              <T
                textKey="legal.privacy.actions.publicGalleries"
                fallback="Gallerie pubbliche"
              />
            </a>
          </div>
        </header>

        <div className="mt-10 space-y-6">
          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-2xl font-medium">
              <T
                textKey="legal.privacy.controller.title"
                fallback="1. Titolare del trattamento"
              />
            </h2>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.controller.description"
                fallback="Il titolare del trattamento è il soggetto proprietario o gestore della galleria virtuale a cui viene inviata la richiesta."
              />
            </p>

            <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-sm leading-7 text-neutral-400">
              <p>
                <T
                  textKey="legal.privacy.controller.barattoloContact"
                  fallback="Per le gallerie gestite direttamente da Galleria Barattolo / Barattolo XR Lab, il referente operativo può essere contattato all’indirizzo:"
                />
              </p>

              <p className="mt-2 text-neutral-100">
                info@galleriabarattolo.it
              </p>
            </div>

            <p className="mt-4 text-xs leading-6 text-neutral-500">
              <T
                textKey="legal.privacy.controller.thirdPartyNote"
                fallback="Nota: se il portale viene utilizzato da galleristi terzi, ciascun gallerista può agire come autonomo titolare per le richieste ricevute tramite la propria galleria."
              />
            </p>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-2xl font-medium">
              <T
                textKey="legal.privacy.data.title"
                fallback="2. Dati trattati"
              />
            </h2>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.data.intro"
                fallback="Tramite i form pubblici possono essere raccolti:"
              />
            </p>

            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-neutral-400">
              <li>
                <T
                  textKey="legal.privacy.data.fullName"
                  fallback="nome e cognome;"
                />
              </li>
              <li>
                <T
                  textKey="legal.privacy.data.email"
                  fallback="indirizzo email;"
                />
              </li>
              <li>
                <T
                  textKey="legal.privacy.data.message"
                  fallback="messaggio inviato dall’utente;"
                />
              </li>
              <li>
                <T
                  textKey="legal.privacy.data.galleryOrArtwork"
                  fallback="galleria o opera per cui viene richiesta informazione;"
                />
              </li>
              <li>
                <T
                  textKey="legal.privacy.data.dateTime"
                  fallback="data e ora della richiesta;"
                />
              </li>
              <li>
                <T
                  textKey="legal.privacy.data.userAgent"
                  fallback="user agent tecnico del browser;"
                />
              </li>
              <li>
                <T
                  textKey="legal.privacy.data.privacyVersion"
                  fallback="versione dell’informativa privacy accettata."
                />
              </li>
            </ul>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-2xl font-medium">
              <T
                textKey="legal.privacy.purposes.title"
                fallback="3. Finalità del trattamento"
              />
            </h2>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.purposes.intro"
                fallback="I dati vengono trattati per:"
              />
            </p>

            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-neutral-400">
              <li>
                <T
                  textKey="legal.privacy.purposes.manageRequests"
                  fallback="ricevere e gestire richieste di informazioni;"
                />
              </li>
              <li>
                <T
                  textKey="legal.privacy.purposes.contactUser"
                  fallback="ricontattare l’utente in merito alla galleria o all’opera indicata;"
                />
              </li>
              <li>
                <T
                  textKey="legal.privacy.purposes.commercialNegotiations"
                  fallback="gestire eventuali trattative commerciali o richieste precontrattuali;"
                />
              </li>
              <li>
                <T
                  textKey="legal.privacy.purposes.preventAbuse"
                  fallback="prevenire abusi, spam o utilizzi impropri del form;"
                />
              </li>
              <li>
                <T
                  textKey="legal.privacy.purposes.documentConsent"
                  fallback="documentare il consenso e l’accettazione dell’informativa."
                />
              </li>
            </ul>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-2xl font-medium">
              <T
                textKey="legal.privacy.legalBasis.title"
                fallback="4. Base giuridica"
              />
            </h2>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.legalBasis.description"
                fallback="Il trattamento dei dati inviati tramite il form è necessario per dare seguito alla richiesta dell’utente, anche in fase precontrattuale, e per il legittimo interesse del titolare a gestire correttamente i contatti ricevuti e prevenire abusi."
              />
            </p>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.legalBasis.marketingConsent"
                fallback="L’eventuale invio di comunicazioni promozionali o newsletter, se attivato in futuro, richiederà un consenso separato e facoltativo."
              />
            </p>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-2xl font-medium">
              <T
                textKey="legal.privacy.processing.title"
                fallback="5. Modalità del trattamento"
              />
            </h2>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.processing.description"
                fallback="I dati sono trattati con strumenti informatici e organizzati all’interno del portale per consentire al gallerista di leggere, gestire, archiviare, esportare o cancellare le richieste ricevute."
              />
            </p>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.processing.externalServices"
                fallback="Il portale utilizza servizi tecnici esterni per hosting, database, storage ed eventuale invio email transazionale."
              />
            </p>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-2xl font-medium">
              <T
                textKey="legal.privacy.recipients.title"
                fallback="6. Destinatari e fornitori tecnici"
              />
            </h2>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.recipients.description"
                fallback="I dati possono essere trattati da fornitori tecnici necessari al funzionamento del servizio, come piattaforme di hosting, database, storage, autenticazione ed email transazionali."
              />
            </p>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.recipients.noSale"
                fallback="I dati non vengono venduti a terzi. Non vengono usati per marketing senza un consenso separato."
              />
            </p>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-2xl font-medium">
              <T
                textKey="legal.privacy.retention.title"
                fallback="7. Conservazione dei dati"
              />
            </h2>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.retention.description"
                fallback="Le richieste vengono conservate per il tempo necessario a gestire il contatto, la trattativa o l’eventuale rapporto commerciale. In assenza di ulteriori rapporti, le richieste potranno essere cancellate o anonimizzate dopo un periodo ragionevole."
              />
            </p>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.retention.mvpDeletion"
                fallback="In questa fase MVP, la cancellazione può essere effettuata dal gallerista tramite la dashboard richieste."
              />
            </p>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-2xl font-medium">
              <T
                textKey="legal.privacy.rights.title"
                fallback="8. Diritti dell’interessato"
              />
            </h2>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.rights.description"
                fallback="L’utente può richiedere l’accesso ai propri dati, la rettifica, la cancellazione, la limitazione del trattamento, l’opposizione al trattamento e, nei casi previsti, la portabilità dei dati."
              />
            </p>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.rights.complaint"
                fallback="L’utente può inoltre proporre reclamo all’autorità di controllo competente."
              />
            </p>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-2xl font-medium">
              <T
                textKey="legal.privacy.transfers.title"
                fallback="9. Trasferimenti extra SEE"
              />
            </h2>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.transfers.description"
                fallback="Alcuni fornitori tecnici potrebbero trattare dati anche al di fuori dello Spazio Economico Europeo. In tal caso, il trattamento dovrà avvenire sulla base di garanzie adeguate previste dalla normativa applicabile."
              />
            </p>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-2xl font-medium">
              <T
                textKey="legal.privacy.contacts.title"
                fallback="10. Contatti"
              />
            </h2>

            <p className="mt-4 text-sm leading-7 text-neutral-400">
              <T
                textKey="legal.privacy.contacts.description"
                fallback="Per richieste relative al trattamento dei dati personali puoi scrivere a:"
              />
            </p>

            <a
              href="mailto:info@galleriabarattolo.it"
              className="mt-4 inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
            >
              info@galleriabarattolo.it
            </a>
          </section>

          <section className="rounded-3xl border border-yellow-900 bg-yellow-950/20 p-6">
            <h2 className="text-2xl font-medium text-yellow-100">
              <T
                textKey="legal.privacy.importantNote.title"
                fallback="Nota importante"
              />
            </h2>

            <p className="mt-4 text-sm leading-7 text-yellow-100/80">
              <T
                textKey="legal.privacy.importantNote.description"
                fallback="Questa pagina è una bozza operativa per MVP. Prima della pubblicazione ufficiale del servizio, il testo deve essere verificato e adattato al soggetto giuridico effettivo, ai fornitori realmente utilizzati, ai tempi di conservazione definitivi e alle eventuali integrazioni marketing, analytics o pagamento."
              />
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}