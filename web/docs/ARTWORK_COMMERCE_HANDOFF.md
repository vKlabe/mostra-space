# Vendita opere — stato per riprendere il lavoro

Aggiornato: 2026-10-09. Repository: `vKlabe/mostra-space`.
Branch locale: `feature/artwork-commerce-payments-off`.
Base: `219767d031fbf22c76ed12f9f97a0088b251e143`.

## Vincolo permanente

**Pagamenti OFF fino a nuova autorizzazione esplicita dell'utente.**
Lo sviluppo e la migrazione sono autorizzati; l'attivazione no.
`COMMERCE_ACTIVATION_APPROVED` deve rimanere assente/false. Non impostare il flag
nel database su true per fare prove. Test con ON soltanto nelle fixture isolate.
Non rieseguire gli SQL storici del repository. Non resettare o sovrascrivere main.

## Dove si trova il lavoro

Clone separato, da aprire nella prossima chat:

`C:/Users/USER/.codex/.chatgpt-projects/g-p-695faef9c1f48191b674f7864b7e10b2/mostra-space-work`

Il repository originale `G:/Users/User/ArtPortalImmersivo` è preservato, comprese
le sue copie di backup, patch, stash e branch precedenti. Il suo main locale e
GitHub risultavano identici alla base durante il recupero. Il vecchio commit
`bd47c41` con percorso errato era già riportato nel percorso corretto di main;
non è stato unito nuovamente. Il branch `unity-source-backup` è separato.

La creazione del branch GitHub tramite il connettore ha restituito
**403 “Resource not accessible by integration”**. Il branch è quindi locale;
nessun push, merge o deploy del nuovo codice è stato effettuato. Il salvataggio
locale va pubblicato quando sarà disponibile un accesso GitHub in scrittura.

## Modifiche realizzate

- Otto tabelle `commerce_*`, RPC server, audit ed eventi separati dagli abbonamenti.
- Prenotazione atomica dell'opera unica e indice univoco sulle prenotazioni attive.
- Checkout Stripe Connect con addebito diretto al venditore e chiavi idempotenti.
- Collegamento OAuth del venditore e controllo dello stato del suo account.
- Webhook dedicato, firme verificate, isolamento account/modalità, eventi duplicati
  e fuori ordine, pagamenti asincroni, rimborsi parziali/completi e riconciliazione.
- Admin ON/OFF e ordini; dashboard Vendite; Acquisti personali e ripresa checkout.
- Pulsanti acquisto nei cataloghi pubblici e nei profili; visibili/disabilitati OFF.
- Testi IT/EN/FR/ES. Collegamenti nei menu e nella scheda opera.
- Gestione spedizioni e rimborsi disponibile anche OFF. L'opera rimborsata non
  viene rimessa automaticamente in vendita.
- Checkout/portale abbonamenti e checkout template invariati. Nel vecchio webhook
  è stato aggiunto soltanto l'ignore degli eventi degli account collegati, dopo
  verifica firma e prima della gestione degli abbonamenti.

File principali: `supabase/artwork-commerce.sql`, `lib/commerce/`,
`app/api/commerce/[...path]/route.ts`, `app/api/stripe/connect-webhook/route.ts`,
`components/commerce/CommerceUI.tsx`, `tests/commerce/integration.mjs`.
Configurazione, percorsi, eventi e recupero: [ARTWORK_COMMERCE_SETUP.md](ARTWORK_COMMERCE_SETUP.md).

## Supabase: verificato direttamente e già salvato

Progetto `qhkdhgezkcpekbtovruj`, `barattolo-art-portal`, attivo.

- Confrontati i tipi reali di artworks/profiles, helper gallerie pubblicate,
  privilegi service role e trigger di protezione dei campi privilegiati dei profili.
- Non esistevano tabelle `commerce_*` prima dell'intervento.
- Migrazione **applicata con successo**:
  `20261008220511_add_artwork_commerce_payments_off`, 2026-10-08 22:05 UTC.
- Applicato solo il nuovo SQL tramite connettore; CLI non disponibile, nessun
  replay delle migrazioni precedenti. Il file rifiuta una seconda applicazione.
- Verifica successiva: 8 tabelle con RLS, grant browser revocati, RPC SECURITY
  INVOKER eseguibile da service role e non da anon/authenticated; indice univoco
  parziale presente.
