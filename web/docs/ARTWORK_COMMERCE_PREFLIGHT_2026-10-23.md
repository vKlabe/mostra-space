# Artwork commerce: preflight del 23 ottobre 2026

Base verificata: `13e84701a67adca4a4a6c84cc936c39a86ea7a71`, branch
`feature/artwork-commerce-payments-off`, PR #19. Questo documento riguarda
il collaudo e la preparazione al rilascio; non autorizza un merge o pagamenti live.

## Correzione delle dipendenze

L'audit delle dipendenze di produzione prima della correzione segnalava
6 pacchetti vulnerabili: 1 critical, 4 high e 1 moderate.

| Dipendenza | Prima | Dopo |
| --- | --- | --- |
| next | 16.2.7 | 16.4.2 |
| eslint-config-next | 16.2.7 | 16.4.2 |
| sharp | 0.34.5 | 0.35.5 |
| source-map-js, transitiva | 1.2.1 | 1.2.2 |
| baseline-browser-mapping, transitiva | versione vulnerabile < 2.11.0 | 2.11.31 |

Il lockfile e stato rigenerato con npm. L'aggiornamento di Next include anche
le versioni corrette delle sue dipendenze PostCSS e nanoid. Il lockfile conserva
i pacchetti opzionali per Linux e Windows. Nessuna dipendenza Stripe, React o
Supabase diretta e stata aggiornata. Non e stato usato `npm audit fix --force`.

Riferimenti ufficiali:
- https://github.com/vercel/next.js/releases/tag/v16.4.2
- https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw
- https://github.com/lovell/sharp/releases/tag/v0.35.5

## Controlli effettuati sulla copia isolata

Codice di partenza verificato rispetto ai blob Git del commit indicato,
con i due manifest aggiornati e il nuovo test immagini. Il file statico di
esempio Unity demo-gallery.json non e incluso nel collaudo.

- `npm audit --omit=dev`: zero vulnerabilita il 23 ottobre 2026.
- Commerce: 23 test superati, nessuno saltato.
- Billing: 9 test superati, nessuno saltato.
- Immagini: 6 test superati con Sharp 0.35.5. Sono verificate le varianti
  WebP da JPEG/PNG/WebP, dimensioni, orientamento EXIF, assenza di
  ingrandimento, rifiuto di file invalidi o tipi incoerenti e pulizia dopo
  un errore di salvataggio. Storage simulato; nessun caricamento remoto.
- TypeScript: nessun errore.
- ESLint nei moduli commerce: nessun errore.
- i18n: nessuna chiave mancante; restano gli avvisi preesistenti sui testi
  hardcoded. Questo controllo non sostituisce una verifica visiva EN/FR/ES.
- PWA: tutti i 10 controlli statici superati.

La build completa con le nuove dipendenze deve essere eseguita nella copia
locale dell'utente. La precedente build riuscita del 18 ottobre usava Next
16.2.7 e non certifica questo aggiornamento. Lo script locale allegato esegue
la nuova build prima di consentire commit e push.

## Stato del collaudo funzionale

Il collegamento Stripe e stato verificato in `MOSTRA SPACE - Commerce Test`,
`livemode=false`. Il secondo venditore usa `acct_1URSlhAxwkHJSl5A`:
charges_enabled, payouts_enabled e details_submitted sono true; non sono
presenti requisiti attualmente dovuti. Il primo venditore non viene usato.

Restano validi i resoconti gia salvati: acquisto con webhook automatico,
rimborsi parziale e totale con commissione proporzionale, consegna e tracking,
blocco del secondo acquisto, carta rifiutata e scadenza forzata del checkout
con rilascio dell'inventario. La UI degli ordini non pagati e stata confermata
dall'utente dopo il commit 13e8470.

La scadenza e stata forzata tramite disattivazione amministrativa dei pagamenti;
non e una prova di scadenza naturale. I casi di pagamento asincrono hanno
copertura automatica ma non sono ancora stati collaudati end-to-end su Stripe.

Gli abbonamenti hanno copertura di checkout Pro, portale e cancellazione
programmata con billing flessibile. Il ritorno a Free alla scadenza effettiva,
i rinnovi falliti e i cambi di piano non sono stati certificati da questi test.

## Cosa manca prima del live

1. Applicare questi file al checkout locale e completare la build. Chiudere
   i controlli browser EN/FR/ES e i casi asincroni se previsti per il rilascio.
2. Preparare la configurazione live di Connect e del webhook dedicato,
   le condizioni commerciali reali e la migrazione correttiva dei rimborsi.
   Il 10% e le condizioni example.com del collaudo valgono solo per la sandbox.
3. Dopo autorizzazione, rilasciare con pagamenti OFF, verificare l'ambiente
   pubblico e autorizzare separatamente l'attivazione dei pagamenti.

Nella lettura di produzione del 23 ottobre: payments_enabled=false, zero
ordini, migrazione iniziale presente; `20261011143230_fix_commerce_refund_sync`
ancora assente. Non rieseguire lo SQL iniziale. La verifica della PR #19
indicava draft=true, mergeable=true e nessuna build Actions; Vercel aveva
saltato il deploy tramite Ignored Build Step. Non e una validazione pubblica
con le nuove dipendenze.

Nessuna modifica a produzione, credenziali, account o impostazioni di
pagamento e stata eseguita durante questo preflight.

## Verifica nella copia locale dell utente

Eseguita il 2026-10-23 16:51:18 UTC tramite Save-CommerceSecurityValidationLocal.ps1.
Installazione dal lockfile, audit produzione, test commerce/billing/immagini, TypeScript, ESLint commerce, i18n, PWA e build webpack: tutti completati con codice 0.
Questa verifica completa la build locale indicata come pendente nel preflight.
