# Premio Mostra.Space — esito dei controlli

Verifica del 14 settembre 2026. Base del repository: main `f33b7f8` («Add launch2»). Il lavoro è isolato nel ramo `feature/premio-mostraspace`. Nessuna migrazione è stata eseguita sul database di produzione e nessun deployment è stato avviato dal laboratorio.

| Controllo | Esito e ambito |
|---|---|
| Build Next.js 16.2.7 e TypeScript | Superata; presenti tutte le nuove pagine e API premio |
| ESLint | 41 file TypeScript interessati, zero errori; otto avvisi su immagini già esistenti nelle pagine galleria/profilo e nell’inventario |
| `npm run i18n:check` | Superato; testi premio IT/EN/FR/ES e chiavi mancanti dell’ultimo aggiornamento launch completati; restano segnalazioni informative del controllo generale sui testi esistenti |
| `npm run pwa:check` | `PWA 10 static checks passed` |
| PostgreSQL | 26 prove superate usando le migrazioni effettive in PGlite 0.5.8, in un database temporaneo isolato |
| HTTP e rendering server | 16 scenari superati sulla build di produzione con dati Auth/PostgREST/Storage simulati locali |
| Whitespace Git | `git diff --check` superato |

## Cosa coprono le prove PostgreSQL

Le prove eseguono realmente le prime due migrazioni e le funzioni SQL. Verificano accesso anonimo/autenticato negato alle tabelle e RPC, approvazione del regolamento, verifica email e ruolo, candidatura univoca, proprietà della galleria, consenso, conservazione di metadati/allestimento, rifiuto di una galleria modificata durante l’archiviazione, nuova versione con azzeramento delle valutazioni, limitazione dei tentativi, ammissioni, calendario non modificabile, follow e unfollow, chiusure, esclusioni motivate, conteggi fissati, giuria obbligatoria, tre vincitori distinti, parità Social, risultati riservati, attivazione finita e idempotente del premio e protezione dei piani pagati.

I test si trovano in `web/tests/premio`, con dipendenza separata e versione bloccata. Non cambiano `web/package.json` o il lockfile dell’app. Comandi riproducibili dalla cartella web:

```powershell
npm ci --prefix tests/premio
npm test --prefix tests/premio
```

Il test cambia l’orologio delle fasi solo nel proprio database effimero: non deve essere copiato nel SQL Editor di Supabase. La terza migrazione, che usa `pg_cron`, va verificata nel progetto Supabase perché l’estensione non è disponibile in questo motore di test.

## Cosa coprono le prove HTTP

Sono state richieste landing, candidatura pubblica, archivio, iscrizione sostenitore, dashboard artista e pannello admin. Sono stati controllati canonical della candidatura, ritorno dell’ospite all’iscrizione, assenza dei contenuti di una candidatura non ammessa per un altro utente, errori 401/403 delle API, richieste autorizzate dalla stessa origine, blocco di richieste provenienti da altri siti, calendario UTC, esportazioni admin e assenza di indicizzazione/regolamento per un’edizione in bozza.

Il controllo dell’origine usa host e protocollo esterni conservati dal proxy; non confronta il browser con l’indirizzo interno normalizzato da Next. Per redirect e pagine non trovate viene riconosciuta anche la risposta in streaming di Next, che può consegnare il relativo segnale nel contenuto HTML.

Queste prove usano dati simulati: non certificano consegna di email, configurazione Google OAuth, policy Storage del progetto reale, prestazioni con grandi archivi, invio push, comportamento Stripe dal vivo o funzionamento del job periodico su Supabase.

## Verifiche ancora richieste prima del rilascio

Il browser remoto disponibile non ha potuto raggiungere il server localhost di questo ambiente. **Non è stata completata una verifica visiva desktop/mobile o delle interazioni nel browser.** La guida di installazione include una prova con due account su staging, email/Google reali, copie delle immagini e controllo delle funzioni esistenti.

Prima del merge servono: migrazioni collaudate su Supabase, bucket privato verificato, job attivo, ciclo candidatura → ammissione → follow provato nel browser, Preview Ready e controlli verdi. Il regolamento definitivo e la giuria vanno completati dall’organizzatore prima della pubblicazione dell’edizione.

## Confini funzionali da conoscere

- Il Social riusa il follow al proprietario che il sito offre già dentro la galleria. L’email verificata e l’audit aiutano i controlli; non equivalgono a una verifica dell’identità reale di ogni sostenitore.
- L’archivio conserva immagini, testi e coordinate. Il viewer Unity resta quello della galleria corrente; non è stato creato un viewer 3D separato della copia conservata.
- I vincitori Free attivano il beneficio finito nel sito. Per chi ha già un abbonamento il beneficio va coordinato con Billing: il pulsante admin registra una consegna effettiva, senza applicare autonomamente modifiche Stripe.
- La pubblicazione dei risultati richiede l’azione dell’admin dall’orario della cerimonia. L’evento non genera automaticamente una diretta o inviti.

PWA, service worker, manifest, motore push, chat, notifiche, viewer/build Unity e webhook Stripe non sono modificati. Le integrazioni del premio sono descritte nella guida di installazione.
