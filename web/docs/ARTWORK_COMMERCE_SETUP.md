# Configurazione vendita opere

## Stato e modello implementato

Il modulo usa Checkout una tantum con addebiti diretti sull'account Stripe del
venditore, collegato tramite OAuth con accesso completo alla sua Dashboard.
Non usa clienti, prezzi ricorrenti o abbonamenti della piattaforma per gli acquisti.
Non crea account Stripe automaticamente. Mantiene SDK e integrazione esistenti
(Stripe Node 22.2.3, webhook abbonamenti 2026-04-22.dahlia verificato in test).

Questo modello tecnico NON sostituisce la definizione dei rapporti commerciali,
dei termini del venditore e del trattamento fiscale. Non sono state inventate
commissioni, condizioni di reso o promesse di esenzione dalle responsabilità.

Attualmente sono supportati opere uniche, un'opera per checkout, prezzo finale
in EUR, spedizione a prezzo fisso per opera nei paesi scelti dal venditore.
Tutti i prezzi del catalogo rilevati al recupero erano in EUR. Non sono inclusi
carrelli multi-venditore, biglietti per eventi o valute ulteriori.

## Variabili server

| Nome | Significato |
| --- | --- |
| `STRIPE_SECRET_KEY` | Chiave server dell'integrazione esistente; test/live deve coincidere con venditori e webhook. Non modificarla per provare il modulo sull'ambiente degli abbonamenti in uso. |
| `STRIPE_CONNECT_CLIENT_ID` | Client ID OAuth della piattaforma per l'ambiente selezionato. |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Segreto del nuovo webhook Connect; diverso da quello degli abbonamenti. |
| `NEXT_PUBLIC_SITE_URL` oppure `NEXT_PUBLIC_APP_URL` | Origine HTTPS esatta del sito, senza percorso. Usata anche per protezione CSRF e redirect. |
| `COMMERCE_FEE_BPS` | Commissione piattaforma in punti base, da 0 a 9999. Nessun valore predefinito; 0 deve essere scelto esplicitamente. |
| `COMMERCE_FEE_BASE` | `artwork` oppure `total`: base su cui calcolare la commissione. Arrotondamento per difetto al centesimo. |
| `COMMERCE_REFUND_APPLICATION_FEE` | `true`/`false`: se restituire proporzionalmente la commissione piattaforma nei rimborsi. |
| `COMMERCE_COMMERCIAL_REVIEWED` | `true` solo dopo verifica di prezzi finali, imposte, condizioni e spedizioni. |
| `COMMERCE_ACTIVATION_APPROVED` | Lasciare assente o `false`. Impostare `true` esclusivamente dopo autorizzazione esplicita dell'utente. |
| Variabili Supabase esistenti | URL, chiave pubblica e service role; la service role deve rimanere solo sul server. |

Anche con tutte le variabili configurate, il flag in `commerce_settings` resta
OFF finché un Admin non lo modifica. Il server controlla entrambe le condizioni.
La mancanza di configurazione impedisce l'acquisto; non impedisce la gestione di
pagamenti già registrati quando sono disponibili le credenziali necessarie.

Per i test end-to-end usare un deployment e un database isolati e preferibilmente
una sandbox Stripe separata; non cambiare le chiavi degli abbonamenti in produzione.
Non introdurre dati test nel database reale. Valutare chiavi ristrette con i permessi
necessari a OAuth, account collegati, Checkout, PaymentIntent e rimborsi.

## Configurazione Stripe da completare

1. Verificare il profilo Connect della piattaforma e il supporto al collegamento
   OAuth degli account indipendenti. Il Client ID e le impostazioni OAuth non
   sono esposti dalle letture Stripe effettuate in questa sessione.
2. Registrare il redirect esatto
   `https://mostra.space/api/commerce/connect/callback` (e il redirect del
   deployment di test separato). I venditori possono scollegare l'account;
   la deautorizzazione disabilita i nuovi acquisti.
3. Dopo il deploy del codice, creare un endpoint **per gli account collegati**:
   `https://mostra.space/api/stripe/connect-webhook`. Salvare il suo segreto
   sul server. Non sostituire `/api/stripe/webhook`, che resta dedicato a
   abbonamenti e acquisti template della piattaforma.
4. Eventi necessari: `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`,
   `refund.created`, `refund.updated`, `refund.failed`, `charge.refunded`,
   `account.updated`, `account.application.deauthorized`.
5. Verificare versione API del nuovo endpoint e compatibilità con l'SDK installato.
   Un aggiornamento a Accounts v2/SDK successivi richiede una verifica separata
   dell'interoperabilità OAuth e delle capability, senza alterare gli abbonamenti.
6. Eseguire l'onboarding di un venditore di prova nel solo ambiente isolato,
   verificare capability, requisiti ancora dovuti e disponibilità degli accrediti.
   Il venditore completa i requisiti nella propria Dashboard Stripe. Valutare
   l'aggiunta del componente Stripe `notification_banner` per il monitoraggio KYC.
