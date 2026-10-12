# MOSTRA.SPACE - stato del 12 ottobre 2026

## Codice e repository
- Branch: feature/artwork-commerce-payments-off; PR #19 in bozza, non unita.
- Correzione rimborsi pubblicata: 0b4fc5a1d0d49382803bd6f896889eba72600f0d.
- Commit precedenti: a67ecb1 e 826e3d3; base main verificata: 219767d.
- Vercel per 0b4fc5a: Canceled by Ignored Build Step, verificato via GitHub.
- Regola Vercel Custom sul solo branch commerce: mantenere fino a rilascio autorizzato.
- Verificare di nuovo l'annullamento per ogni nuovo commit pubblicato.
- Produzione ultima verificata su main 219767d, senza nuovo codice commerce.
- API GitHub in scrittura: 403; push eseguiti dall'utente in PowerShell.
- Descrizione PR: utente dichiara aggiornata; API restituisce ancora 17/17.
  Il salvataggio della nuova descrizione non e' confermato.
- Questo documento aggiorna le indicazioni "solo locale" del riepilogo precedente.

## Verifiche concluse
- Suite PGlite/Stripe simulato: 23/23, nessun test saltato.
- TypeScript, ESLint commerce e controllo del diff superati.
- Build next build con Turbopack: riuscita, 47/47 pagine, segnaposto senza chiavi.
- La concorrenza precedente usa una sola connessione PGlite.

## Nuovi test PostgreSQL
- Aggiunti workflow GitHub Actions e pacchetto tests/commerce-postgres.
- PostgreSQL 17.6 temporaneo nel runner; host e credenziali locali fittizi.
- Venti backend distinti, con attesa sui lock verificata in pg_stat_activity.
- Casi: OFF/permessi, acquisti simultanei, retry dello stesso acquirente,
  OFF prima/dopo una prenotazione, webhook duplicati, limite rimborsi,
  revisioni concorrenti, rollback eventi, fallimenti tardivi e stock.
- SQL iniziale e correzione caricati SOLO nel database vuoto e isolato della CI.
- Nessun segreto GitHub o collegamento Stripe/Supabase utilizzato dal workflow.
- Sintassi JavaScript verificata nel preparatore; suite PostgreSQL NON ancora
  eseguita al momento della preparazione. Acquisire run, commit ed esito CI.
- I nuovi test SQL non sostituiscono Stripe Connect end-to-end o prove browser.

## Supabase - ultima lettura diretta 12 ottobre ore 13:34 CEST
- Progetto qhkdhgezkcpekbtovruj, PostgreSQL 17.6.
- payments_enabled=false; ordini 0; rimborsi 0.
- 20261008220511_add_artwork_commerce_payments_off gia' applicata: NON rieseguire.
- 20261011143230_fix_commerce_refund_sync NON applicata; refund_revision assente.
- Ultimo confronto del corpo funzione: impronta originale attesa.
- Ricontrollare schema e OFF prima della sola migrazione correttiva e coordinarla
  con il rilascio del codice. Non eseguire push indiscriminati degli SQL storici.

## Stripe e attivita' mancanti
- Rotazione LIVE completata con evidenze gia' documentate; nessun addebito di prova.
- Restano rotazione TEST e verifica degli ambienti Preview.
- Restano configurazione Connect/OAuth/webhook dedicato e separazione test/live.
- Restano test Connect end-to-end isolati, browser e regressioni abbonamenti.
- Restano conferma condizioni commerciali, commissioni e spedizioni.
- Restano analisi vulnerabilita' npm: precedente npm ci web ne segnalava 14
  (1 moderate, 12 high, 1 critical); nessun audit fix applicato.
- Aggiornare questo documento con i risultati della nuova CI dopo la verifica.

## Vincoli
Pagamenti opere OFF fino ad autorizzazione esplicita.
Nessun merge o deploy commerce autorizzato.
Nessuna credenziale esposta deve essere riutilizzata.
