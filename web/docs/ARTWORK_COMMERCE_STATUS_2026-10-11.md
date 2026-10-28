# MOSTRA.SPACE — avanzamento 11 ottobre 2026

## Repository
- Branch: feature/artwork-commerce-payments-off.
- Commit recuperati: a67ecb1 e 826e3d3, pubblicati su GitHub.
- PR #19 aperta in bozza, non unita.
- Worktree: G:/Users/User/mostra-space-commerce.
- Repository originale e file non tracciati preservati.

## Produzione e Stripe
- Produzione verificata sul commit main 219767d.
- Nuova chiave LIVE installata su Vercel e produzione ridistribuita.
- Creazione sessione portale LIVE verificata con HTTP 200.
- Webhook dopo redeploy: HTTP 200 l'11 ottobre alle 10:23:50 CEST.
- Vecchia chiave LIVE fatta scadere; revoca riscontrata nella Dashboard.
- Utente conferma nuova apertura del portale dopo revoca, senza errori.
- Rotazione LIVE in produzione completata con queste evidenze.
- Rotazione TEST e aggiornamento dei deployment Preview ancora da verificare.
- Nessun addebito o rinnovo reale eseguito come test.

## Supabase
- Migrazione 20261008220511_add_artwork_commerce_payments_off già applicata.
- NON rieseguirla.
- Controllo diretto 11 ottobre: pagamenti OFF, revisione 0, ordini 0, rimborsi 0.
- Corpo della funzione commerce_command confrontato: corrisponde al repository.

## Correzione necessaria prima del rilascio
- refund_sync considera succeeded definitivo e ignora fallimenti successivi.
- Con totale rimborsato pari a zero, può conservare erroneamente lo stato refunded.
- Preparare correzione incrementale, protezione dagli aggiornamenti concorrenti
  e test per fallimenti tardivi, requires_action, duplicati e pagamenti OFF.
- Correzione preparata localmente; nuova migrazione NON applicata a Supabase; verifica aggiuntiva ancora da eseguire.

## Test e attività mancanti
- Esito precedente del 9 ottobre: 17/17 test, TypeScript, lint e build superati.
- 11 ottobre, worktree utente: baseline 17/17 test superati; Node v24.19.0.
- Mancano test PostgreSQL multiconnessione e Stripe Connect end-to-end isolati.
- Mancano configurazione Connect e conferma delle condizioni commerciali.
- I test PGlite usano un database locale temporaneo e Stripe simulato.

## Vincoli
Pagamenti opere OFF fino ad autorizzazione esplicita.
Nessun merge o deploy commerce autorizzato.
Non usare chiavi esposte né copiare credenziali LIVE nei test.
## Correzione rimborsi preparata localmente
- Baseline eseguita dall'utente l'11 ottobre: 17/17 test superati, Node v24.19.0.
- npm ci: 14 vulnerabilita (1 moderate, 12 high, 1 critical); nessun audit fix applicato.
- Aggiunti revisione dell'ordine, confronto atomico e rilettura Stripe in caso di conflitto.
- Stati failed/requires_action successivi a succeeded aggiornano importi e stato ordine.
- Opera unica sempre bloccata dopo un pagamento; nessuna rimessa in vendita automatica.
- Suite portata a 23 test; nuovo esito NON ancora verificato al momento della preparazione.
- Migrazione incrementale generata localmente tramite CLI; NON applicata a Supabase.
- Nessun commit, push, merge o deploy eseguito dal preparatore.
- Restano: nuovi test, TypeScript, lint, build, test PostgreSQL multiconnessione,
  Stripe Connect end-to-end isolato, configurazione Connect e condizioni commerciali.
- Pagamenti opere restano OFF; la migrazione iniziale NON va rieseguita.

## Correzione del controllo LF/CRLF
- Prima esecuzione: 23 test bloccati nel setup con COMMERCE_SCHEMA_DRIFT.
- Corretto il confronto dell'impronta normalizzando solo i ritorni a capo.
- Conservati l'impronta attesa e il blocco contro reali differenze del codice.
- Migrazione correttiva ancora NON applicata a Supabase.
- Pagamenti opere OFF; nessun commit, push, merge o deploy eseguito.
- Nuova esecuzione suite commerce: codice uscita 0 (0 = superata).
- TypeScript: codice uscita 0 (0 = superato).
- ESLint moduli commerce: codice uscita 0 (0 = superato).

## Build locale e preparazione del commit
- Data UTC: 2026-10-11T20:25:51.163Z
- Comando: next build, senza cambio del bundler predefinito.
- Esito build: SUPERATA.
- Usati soltanto segnaposto; nessun file ambiente creato o modificato.
- La build non certifica le integrazioni Stripe/Supabase reali.
- Suite precedente verificata: 23/23; TypeScript, ESLint commerce e diff superati.
- Migrazione 20261011143230_fix_commerce_refund_sync ancora solo locale.
- Pubblicazione remota della correzione ancora da eseguire.
- Restano test PostgreSQL multiconnessione e Stripe Connect end-to-end isolati.
- Restano configurazione Connect, condizioni commerciali e analisi delle vulnerabilita npm.
- Pagamenti opere OFF. Nessun merge o deploy.
