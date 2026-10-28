# MOSTRA.SPACE - collaudo commerce locale, 18 ottobre 2026

## Ambito e stato

Branch: `feature/artwork-commerce-payments-off`. PR: #19, in bozza.

Il percorso principale e stato verificato nel browser su `http://localhost:3000`,
con Supabase locale `http://127.0.0.1:54321` e sandbox Stripe separata
MOSTRA SPACE - Commerce Test. Tutte le transazioni osservate hanno `livemode=false`.

Il 16 ottobre l'utente ha autorizzato espressamente Pagamenti ON nel solo ambiente
locale/sandbox, commissione 10% sul prezzo dell'opera, restituzione proporzionale
della commissione nei rimborsi, opere di prova da 30 EUR e spedizione gratuita in
Italia. E stato usato esclusivamente il secondo venditore di prova, con sessioni
browser distinte per venditore e acquirente.

Questa autorizzazione aggiorna il vincolo OFF dei documenti precedenti solo per
questo ambiente di prova. Non autorizza pagamenti live, merge o deploy commerce.
In questa fase non sono state modificate le impostazioni di produzione.

Questo documento aggiorna gli esiti di
[ARTWORK_COMMERCE_LOCAL_2026-10-14.md](ARTWORK_COMMERCE_LOCAL_2026-10-14.md),
che conserva il resoconto storico del bootstrap del 14-15 ottobre.

## Correzione onboarding Stripe

Un venditore con account Standard gia collegato ma incompleto doveva poter
completare i requisiti senza ripetere il collegamento OAuth.

- `app/api/commerce/[...path]/route.ts`: per il venditore gia collegato crea un
  Account Link `account_onboarding`; mantiene OAuth per il primo collegamento
  o per un account scollegato.
- Le route `connect/onboarding-refresh` e `connect/onboarding-return` autenticano
  il venditore e ricavano l'account dalla sua associazione nel database.
- Il ritorno legge lo stato effettivo da Stripe, controlla account e modalita,
  aggiorna le capability e torna alla pagina vendite. Il solo ritorno dal link
  non viene considerato prova del completamento.
- `components/commerce/CommerceUI.tsx`: considera anche `details_submitted` e
  mostra il comando per completare la configurazione dell'account collegato.

L'onboarding ospitato e stato completato in sandbox. Il venditore ha raggiunto
`charges_enabled=true`, `payouts_enabled=true`, `details_submitted=true`,
`disconnected=false`, `livemode=false`.

## Risultati verificati

| Prova | Risultato osservato |
| --- | --- |
| Caricamento opera e annuncio | Opera caricata; annuncio abilitato, prezzo 30 EUR, spedizione 0 EUR, paese IT. |
| Primo acquisto, Prova | Checkout completo, PaymentIntent riuscito per 3000 centesimi, commissione 300 centesimi. Prima riconciliazione eseguita con Verifica pagamento. |
| Rimborso parziale | Rimborso riuscito di 300 centesimi; ordine `partially_refunded`; commissione restituita di 30 centesimi. |
| Completamento rimborso | Secondo rimborso riuscito di 2700 centesimi; ordine `refunded`; totale restituito 3000 centesimi e commissione restituita 300 centesimi. |
| Webhook rimborsi | Eventi `refund.created`, `refund.updated`, `charge.refunded` ricevuti con HTTP 200 e registrati in `commerce_events`. |
| Secondo acquisto, Prova 2 | Ordine `paid`, 3000 centesimi incassati e commissione 300 centesimi, con `checkout.session.completed` registrato dal webhook. Acquirente ha verificato la pagina senza Verifica pagamento. |
| Disponibilita dopo vendita | Quote pubblica di Prova 2 con `available=false`; ordine con `inventory_held=true`. |
| Spedizione | Acquirente ha visualizzato Spedito e il tracking sintetico `TEST-MOSTRA-001`. |
| Consegna | Screenshot acquirente e database concordano: pagamento `paid`, evasione `delivered`, tracking invariato. |

Identificatori per correlare le sole prove locali:

