# Vendita opere: Pay by Bank e verifica lingue

Prove del 27 ottobre 2026; lingue e preflight del 28 ottobre.
Orari Europe/Rome. Ambiente localhost:3000 e sandbox MOSTRA SPACE -
Commerce Test. Codice di riferimento: 0c85fa23a7a9062ebb2fb866982a60ce9a33e02c,
branch feature/artwork-commerce-payments-off, PR #19.

## Prove confermate

Usato solo venditore.commerce2@example.test, Connect acct_1URSlhAxwkHJSl5A.
Acquirente: admin locale. Simulazione bancaria anche in Chrome Ospite,
verifica degli ordini nella sessione Mostra autenticata.

- Prova 3, nuovo ordine #803026d5 del 27 ottobre alle 20:42:51, 30 EUR:
  Pay by Bank, Finlandia, Danske Bank, Authorize test payment.
  Alle 20:59:18 payment_intent.succeeded, charge.succeeded e
  checkout.session.completed; alle 20:59:19
  checkout.session.async_payment_succeeded
  (evt_1UVGWgAxwkHJSl5A1gbvOUlq). Tutti ricevuti con HTTP 200.
  Screenshot image(20261027-200102).png: Pagato, Da spedire,
  totale 30 EUR, rimborsato 0 EUR. Invito a ricaricare senza Verifica pagamento.
  application_fee.created osservato; importo non ricontrollato in questa prova.
- Prova 4, ordine #b0d656ff del 27 ottobre alle 21:09:12, 30 EUR:
  Fail test payment. Alle 21:09:40 payment_intent.payment_failed e
  charge.failed ricevuti con HTTP 200. Screenshot image(20261027-201052).png:
  Pagamento da completare, Riprendi pagamento, senza Da spedire.
- Dopo OFF: alle 21:21:55 payment_intent.canceled
  (evt_3UVGgaAxwkHJSl5A2qbz8Ewd) e checkout.session.expired
  (evt_1UVGsYAxwkHJSl5AVAfTLO4S), entrambi HTTP 200 alle 21:21:58.
  Screenshot image(20261027-202239).png: Pagamenti OFF, Prova 4
  Checkout scaduto, totale 30 EUR, rimborsato 0 EUR.
- Il 28 ottobre l'utente conferma "lingue OK" dopo il controllo richiesto
  di I miei acquisti e Vendita opere in EN/FR/ES. Verifica visiva manuale.

Il precedente blocco su Paga era dovuto alla banca non selezionata,
come confermato dall'utente. Nessuna correzione applicativa necessaria.

## Limiti

Il fallimento di Prova 4 e recuperabile, non una prova di
checkout.session.async_payment_failed dopo checkout completato.
Non osservato uno stato processing prolungato. Scadenza forzata tramite
OFF, non naturale. Inventario locale non ricontrollato direttamente.
Prova 3 del 27 ottobre e distinta dall'ordine scaduto del 22 ottobre.
Test e build del 23 ottobre restano documentati nel relativo preflight.

## Produzione: sola lettura del 28 ottobre

Supabase qhkdhgezkcpekbtovruj: pagamenti OFF, revision=0, ordini=0.
Migrazione iniziale 20261008220511 presente. Correzione
20261011143230_fix_commerce_refund_sync e colonna refund_revision assenti.
commerce_command SECURITY INVOKER; hash normalizzato
fdf6f98c1393fd70fdb4188025bf8d14 coerente con la guardia della correzione.
Non rieseguire artwork-commerce.sql.

PR #19 aperta e draft, head 0c85fa2. Connettore Stripe: solo sandbox.
Restano configurazione live, condizioni commerciali reali e correzione SQL.
10% ed example.com sono valori di collaudo, non decisioni per il live.
Nessuna modifica alla produzione; nessuna attivazione autorizzata.