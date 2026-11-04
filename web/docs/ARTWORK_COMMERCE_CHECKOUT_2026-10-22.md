# MOSTRA.SPACE - checkout rifiutato e scaduto, 22 ottobre 2026

Collaudo su localhost, Supabase locale e Stripe Commerce Test, con il secondo
venditore. Tutti gli orari qui riportati sono Europe/Rome.

## Riferimenti del test

- Opera: Prova 3, `6e084153-b03a-4e40-a382-7a726701dfa1`, 30 EUR.
- Ordine: `9275e35d-d7f3-4b10-92c9-24d1e555637c`.
- Venditore: `018b090f-89a0-4454-8518-02d2543f2d7f`.
- Account Connect: `acct_1URSlhAxwkHJSl5A`, `livemode=false`.
- Creazione checkout: 18:23:26; scadenza programmata: 19:23:26.

## Esito verificato

1. Alle 18:24:55, la carta di test per il rifiuto generico produce
   `charge.failed` e `payment_intent.payment_failed`. Lo screenshot di Stripe
   conferma il rifiuto; la pagina acquisti mostra "Pagamento da completare".
2. La lettura del database conferma `state=checkout_open`, `inventory_held=true`
   e modalita test. Nessuna conferma di pagamento applicata all'ordine.
3. L'utente disattiva i nuovi pagamenti dall'admin locale. Il checkout viene
   chiuso prima della scadenza programmata: ordine `expired` e prenotazione
   liberata alle 18:38:49.
4. Stripe invia `payment_intent.canceled` e `checkout.session.expired` alle
   18:38:50. Entrambi ricevono HTTP 200. L'evento di scadenza
   `evt_1UTP0uAxwkHJSl5AE56Ag7OR` e presente in `commerce_events`, associato
   all'ordine e all'account Connect corretti.
5. La lettura finale conferma `inventory_held=false` e opera `is_for_sale=true`.
   Gli screenshot mostrano "Checkout scaduto" per acquirente e admin.
6. Riattivando ON, lo screenshot del profilo mostra nuovamente Acquista per
   Prova 3; le due opere precedenti restano non acquistabili. Lo screenshot
   successivo mostra nuovamente OFF. L'ultima lettura conferma pagamenti OFF,
   revisione 4; il preventivo pubblico restituisce `paymentsEnabled=false`
   e `available=false`, coerentemente con l'interruttore globale.

Gli HTTP 200 degli eventi `payment_intent.*` e `charge.failed` attestano la
ricezione: la route non usa questi tipi per modificare l'ordine. La scadenza
e verificata anche tramite registro eventi, ordine e disponibilita dell'opera.

## Correzione della visualizzazione

Gli screenshot mostrano "Da spedire" anche sull'ordine non pagato e scaduto.
`OrderCard` visualizzava lo stato logistico iniziale senza considerare il
pagamento. La correzione in `components/commerce/CommerceUI.tsx` mostra la
spedizione solo per ordini pagati o parzialmente rimborsati. Per un rimborso
totale mantiene soltanto lo storico di spedizione o consegna gia avvenuta.
La condizione si applica a tutte le lingue e alle tre viste degli ordini.

Validazione tecnica: TypeScript completo (`--noEmit --incremental false`)
ed ESLint del componente superati. Non e stata rieseguita la build completa.
La verifica browser dopo l'applicazione resta da eseguire.

## Limiti del collaudo

Questo test copre rifiuto carta, chiusura anticipata tramite OFF, registrazione
dell'evento di scadenza e disponibilita dopo riattivazione. Non dimostra la
scadenza autonoma al termine dell'ora o l'esito di un metodo di pagamento
asincrono gia in elaborazione. Nessuna nuova verifica di produzione e nessun
pagamento live sono stati effettuati.
