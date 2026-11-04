# Stripe live: preflight del 29 ottobre 2026

Verifica in sola lettura dopo il collegamento live confermato dall'utente.
Account: acct_1TZExpBAthEubFqR, nome Vincenzo Bordoni, livemode=true.
Nessuna creazione di account, webhook, pagamento o rimborso.
Nessuna modifica delle impostazioni Stripe o del deployment.

## Account della piattaforma

La lettura GET /v1/accounts/{id} dell'account esistente restituisce:
- type=standard, country=IT, default_currency=eur;
- charges_enabled=true, payouts_enabled=true, details_submitted=true;
- card_payments e transfers active;
- currently_due, past_due e pending_verification vuoti;
- disabled_reason=null.

Il sito nel profilo Stripe e www.galleriabarattolo.it.
L'account contiene anche endpoint di altri progetti: la verifica non
autorizza modifiche globali al profilo, alle chiavi o a quegli endpoint.

La lettura /v2/core/accounts/{id} della piattaforma ha restituito
INVALID_ARGUMENT, anche limitando include a defaults. Il risultato non
e una prova che Connect sia disabilitato e non giustifica una migrazione.
L'integrazione esistente usa OAuth e account Standard; il risultato v1
non certifica da solo le impostazioni OAuth della piattaforma.

## Webhook

Elenco completo ottenuto con has_more=false.
Endpoint MOSTRA.SPACE esistente:
- ID: we_1TlUnFBAthEubFqR2hFvgAV5
- URL: https://mostra.space/api/stripe/webhook
- status=enabled, livemode=true
- API: 2026-04-22.dahlia
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted

L'endpoint https://mostra.space/api/stripe/connect-webhook non compare
nell'elenco. Va preparato separatamente per gli eventi degli account
collegati e configurato dopo che la route pubblica e disponibile.
Non sostituire il webhook degli abbonamenti.

## Venditori collegati

GET /v1/accounts restituisce data=[] e has_more=false.
Nessun account venditore live collegato alla piattaforma.
Il venditore sandbox non e automaticamente un venditore live.

## Controllo successivo

Aprire l'account live nella Dashboard e controllare le impostazioni OAuth:
https://dashboard.stripe.com/settings/connect/onboarding-options/oauth

Da verificare: Standard OAuth, Client ID live e redirect registrati.
Redirect richiesto dall'app:
https://mostra.space/api/commerce/connect/callback

Questi valori non sono stati ottenuti tramite le letture disponibili.
Il Client ID OAuth non e una chiave API segreta. Non raccogliere nei
resoconti chiavi API, token OAuth o segreti webhook.

Fonti tecniche:
- Codice esistente e ARTWORK_COMMERCE_SETUP.md nel branch della PR #19.
- https://docs.stripe.com/connect/oauth-reference
  Il Client ID e i redirect sono nelle impostazioni della piattaforma;
  il redirect live deve essere HTTPS e corrispondere esattamente.

Restano validi i limiti commerciali/fiscali della nota del 28 ottobre
e il piano di rilascio con pagamenti OFF. Nessuna attivazione eseguita.
## Aggiornamento OAuth fornito dall'utente

Il 29 ottobre l'utente ha riferito di aver verificato l'identita.
Le schermate mostrano la scelta del modello di business: indicata
Piattaforma, con gli esercenti che riscuotono direttamente i pagamenti,
coerente con l'integrazione gia collaudata.
Il precedente avviso collegava l'indisponibilita del Client ID al profilo
della piattaforma incompleto o ancora in revisione.
Successivamente l'utente ha fornito il valore mostrato come ID client live:
ca_VQsJUi5454pVwmO2KIyGpBXXQNT4eGRz

Questa e evidenza fornita dall'utente, non una lettura API del Client ID.
Il salvataggio del redirect e lo stato del toggle OAuth non sono ancora
confermati. Client ID pubblico: nessuna chiave segreta registrata qui.

La variabile prevista dal codice verificato su GitHub al commit 8e99c1a e
STRIPE_CONNECT_CLIENT_ID. Preparazione proposta solo per Vercel Production:
commissione 1000 bps su artwork, restituzione commissione true,
COMMERCE_ACTIVATION_APPROVED=false e COMMERCE_COMMERCIAL_REVIEWED=false.
Nessuna variabile Vercel e stata modificata o letta tramite questi strumenti.
Nessun merge, deploy, SQL di produzione o attivazione pagamenti eseguiti.
PR #19 ricontrollata: open, draft, head 8e99c1a, base 219767d.


## Aggiornamento del 4 novembre: verifica senza recuperare la chiave

L'utente ha confermato il salvataggio delle sei variabili proposte in Vercel
Production e NEXT_PUBLIC_SITE_URL=https://mostra.space. Ha indicato il
prefisso sk_live_ della chiave esistente. Il valore completo non e stato
acquisito, stampato o salvato. Il tentativo manuale non ha superato il
controllo di formato e non ha eseguito richieste Stripe.
La copia locale in G:\Users\User\ArtPortalImmersivo\web\.env.local contiene
una chiave di test: il controllo si e interrotto prima di chiamare Stripe.

La schermata OAuth conferma il redirect salvato:
https://mostra.space/api/commerce/connect/callback
Il solo prefisso live non certifica l'account della chiave di Vercel.

Preparato GET /api/commerce/preflight, accessibile soltanto agli Admin.
Usa l'autenticazione esistente getUser() e il ruolo letto da profiles;
non si fida di user_metadata. Legge commerce_settings e l'account
autenticato dalla chiave server tramite accounts.retrieveCurrent().
Non richiede pagamenti ON o approvazioni di attivazione e non modifica dati.

Risposta limitata a stripeAccountId, livemode, paymentsSwitchEnabled,
paymentsEnabled e configurationBlockers (nomi dei blocchi, senza valori
segreti). Cache disabilitata anche per errori; gli errori Stripe restano
generici. Non ritorna la chiave, l'oggetto Account completo o dati personali.

8 test della route con le vere funzioni di autorizzazione e adattatori
Supabase/Stripe simulati superati; TypeScript ed ESLint della route superati.
Il comando standard dei test commerce include ora anche questi test.
La build completa nel checkout G dell'utente e prevista dallo script di
salvataggio prima del commit. La route non e ancora rilasciata in produzione.

Dopo il futuro rilascio con pagamenti OFF, l'Admin potra verificare la chiave
gia presente in Vercel aprendo https://mostra.space/api/commerce/preflight.
L'account atteso dalla configurazione OAuth osservata e acct_1TZExpBAthEubFqR.
Una risposta 404 prima del deploy non indica un problema della chiave.
La comparsa di livemode=false o di un altro account richiede di fermarsi e
coordinare le credenziali condivise con billing; non sostituirle alla cieca.

Restano da autorizzare e completare la correzione SQL incrementale gia
preparata e il rilascio OFF. Il webhook Connect live dedicato va poi
configurato e verificato separatamente da quello degli abbonamenti.
Le verifiche commerciali/fiscali e l'attivazione dei pagamenti restano aperte.