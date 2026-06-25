export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalPage = {
  slug: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
};

export const LEGAL_OWNER = {
  name: "Barattolo XR Lab",
  vatNumber: "14040331002",
  supportEmail: "support@mostra.space",
  billingEmail: "billing@mostra.space",
  website: "https://mostra.space",
};

export const legalPages: LegalPage[] = [
  {
    slug: "termini",
    title: "Termini e condizioni",
    description:
      "Condizioni generali di utilizzo della piattaforma Mostra.space.",
    updatedAt: "24 giugno 2026",
    sections: [
      {
        title: "1. Titolare della piattaforma",
        paragraphs: [
          `Mostra.space è una piattaforma digitale gestita da ${LEGAL_OWNER.name}, P. IVA ${LEGAL_OWNER.vatNumber}.`,
          `Per richieste generali è possibile scrivere a ${LEGAL_OWNER.supportEmail}. Per richieste relative a pagamenti, abbonamenti o fatturazione è possibile scrivere a ${LEGAL_OWNER.billingEmail}.`,
        ],
      },
      {
        title: "2. Oggetto del servizio",
        paragraphs: [
          "Mostra.space consente ad artisti, galleristi, curatori, istituzioni e utenti interessati all’arte di creare, gestire, visitare e condividere spazi espositivi digitali, gallerie virtuali, opere, schede opera e contenuti collegati.",
          "La piattaforma può includere funzioni gratuite e funzioni a pagamento, secondo i limiti e le caratteristiche indicate nella pagina Pricing.",
        ],
      },
      {
        title: "3. Account utente",
        paragraphs: [
          "Per utilizzare alcune funzioni della piattaforma è necessario creare un account. L’utente si impegna a fornire informazioni corrette, aggiornate e non fuorvianti.",
          "L’utente è responsabile della custodia delle proprie credenziali di accesso e delle attività svolte attraverso il proprio account.",
        ],
      },
      {
        title: "4. Piani gratuiti e piani a pagamento",
        paragraphs: [
          "Mostra.space può offrire un piano gratuito e piani a pagamento, tra cui, a titolo esemplificativo, Pro, Business e Institution.",
          "Ogni piano può prevedere limiti su numero di gallerie, opere caricabili, spazio di archiviazione, peso massimo dei file, richieste ricevibili, template disponibili e altre funzionalità.",
          "I limiti dei piani possono essere aggiornati nel tempo. Le modifiche non avranno effetto retroattivo sui periodi già pagati, salvo necessità tecniche, normative o di sicurezza.",
        ],
      },
      {
        title: "5. Contenuti caricati dagli utenti",
        paragraphs: [
          "L’utente conserva la titolarità dei contenuti che carica sulla piattaforma, inclusi testi, immagini, schede opere, dati descrittivi e materiali espositivi.",
          "Caricando contenuti su Mostra.space, l’utente concede alla piattaforma una licenza non esclusiva, limitata e funzionale alla pubblicazione, visualizzazione, elaborazione tecnica, archiviazione e distribuzione dei contenuti all’interno del servizio.",
          "L’utente garantisce di disporre dei diritti necessari sui contenuti caricati e si impegna a non caricare materiali illeciti, diffamatori, lesivi di diritti di terzi o contrari alla normativa vigente.",
        ],
      },
      {
        title: "6. Pubblicazione delle gallerie",
        paragraphs: [
          "L’utente può creare gallerie in stato di bozza, pubblicate o archiviate, secondo le funzioni disponibili.",
          "La pubblicazione di una galleria rende visibili i relativi contenuti agli utenti della piattaforma o al pubblico, secondo le impostazioni disponibili.",
        ],
      },
      {
        title: "7. Pagamenti e rinnovo automatico",
        paragraphs: [
          "I pagamenti degli abbonamenti sono gestiti tramite provider esterni, tra cui Stripe. I dati di pagamento non vengono memorizzati direttamente da Mostra.space.",
          "Gli abbonamenti a pagamento si rinnovano automaticamente alla scadenza del periodo di fatturazione, salvo cancellazione da parte dell’utente prima del rinnovo.",
        ],
      },
      {
        title: "8. Cancellazione dell’abbonamento",
        paragraphs: [
          "L’utente può cancellare il proprio abbonamento attraverso l’area di gestione abbonamento o contattando il supporto.",
          "In caso di cancellazione, il piano resta attivo fino alla fine del periodo già pagato. Al termine del periodo, l’account potrà essere riportato al piano gratuito o al piano disponibile secondo le condizioni vigenti.",
        ],
      },
      {
        title: "9. Sospensione o limitazione del servizio",
        paragraphs: [
          "Mostra.space può sospendere o limitare l’accesso a un account in caso di uso illecito, violazione dei presenti termini, abuso tecnico, tentativi di aggirare i limiti di piano, caricamento di contenuti non consentiti o necessità di sicurezza.",
        ],
      },
      {
        title: "10. Disponibilità del servizio",
        paragraphs: [
          "La piattaforma viene fornita secondo criteri di ragionevole continuità, ma non è garantita l’assenza di interruzioni, errori, manutenzioni, rallentamenti o indisponibilità temporanee.",
          "Mostra.space potrà modificare, aggiornare o rimuovere funzionalità per ragioni tecniche, organizzative, commerciali o normative.",
        ],
      },
      {
        title: "11. Limitazione di responsabilità",
        paragraphs: [
          "Nei limiti consentiti dalla legge, Mostra.space non risponde di danni indiretti, perdita di opportunità commerciali, perdita di dati causata da eventi esterni o utilizzi impropri della piattaforma da parte dell’utente.",
          "Resta ferma ogni responsabilità prevista da norme inderogabili di legge.",
        ],
      },
      {
        title: "12. Modifiche ai termini",
        paragraphs: [
          "I presenti termini possono essere aggiornati. In caso di modifiche rilevanti, la piattaforma potrà darne comunicazione attraverso il sito, email o dashboard.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    description:
      "Informativa sul trattamento dei dati personali degli utenti di Mostra.space.",
    updatedAt: "24 giugno 2026",
    sections: [
      {
        title: "1. Titolare del trattamento",
        paragraphs: [
          `Il titolare del trattamento è ${LEGAL_OWNER.name}, P. IVA ${LEGAL_OWNER.vatNumber}.`,
          `Per richieste relative alla privacy è possibile scrivere a ${LEGAL_OWNER.supportEmail}.`,
        ],
      },
      {
        title: "2. Dati personali trattati",
        paragraphs: [
          "La piattaforma può trattare dati identificativi e di contatto, dati di account, email, nome visualizzato, ruolo, piano attivo, preferenze, contenuti caricati, informazioni sulle gallerie, opere, richieste inviate o ricevute e dati tecnici relativi all’uso del servizio.",
          "I dati di pagamento sono gestiti da Stripe o da altri provider di pagamento esterni. Mostra.space non conserva direttamente i dati completi delle carte di pagamento.",
        ],
      },
      {
        title: "3. Finalità del trattamento",
        bullets: [
          "creazione e gestione dell’account;",
          "accesso alla dashboard e alle funzioni della piattaforma;",
          "creazione, gestione e pubblicazione di gallerie virtuali;",
          "caricamento e gestione di opere e contenuti espositivi;",
          "gestione di abbonamenti, pagamenti, fatturazione e limiti di piano;",
          "invio di email tecniche, transazionali e di recupero password;",
          "sicurezza, prevenzione abusi e funzionamento tecnico del servizio;",
          "assistenza utenti e comunicazioni amministrative.",
        ],
      },
      {
        title: "4. Base giuridica",
        paragraphs: [
          "Il trattamento dei dati può basarsi sull’esecuzione di un contratto o di misure precontrattuali, sull’adempimento di obblighi di legge, sul legittimo interesse del titolare alla sicurezza e al corretto funzionamento del servizio, e sul consenso quando richiesto.",
          "Le informazioni da fornire all’interessato quando i dati sono raccolti presso lo stesso interessato sono disciplinate dall’art. 13 del GDPR, che richiede, tra l’altro, identità del titolare, finalità, base giuridica, destinatari e diritti dell’interessato. ",
        ],
      },
      {
        title: "5. Provider e responsabili esterni",
        paragraphs: [
          "Per il funzionamento della piattaforma possono essere utilizzati fornitori esterni, tra cui servizi di hosting, database, autenticazione, pagamento, email transazionali, storage, sicurezza e infrastruttura tecnica.",
          "Tra i provider utilizzati possono rientrare, a titolo esemplificativo, Vercel, Supabase, Stripe e Resend.",
        ],
      },
      {
        title: "6. Conservazione dei dati",
        paragraphs: [
          "I dati vengono conservati per il tempo necessario a fornire il servizio, gestire obblighi amministrativi, fiscali e contrattuali, garantire sicurezza e risolvere eventuali controversie.",
          "I dati collegati ad account, gallerie e opere possono essere conservati finché l’account resta attivo o finché necessari per finalità tecniche, legali o amministrative.",
        ],
      },
      {
        title: "7. Diritti dell’utente",
        paragraphs: [
          "L’utente può chiedere accesso, rettifica, cancellazione, limitazione, opposizione al trattamento e portabilità dei dati nei casi previsti dalla normativa applicabile.",
          `Le richieste possono essere inviate a ${LEGAL_OWNER.supportEmail}.`,
        ],
      },
      {
        title: "8. Trasferimenti extra UE",
        paragraphs: [
          "Alcuni provider tecnici potrebbero trattare dati anche al di fuori dello Spazio Economico Europeo. In tali casi, il trattamento avviene secondo le garanzie previste dalla normativa applicabile, ove richieste.",
        ],
      },
      {
        title: "9. Sicurezza",
        paragraphs: [
          "La piattaforma adotta misure tecniche e organizzative ragionevoli per proteggere account, dati e contenuti, inclusi sistemi di autenticazione, limitazioni di accesso, controllo dei ruoli e strumenti di sicurezza dei provider utilizzati.",
        ],
      },
      {
        title: "10. Aggiornamenti",
        paragraphs: [
          "La presente informativa può essere aggiornata per riflettere modifiche tecniche, normative o organizzative. La data di aggiornamento è indicata in alto nella pagina.",
        ],
      },
    ],
  },
  {
    slug: "cookie",
    title: "Cookie policy",
    description: "Informativa sui cookie e sugli strumenti tecnici utilizzati.",
    updatedAt: "24 giugno 2026",
    sections: [
      {
        title: "1. Uso dei cookie",
        paragraphs: [
          "Mostra.space utilizza cookie e tecnologie simili necessari al funzionamento tecnico della piattaforma, inclusi autenticazione, sessione, sicurezza, preferenze essenziali e corretta erogazione del servizio.",
          "Al momento, in base alle informazioni disponibili, Mostra.space non utilizza Google Analytics, Meta Pixel o strumenti di tracciamento marketing su mostra.space.",
        ],
      },
      {
        title: "2. Cookie tecnici",
        paragraphs: [
          "I cookie tecnici sono necessari per permettere il login, mantenere la sessione, proteggere l’account, ricordare impostazioni essenziali e consentire il funzionamento delle aree riservate.",
        ],
      },
      {
        title: "3. Cookie analytics e marketing",
        paragraphs: [
          "Attualmente non sono dichiarati cookie analytics o marketing su mostra.space.",
          "Se in futuro verranno introdotti strumenti di analytics, pixel pubblicitari o tecnologie di profilazione, questa policy sarà aggiornata e, ove necessario, sarà implementato un meccanismo di consenso.",
        ],
      },
      {
        title: "4. Gestione dal browser",
        paragraphs: [
          "L’utente può gestire, limitare o cancellare i cookie dalle impostazioni del proprio browser. La disattivazione dei cookie tecnici può impedire il corretto funzionamento della piattaforma, inclusi login e dashboard.",
        ],
      },
    ],
  },
  {
    slug: "pagamenti",
    title: "Pagamenti e abbonamenti",
    description:
      "Informazioni su piani, pagamenti, rinnovo automatico e gestione abbonamento.",
    updatedAt: "24 giugno 2026",
    sections: [
      {
        title: "1. Piani disponibili",
        paragraphs: [
          "Mostra.space può offrire un piano gratuito e piani a pagamento con funzionalità e limiti differenti.",
          "Le caratteristiche aggiornate dei piani sono disponibili nella pagina Pricing della piattaforma.",
        ],
      },
      {
        title: "2. Pagamenti",
        paragraphs: [
          "I pagamenti sono gestiti tramite Stripe. Mostra.space non conserva direttamente i dati completi delle carte di pagamento.",
          "L’attivazione del piano a pagamento avviene dopo conferma del pagamento e aggiornamento dello stato dell’abbonamento.",
        ],
      },
      {
        title: "3. Rinnovo automatico",
        paragraphs: [
          "Gli abbonamenti si rinnovano automaticamente alla fine di ogni periodo di fatturazione, salvo cancellazione prima del rinnovo.",
          "La data di rinnovo o fine periodo può essere visibile nella dashboard dell’utente.",
        ],
      },
      {
        title: "4. Pagamenti non riusciti",
        paragraphs: [
          "In caso di pagamento non riuscito, il provider di pagamento può effettuare ulteriori tentativi o richiedere l’aggiornamento del metodo di pagamento.",
          "Mostra.space può limitare, sospendere o riportare al piano gratuito l’account in caso di mancato pagamento o stato di abbonamento non regolare.",
        ],
      },
      {
        title: "5. Gestione abbonamento",
        paragraphs: [
          "L’utente può gestire l’abbonamento, metodo di pagamento e cancellazione attraverso il portale abbonamento disponibile dalla dashboard, quando attivo.",
        ],
      },
    ],
  },
  {
    slug: "cancellazioni-rimborsi",
    title: "Cancellazioni e rimborsi",
    description:
      "Regole operative per cancellare un abbonamento e richiedere eventuali rimborsi.",
    updatedAt: "24 giugno 2026",
    sections: [
      {
        title: "1. Cancellazione dell’abbonamento",
        paragraphs: [
          "L’utente può cancellare l’abbonamento attraverso il portale di gestione abbonamento o contattando il supporto.",
          "In caso di cancellazione, il piano resta attivo fino alla fine del periodo già pagato.",
        ],
      },
      {
        title: "2. Effetti della cancellazione",
        paragraphs: [
          "Alla fine del periodo già pagato, l’account potrà essere riportato al piano gratuito o al piano disponibile secondo le condizioni vigenti.",
          "Il passaggio a un piano inferiore può comportare limiti su numero di gallerie, opere, spazio di archiviazione, richieste ricevibili e template disponibili.",
        ],
      },
      {
        title: "3. Rimborsi",
        paragraphs: [
          "Non sono previsti rimborsi per periodi di abbonamento già iniziati, salvo obblighi di legge o valutazione caso per caso da parte di Barattolo XR Lab.",
          `Per richieste specifiche è possibile scrivere a ${LEGAL_OWNER.billingEmail}.`,
        ],
      },
      {
        title: "4. Errori di pagamento o addebiti anomali",
        paragraphs: [
          "In caso di addebiti duplicati, errori tecnici o anomalie di pagamento, l’utente può contattare il supporto billing indicando email account, piano, data dell’addebito e descrizione del problema.",
        ],
      },
    ],
  },
  {
    slug: "fatturazione",
    title: "Fatturazione",
    description:
      "Informazioni su dati fiscali, richieste di fattura e contatti amministrativi.",
    updatedAt: "24 giugno 2026",
    sections: [
      {
        title: "1. Dati del titolare",
        paragraphs: [
          `${LEGAL_OWNER.name}`,
          `P. IVA ${LEGAL_OWNER.vatNumber}`,
          `Sito web: ${LEGAL_OWNER.website}`,
        ],
      },
      {
        title: "2. Richieste amministrative",
        paragraphs: [
          `Per richieste relative a fatture, pagamenti, abbonamenti o dati fiscali è possibile scrivere a ${LEGAL_OWNER.billingEmail}.`,
        ],
      },
      {
        title: "3. Dati necessari",
        paragraphs: [
          "Per emettere o correggere documenti fiscali possono essere richiesti dati come nome o ragione sociale, indirizzo, partita IVA, codice fiscale, codice destinatario, PEC e altri dati necessari secondo normativa applicabile.",
        ],
      },
      {
        title: "4. Provider di pagamento",
        paragraphs: [
          "I pagamenti online sono gestiti tramite provider esterni, tra cui Stripe. Alcune ricevute o informazioni di pagamento possono essere inviate direttamente dal provider di pagamento.",
        ],
      },
    ],
  },
];

export function getLegalPage(slug: string) {
  return legalPages.find((page) => page.slug === slug) || null;
}