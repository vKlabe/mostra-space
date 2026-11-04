# MOSTRA.SPACE - ambiente commerce locale, 14 ottobre 2026

Verifica eseguita: 2026-10-14T21:19:55Z. Branch feature/artwork-commerce-payments-off; HEAD d5854a7dd9c6a4d5db9d1d2fe8ae1e359091d69f.

## Eseguito sul PC
- Supabase CLI 2.120.0; progetto Docker mostra-space-commerce-local.
- Controllate le porte pubblicate: solo 127.0.0.1 / ::1.
- Schema public esportato senza dati; SHA-256: 4BB8DFEF3B02FE35B77A50AE072A79B140781BAC487F82C8C418B9B288C5A56E.
- Ripristinate 65 tabelle in una transazione, su database locale inizialmente vuoto.
- Normalizzati i privilegi predefiniti locali prima del ripristino degli ACL del dump.
- Ripristinato il trigger auth.users -> public.handle_new_user verificato in produzione.
- Inserita soltanto la configurazione locale Pagamenti OFF, revisione 0.
- Verificate 8 tabelle commerce con RLS e nessuna policy; accesso anon/authenticated negato alle tabelle e alla RPC; RPC service_role consentita.
- Fingerprint commerce_command prima della correzione: fdf6f98c1393fd70fdb4188025bf8d14.
- Applicata SOLO LOCALMENTE 20261011143230_fix_commerce_refund_sync.sql, tramite psql.
- SHA-256 del file correttivo: EE952224CA8E1737FDC74413D62DE587F8174660384B94A3D7AF3B411A9000CD.
- Fingerprint della funzione corretta: 888929faa7e7bbdf02585f3255e5658a.
- Verificati refund_revision presente, utenti auth 0, ordini 0, rimborsi 0, Pagamenti OFF.
- Non e stata popolata la cronologia migrazioni della CLI: non usare db push/reset per ripetere questo bootstrap.
- Nessuna connessione dello script al progetto remoto; nessun dato di produzione importato.

## Produzione (lettura diretta del 14 ottobre, precedente a questa esecuzione)
- Pagamenti OFF, revisione 0, ordini 0, rimborsi 0.
- 20261008220511_add_artwork_commerce_payments_off gia applicata: NON rieseguire.
- 20261011143230_fix_commerce_refund_sync NON applicata in produzione.
- La correzione locale non modifica lo stato di produzione.

## Restano da completare
- Collegare il sito locale a questo Supabase, preservando .env.local e i blocchi di attivazione.
- Creare solo utenti/opere di prova e verificare Auth, interfacce IT/EN/FR/ES e comportamento OFF.
- Configurare credenziali del sandbox Stripe Commerce Test e inoltro webhook locale.
- Eseguire test Stripe Connect end-to-end, browser e regressioni abbonamenti.
- Verificare rotazione chiave TEST/Preview e condizioni commerciali; analizzare vulnerabilita npm.
- Salvare script e riepilogo con commit e push sul branch dedicato; aggiornare PR #19.
- Nessun merge, deploy commerce o acquisto reale autorizzato. Pagamenti restano OFF.

## Verifica preventiva dello script
- Sintassi PowerShell e impronte dei file verificate prima della consegna.
- Quattro controlli superati in PGlite temporaneo con pgcrypto: ripristino dello schema/ACL, applicazione della correzione, accessi anon/authenticated negati, rifiuto della ripetizione su database non vuoto.
- Questa prova usa una struttura Auth minima: non costituisce un test di GoTrue, del browser o di Stripe.
- I precedenti 23 test commerce e 7 test PostgreSQL concorrenti non sono stati rieseguiti durante questo bootstrap.

## Risultato JSON locale
    {"orders": 0, "refunds": 0, "anon_rpc": false, "database": "postgres", "auth_users": 0, "auth_trigger": true, "function_md5": "888929faa7e7bbdf02585f3255e5658a", "public_tables": 65, "payments_enabled": false, "postgres_version": "17.11", "service_role_rpc": true, "authenticated_rpc": false, "settings_revision": 0, "commerce_rls_tables": 8, "refund_revision_present": true}
## Collegamento locale del sito e verifica API
- Esecuzione: 2026-10-15T06:57:14Z.
- Configurato .env.local per http://127.0.0.1:54321 con le variabili richieste dal codice esistente.
- Credenziali locali recuperate dalla CLI 2.120.0 senza stamparle; .env.local e backup esclusi da Git.
- Contenuto preesistente del file preservato; COMMERCE_ACTIVATION_APPROVED=false e COMMERCE_COMMERCIAL_REVIEWED=false.
- Verifiche HTTP reali locali: Auth 200, profili con chiave pubblica 200, impostazioni commerce con service_role 200.
- API ordini riconosce refund_revision; ordini e rimborsi ancora vuoti.
- Accesso anonimo alle impostazioni commerce negato: HTTP 401, codice SQL 42501.
- La prima esecuzione si era fermata prima di modificare .env.local sul controllo del codice anonimo; la lettura dei corpi HTTP ora usa HttpClient, mantenendo il requisito 42501.
- Pagamenti database OFF, revisione 0. Nessuna scrittura al database in questo passaggio.
- Avvio Next.js, utenti di prova, browser, callback Auth localhost e test Stripe Connect ancora da completare.
- Nessun commit/push automatico; nessun merge o deploy.