7. Eseguire Checkout, webhook, fallimento asincrono e rimborsi end-to-end. Nessuna
   transazione reale è stata eseguita durante questo sviluppo.

Le modalità di pagamento sono quelle abilitate su Stripe per l'account venditore;
il server gestisce anche i pagamenti asincroni. Nessun importo viene accettato
fidandosi del browser. Imposte automatiche e conversione valuta non sono abilitate.

## Schermate

- Admin: `/admin/pagamenti-opere`, interruttore ON/OFF, blocchi di configurazione,
  ordini, spedizioni, rimborsi e riconciliazione.
- Venditore: `/dashboard/vendite`, collegamento Stripe, opere, costo/paesi di
  spedizione, URL delle condizioni, ordini ricevuti e rimborsi.
- Acquirente: `/account/acquisti`, ordini e verifica dello stato.
- Cataloghi pubblici delle gallerie e profili: pulsante Acquista opera visibile
  anche durante OFF, ma disabilitato. L'editor/viewer Unity non è stato modificato.
- Copie IT/EN/FR/ES in `lib/commerce/translations.ts`, voci menu nei JSON esistenti.

## Invarianti e recupero

- Prenotazione atomica tramite lock dell'opera e indice univoco parziale su
  `commerce_orders(artwork_id) WHERE inventory_held`.
- Il pagamento conserva uno snapshot di prezzo, spedizione, termini, commissione,
  venditore e account Stripe. Le condizioni dovrebbero avere URL versionati.
- Un doppio clic riusa ordine e chiave di idempotenza; non crea due pagamenti.
- OFF viene applicato nel database prima di tentare la chiusura dei checkout
  Stripe già aperti. Un checkout ospitato già emesso può completarsi finché Stripe
  non ne conferma la scadenza: viene registrato correttamente, anche durante OFF.
- La riconciliazione Admin lavora su cinque ordini per volta, ruotando quelli
  controllati. Ripeterla finché non rimangono sessioni aperte; gli errori di rete
  non annullano il salvataggio di OFF. Non esiste un cron automatico configurato.
- I webhook possono arrivare duplicati/fuori ordine: firma verificata, lettura
  dello stato corrente da Stripe, controllo account/modalità/importo/valuta/ordine,
  registrazione eventi nella stessa transazione SQL.
- Un timeout o il solo scorrere dell'orologio NON liberano l'opera. Per una
  sessione aperta serve la scadenza confermata da Stripe; per un pagamento
  asincrono serve la cancellazione definitiva del PaymentIntent.
- Oltre 23 ore una creazione incerta non viene ripetuta, perché Stripe non
  garantisce la conservazione dell'idempotenza oltre 24 ore. Usare Verifica
  pagamento/Riconcilia. Se non si trova la sessione, esaminare i log Stripe
  prima di intervenire; non sbloccare l'opera tramite un semplice timer.
- Venditore/Admin possono gestire ordini pagati e rimborsi durante OFF. I rimborsi
  pendenti riservano l'importo; quelli fatti nella Dashboard Stripe vengono
  importati dai webhook, dalla verifica ordine e prima di un nuovo rimborso.
- Un rimborso completo NON rimette automaticamente in vendita un'opera fisica.
  La rimessa in vendita dopo restituzione richiede una procedura amministrativa
  futura e una verifica della riconsegna. Il registro conserva gli snapshot
  anche se l'opera o il profilo vengono rimossi dal catalogo.

## Test riproducibili

Dalla cartella `web`, con le dipendenze del progetto installate:

```powershell
npm --prefix tests/commerce ci
node --test tests/commerce/integration.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/eslint/bin/eslint.js lib/commerce components/commerce app/api/commerce app/api/stripe/connect-webhook app/account/acquisti app/dashboard/vendite app/admin/pagamenti-opere
npm run i18n:check
npm run pwa:check
npm run build
```

La suite usa PGlite 0.5.8 con fixture locali e adattatori Stripe simulati; non
richiede credenziali e non effettua chiamate di pagamento. Esegue il vero SQL,
gli handler HTTP e la verifica firme dell'SDK Stripe. Le richieste concorrenti
sono messe in coda da PGlite: prima dell'attivazione resta il test su PostgreSQL
isolato con connessioni realmente parallele, oltre al test end-to-end Stripe.

## Database già migrato: non rieseguire

Migrazione applicata il 2026-10-08 alle 22:05 UTC:
`20261008220511_add_artwork_commerce_payments_off`.
File esatto: `supabase/artwork-commerce.sql`. Rimane fuori da `migrations/`
perché la CLI non era disponibile; applicato una sola volta mediante il connettore
Supabase dopo il confronto con lo schema reale. Il file rifiuta una seconda
esecuzione se `commerce_settings` esiste.

Le otto tabelle hanno RLS attiva senza policy browser e grant revocati ad
`anon`/`authenticated`; accesso solo tramite server/service role. La RPC è
SECURITY INVOKER ed eseguibile solo da service role. L'avviso informativo
[RLS Enabled No Policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
è coerente con questa scelta: non aggiungere policy pubbliche per eliminarlo.