- Ultimo controllo 2026-10-09: `payments_enabled=false`, `revision=0`, **0 ordini,
  0 venditori**. Il flag non è mai stato acceso nel database reale.
- Advisor sulle nuove tabelle: soltanto INFO “RLS Enabled No Policy”, intenzionale
  per tabelle accessibili solo dal server. Altri avvisi riguardano oggetti/funzioni
  preesistenti e protezione password; non sono stati modificati in questo lavoro.

## Stripe: verificato direttamente / ancora incerto

Il connettore è diventato disponibile durante lo sviluppo. Letture effettuate
soltanto nell'account TEST `acct_1TZExpBAthEubFqR`, nome Vincenzo Bordoni:

- Paese IT, valuta EUR, capacità carte attiva, incassi/accrediti abilitati in test.
- Esiste il webhook attivo `https://mostra.space/api/stripe/webhook`, versione
  `2026-04-22.dahlia`, con eventi checkout completed e lifecycle subscription.
- Non ci sono account collegati e non esiste ancora il webhook Connect del modulo.
- Non sono stati creati o modificati endpoint Stripe, account, pagamenti o rimborsi
  reali/test sul servizio. Le transazioni dei test sono simulazioni locali.

**Non verificato:** configurazione LIVE, variabili del deployment Vercel, Client ID
e redirect OAuth Connect, requisiti della piattaforma, nuovo segreto webhook.
La sola configurazione locale originale conteneva una chiave TEST; nessun segreto
è stato copiato nel branch o stampato nei documenti.

## Verifiche

- Suite locale: **17/17 test passati**, anche nella ripetizione finale del
  2026-10-09 dopo integrazione della ripresa checkout. Nessun test saltato.
- Copre SQL reale su PGlite, 20 richieste concorrenti, esclusività opera, retry
  idempotenti, timeout, OFF durante create, pagamento/rimborsi OFF, controllo
  importi/account/modalità, eventi duplicati e fuori ordine, refund prima di
  checkout, firme, CSRF, autenticazione, proprietà ordini, isolamento abbonamenti,
  copie nelle quattro lingue e controlli acquisto visibili/disabilitati.
- Lint finale del nuovo modulo e TypeScript finale passati senza errori.
  Build in fase di verifica finale.
- i18n check e PWA static check passati. Il controllo i18n segnala anche testi
  hardcoded preesistenti e falsi positivi sui nuovi componenti, senza chiavi mancanti.
- Primo build bloccato dal junction node_modules su un altro disco; le dipendenze
  sono state copiate nel clone senza toccare gli originali. Il vecchio link e la
  cache iniziale sono conservati in `.commerce-recovery-cache/`, fuori dall'albero
  TypeScript e ignorati localmente da Git. Dopo la rimozione di questi riferimenti
  dalla build, compilazione webpack e TypeScript standalone sono passati.

Limiti espliciti: PGlite usa una connessione, quindi manca la prova con transazioni
PostgreSQL realmente parallele. Mancano test end-to-end su Stripe e prova browser
con sessioni reali buyer/seller/admin. Non presentare questi test come eseguiti.

## Attività ancora necessarie prima dell'attivazione

1. Pubblicare il branch con un accesso GitHub in scrittura e farne la revisione.
2. Configurare deployment separato e sandbox Stripe per i test integrati.
3. Confermare commissione piattaforma, sua base di calcolo, rimborso commissioni,
   condizioni commerciali/fiscali, paesi e costi di spedizione del venditore.
   Non dedurre tali valori da abbonamenti o accordi della Galleria Barattolo.
4. Completare OAuth e webhook Connect descritti nel documento di configurazione,
   verificare capability/account e compatibilità della versione API scelta.
5. Eseguire test PostgreSQL multiconnessione, test Stripe integrati, sessioni
   browser reali e flussi degli abbonamenti nell'ambiente isolato.
6. Deploy del codice mantenendo OFF; verifica operativa e solo in seguito richiesta
   di autorizzazione esplicita dell'utente per l'eventuale attivazione.

Le prenotazioni incerte restano bloccate per evitare una doppia vendita. La
riconciliazione Admin ruota cinque ordini per volta; non è configurato un cron.
Non cancellare ordini o sbloccare opere sulla base del solo tempo trascorso.