- Prova: ordine `eddf3e99-8b75-4ac8-9b2d-34b3450178fe`.
- Prova 2: ordine `c4dfcc0c-1efa-451b-93da-371d514ea014`.
- Evento di conferma automatica del secondo ordine:
  `evt_1URgAyAxwkHJSl5A2qmT1D6p` (`checkout.session.completed`).

Per il primo ordine non risultavano eventi di pagamento ricevuti prima della
verifica manuale. Dopo l'avvio del listener, la consegna dei webhook e stata
verificata con i rimborsi e poi con un nuovo acquisto completo. Non si attribuisce
al webhook la prima riconciliazione manuale.

Il rimborso totale non rimette automaticamente in vendita un'opera fisica:
Prova conserva la prenotazione dell'inventario. La seconda prova usa un'altra
opera. Questo comportamento e previsto dall'implementazione corrente.

## Inoltro webhook locale

Il comando usato in una finestra dedicata, lasciata aperta durante le prove:

```powershell
stripe listen --project-name mostra-commerce-local --forward-connect-to http://localhost:3000/api/stripe/connect-webhook
```

`STRIPE_CONNECT_WEBHOOK_SECRET` deve corrispondere al segreto del listener.
Il segreto resta nel solo `.env.local`, escluso da Git. Nessuna credenziale e
inclusa in questo documento.

L'interfaccia carica lo stato all'apertura o all'aggiornamento della pagina;
questo collaudo prova la registrazione automatica nel backend tramite webhook,
non un aggiornamento continuo della schermata senza ricaricarla.

## Bootstrap e Storage

I due script `scripts/Initialize-CommerceLocal.ps1` e
`scripts/Configure-CommerceLocal.ps1` documentano le operazioni gia eseguite sul
PC. Hanno percorsi, impronte e precondizioni specifici di quell'installazione;
non sono un installatore portabile e non vanno rieseguiti sull'ambiente popolato.
Il primo richiede il dump di schema locale validato, esterno al repository.

Lo Storage locale era incompleto: mancavano `storage.objects` e
`storage.buckets`. E stato ripristinato separatamente, dopo backup e collaudo in
un database temporaneo. I controlli del ripristino hanno confermato 10 tabelle
Storage, 74 migrazioni, 4 utenti e 65 tabelle public, preservando gli stati
controllati. Il caricamento delle opere e poi riuscito. I due script storici non
includono questa successiva riparazione Storage.

Il 18 ottobre i due script sono stati controllati senza eseguirli: parser
PowerShell senza errori e scansione senza corrispondenze per chiavi Stripe o JWT
incorporati. I due file applicativi sono identici, normalizzando LF/CRLF, alle
copie verificate durante la correzione onboarding del 17 ottobre.

## Limiti e passaggi successivi

- Gli esiti sopra riguardano il percorso principale in sandbox e il browser in
  italiano. Non certificano tutti i casi di pagamento asincrono o di errore, ne
  una verifica visuale completa nelle altre tre lingue.
- I precedenti controlli automatici e concorrenti hanno i rispettivi resoconti
  storici. Non sono stati rieseguiti integralmente durante questo collaudo browser.
  Non e stata eseguita una nuova build completa dopo la patch onboarding.
- La regressione end-to-end degli abbonamenti resta da completare in ambiente
  isolato. Non sono state usate transazioni di produzione per questo collaudo.
- `https://example.com/` e stato usato esclusivamente come URL delle condizioni
  dell'annuncio di prova; non costituisce un testo commerciale per la vendita reale.
- La correzione SQL `20261011143230_fix_commerce_refund_sync` risulta applicata
  localmente; l'ultimo controllo documentato del 14 ottobre la indicava ancora
  assente in produzione. Lo stato remoto non e stato ricontrollato in questo turno.
- Salvare nel branch correzione onboarding, script storici e resoconti, escludendo
  `.env*`, `supabase/.temp/`, backup e dump. Aggiornare poi la revisione della PR #19.
- Preparare e verificare separatamente il rilascio con pagamenti inizialmente OFF.
  Merge, deploy e attivazione live non fanno parte di questo collaudo autorizzato.
