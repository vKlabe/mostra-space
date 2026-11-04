# Vendita opere: preparazione rilascio con pagamenti OFF

Aggiornato il 4 novembre 2026. Codice: 8e99c1a4a109e6792025daa4e8944a1b853d92b3.
PR #19 aperta e draft. Documento di preparazione: nessun deploy o SQL
di produzione eseguiti. Mantiene l'integrazione Connect OAuth e direct charges
gia collaudata; nessuna migrazione SDK/account inclusa.

## Evidenze e limiti

Build, sicurezza dipendenze e 38 test: resoconto del 23 ottobre.
Acquisti, rimborsi, consegna, indisponibilita opera venduta, declino e scadenza:
resoconti del 18 e 22 ottobre. Pay by Bank riuscito e fallimento recuperabile:
resoconto del 27 ottobre. EN/FR/ES confermate dall'utente il 28 ottobre.
Il fallimento asincrono dopo checkout completato e lo stato processing
prolungato non sono certificati end-to-end; considerarli prima di abilitare
metodi asincroni nel live. Non scambiare Fail test payment per quel collaudo.

Produzione letta il 28 ottobre: pagamenti OFF, revision=0, zero ordini.
Migrazione iniziale presente; correzione rimborsi ancora assente.
Account Stripe live letto: acct_1TZExpBAthEubFqR; dettagli nel preflight del 29 ottobre.
Client ID OAuth live fornito dall'utente il 29 ottobre. Redirect salvato confermato dallo screenshot; variabili Production dichiarate salvate dall'utente. Account della chiave server ancora da verificare dopo deploy OFF tramite /api/commerce/preflight.

## Configurazione da preparare

| Variabile | Valore o verifica |
| --- | --- |
| COMMERCE_FEE_BPS | 1000 |
| COMMERCE_FEE_BASE | artwork |
| COMMERCE_REFUND_APPLICATION_FEE | true |
| COMMERCE_COMMERCIAL_REVIEWED | false finche termini e fiscalita sono da completare |
| COMMERCE_ACTIVATION_APPROVED | false |
| NEXT_PUBLIC_SITE_URL | https://mostra.space |
| STRIPE_CONNECT_CLIENT_ID | ca_VQsJUi5454pVwmO2KIyGpBXXQNT4eGRz (fornito dall'utente; da salvare in Production) |
| STRIPE_CONNECT_WEBHOOK_SECRET | Segreto del nuovo endpoint Connect live |
| STRIPE_SECRET_KEY | Verificare chiave server esistente, ambiente e permessi; condivisa con billing |

Conservare il webhook e il segreto degli abbonamenti. Non sostituire chiavi
esistenti con chiavi sandbox o placeholder. Segreti soltanto sul server,
mai nel repository o nei resoconti.

La nota ARTWORK_COMMERCE_COMMERCIAL_2026-10-28.md descrive commissione,
proporzione dei rimborsi e verifiche ancora necessarie per termini e IVA.

## Stripe live: controlli e configurazione proposta

Verificare prima l'account principale della piattaforma in modalita live.
Per l'OAuth esistente verificare Standard OAuth e il redirect esatto:
https://mostra.space/api/commerce/connect/callback

Endpoint per eventi degli account collegati:
https://mostra.space/api/stripe/connect-webhook

Formato snapshot compatibile con l'handler attuale. Verificare versione API
compatibile con l'SDK gia collaudato, senza cambiare il webhook abbonamenti.
Eventi richiesti:
- checkout.session.completed
- checkout.session.async_payment_succeeded
- checkout.session.async_payment_failed
- checkout.session.expired
- refund.created
- refund.updated
- refund.failed
- charge.refunded
- account.updated
- account.application.deauthorized

Il webhook deve essere raggiungibile sul sito pubblico prima dell'invio
degli eventi. Separare il suo segreto da quello della CLI locale.

## Sequenza da sottoporre ad autorizzazione per la produzione

1. Completare le letture dell'account live e delle variabili del deployment.
2. Formalizzare termini commerciali e trattamento IVA/fatturazione.
3. Ricontrollare database OFF e applicare soltanto
   supabase/migrations/20261011143230_fix_commerce_refund_sync.sql.
   La transazione verifica OFF e hash della funzione originale:
   fdf6f98c1393fd70fdb4188025bf8d14.
   Non rieseguire artwork-commerce.sql o gli SQL storici.
4. Rilasciare il codice approvato mantenendo i due flag di attivazione OFF;
   configurare il webhook live quando la route e disponibile.
5. Controllare sito pubblico, configurazione e idoneita dei venditori reali.
6. Eventuale attivazione solo dopo autorizzazione esplicita separata.

Questa sequenza e preparata ma non eseguita. Collegare un account Stripe al
connettore per leggerlo non equivale ad attivare gli acquisti sul sito.
Aggiornamento operativo del 4 novembre: il preflight Admin legge l'account autenticato dalla chiave del server senza mostrarla. Vedere ARTWORK_COMMERCE_LIVE_PREFLIGHT_2026-10-29.md. La route deve essere rilasciata con flag e database OFF prima del controllo pubblico autenticato. Nessuna creazione di chiavi richiesta per questa verifica.
