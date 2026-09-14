# Premio Mostra.Space 2026 — installazione e collaudo

Questa modifica implementa la prima edizione del premio nel sito esistente. Il ramo di lavoro è `feature/premio-mostraspace`, basato sul main `f33b7f8` (aggiornamenti della pagina launch inclusi). Le email scritte durante la conversazione non fanno parte del progetto.

## Cosa comprende

- Pagina pubblica `/premiomostraspace`, con premi, partecipazione, candidature ammesse, ricerca e paginazione.
- Iscrizione dedicata `/premiomostraspace/iscriviti`: account gratuito, email/password oppure Google. Il sostenitore torna alla candidatura scelta; l’artista completa il normale passaggio gratuito ad Artista / Gallerista. Nessun nuovo account system.
- Pannello artista `/dashboard/premiomostraspace`: una candidatura, una galleria propria e pubblicata, invio e aggiornamento entro scadenza, ritiro e stato di ammissione.
- Pagina condivisibile `/premiomostraspace/2026/nome-artista-identificativo`. Il suffisso rende stabile e univoco il collegamento.
- Archivio delle opere e dei testi inviati, regolamento, pagina evento con file calendario, pagina vincitori e badge sui profili/gallerie vincitori.
- Pannello admin `/admin/premiomostraspace`: calendario, regolamento e giuria; ammissioni; schede di valutazione; esclusioni motivate di follower; esportazioni CSV; assegnazione e pubblicazione dei vincitori; consegna dei premi; registro operazioni.
- Testi pubblici in IT, EN, FR ed ES. La console admin mantiene l’italiano, come le altre sezioni admin del progetto. Il regolamento è un testo editoriale inserito dall’organizzatore: non viene tradotto automaticamente.
- Canonical e sitemap per le pagine pubbliche; `noindex` per iscrizione, archivio tecnico e aree private. La bozza del regolamento non viene esposta ai visitatori.

### I tre premi

| Premio | Vincitore | Beneficio |
|---|---|---|
| Mostra.Space | Artista con media di giuria più alta | Business per 12 mesi |
| Critica | Scelta di Vincenzo Bordoni fra gli altri artisti ammessi | Pro per 12 mesi |
| Social | Primo artista restante per follower validi alla scadenza | Pro per 6 mesi |

I tre artisti sono distinti; i premi non si sommano. Parità Social: media della giuria, poi invio più antico, poi identificativo stabile. Per il principale, in caso di media massima uguale, l’admin registra la decisione fra gli ex aequo e la motivazione. La giuria usa opere 30%, concetto 20%, curatela 20%, testi 15%, uso dello spazio 15%. Almeno una scheda per ogni ammesso è necessaria; l’organizzatore deve assicurare che ogni candidato sia valutato dallo stesso gruppo di giurati secondo il regolamento.

### Calendario italiano

| Fase | Europe/Rome |
|---|---|
| Preparazione comunicazione | 28 settembre–5 ottobre 2026 |
| Apertura candidature | 6 ottobre 2026, 18:00 |
| Ultimo minuto utile per candidarsi | 15 novembre 2026, 23:59 |
| Verifiche finali ammissione | 16–18 novembre |
| Campagna Social finale | 19–29 novembre |
| Ultimo minuto utile per il Social | 29 novembre 2026, 23:59 |
| Valutazioni e assegnazione | 30 novembre–2 dicembre |
| Rivelazione dei vincitori | 3 dicembre 2026, 19:00 |

Le chiusure tecniche sono le 00:00 del giorno successivo, istante escluso. Il database conserva UTC e il sito mostra Europe/Rome, tenendo conto del cambio d’ora. Teaser e campagne sono un calendario operativo: il codice non invia automaticamente email, messaggi o campagne promozionali.

## 1. Applica la patch sul PC

Ferma il server locale con Ctrl+C. Estrai l’intero ZIP, per esempio in `G:\Users\User\PremioMostraSpace`. Nel pacchetto `APPLICA_PREMIO.ps1` contiene i controlli e i comandi per applicare la patch una volta sola. Puoi aprirlo e incollarne il contenuto in PowerShell; non occorre modificare le impostazioni di sicurezza di Windows.

Il procedimento manuale equivalente, dalla radice del repository:

```powershell
cd G:\Users\User\ArtPortalImmersivo

git status --short
# Se ci sono modifiche tracciate, salvale prima. I vecchi file .patch non tracciati possono restare.
git switch main
if ($LASTEXITCODE -ne 0) { throw "Cambio branch non riuscito" }
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw "Aggiornamento main non riuscito" }
git switch -c feature/premio-mostraspace
if ($LASTEXITCODE -ne 0) { throw "Branch già presente o creazione non riuscita: non riapplicare la patch" }

$premioPatch = "G:\Users\User\PremioMostraSpace\MOSTRASPACE_PREMIO_2026.patch"
git apply --check --directory=web $premioPatch
if ($LASTEXITCODE -ne 0) { throw "Patch non compatibile: fermati e conserva l'output" }
git apply --directory=web $premioPatch
if ($LASTEXITCODE -ne 0) { throw "Applicazione patch non riuscita" }
git diff --check
```

Se il branch esiste già, non cancellarlo: controlla lo stato e non ripetere l’applicazione. Il pacchetto include `FILE_MODIFICATI.txt` con tutti e soli i percorsi interessati. Non aggiungere ZIP, patch o file `.env` al commit.

## 2. Database: tre migrazioni, nell’ordine

Usa inizialmente un database Supabase di sviluppo/staging con lo schema del progetto. Non usare dati, date accelerate o candidature fittizie in produzione. Le prove PostgreSQL incluse al punto 4 sono indipendenti e non richiedono un database Supabase.

La patch porta le migrazioni in `web/supabase/migrations`. Nel pacchetto ZIP sono anche nella cartella `SQL`, per aprirle facilmente. Nel SQL Editor del progetto Supabase scelto esegui un file completo alla volta:

1. `20260913000000_add_premio_mostraspace.sql`
2. `20260913000100_add_premio_admin_actions.sql`
3. `20260913000200_schedule_premio_maintenance.sql`

Se un file restituisce un errore, fermati su quello: non proseguire con il successivo. I primi due sono transazionali. La terza migrazione attiva il job `pg_cron`; se l’estensione non è disponibile/abilitata nel progetto, abilitala prima di eseguire la terza. Non togliere il job: serve per scadenza dei premi e fissazione dei conteggi.

Controlli nel SQL Editor:

```sql
select year, published, rules_approved, applications_open_at, applications_close_at,
       social_close_at, ceremony_at
from public.premio_editions where year = 2026;

select id, public, file_size_limit from storage.buckets where id = 'premio-archives';

select jobname, schedule, active from cron.job
where jobname = 'mostraspace-premio-maintenance';
```

Atteso: edizione 2026 in bozza (`published=false`, `rules_approved=false`); bucket privato (`public=false`); job attivo ogni cinque minuti. Le tabelle premio non hanno accesso diretto dai client anonimi o autenticati. Le operazioni passano dalle API con controllo dell’account; il service role rimane solo sul server.

Il progetto usa già queste variabili, che devono essere presenti anche in Preview e Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Non condividere i valori in chat o nel repository. Non sono state aggiunte nuove credenziali. Per iscrizione e Google, conserva la configurazione Supabase Auth esistente e verifica che il callback `/auth/callback` sia ammesso per il dominio locale/Preview che usi. Il percorso `next` è validato come interno al sito.

## 3. Build, avvio e configurazione

```powershell
cd G:\Users\User\ArtPortalImmersivo\web

npm run i18n:check
if ($LASTEXITCODE -ne 0) { throw "Controllo lingue fallito" }
npm run pwa:check
if ($LASTEXITCODE -ne 0) { throw "Controllo PWA fallito" }

npx eslint app/premiomostraspace app/dashboard/premiomostraspace app/admin/premiomostraspace app/api/premio app/api/admin/premio components/premio lib/premio
if ($LASTEXITCODE -ne 0) { throw "ESLint fallito" }

npm run build
if ($LASTEXITCODE -ne 0) { throw "Build fallita: non avviare npm start" }
npm run start
```

### Configura senza aprire le candidature

Con il server avviato, entra come admin e apri `/admin/premiomostraspace`. Troverai l’edizione in bozza, con il calendario già impostato.

Inserisci titolo, organizzatore effettivo, giuria e regolamento definitivo. Inserisci il link della diretta quando disponibile. Le date nella console sono ISO con fuso esplicito; accanto compare la conversione in Europe/Rome. Esempio: `2026-10-06T18:00:00+02:00`.

Come concordato, la pubblicazione richiede il regolamento e l’inquadramento dell’iniziativa verificati dall’organizzatore. Il software non certifica tale verifica. La bozza nasce volutamente senza testo legale approvato e non è pubblicabile con campi mancanti.

Il regolamento deve riflettere i criteri effettivi sopra descritti, compresi follower già presenti, verifica degli account, criteri di esclusione, parità, diritti sulle immagini, gestione dei dati, ritiro e tempi di consegna dei premi. Vedi anche `PREMIO_MOSTRASPACE_GESTIONE.md`.

**Non cambiare le date in produzione per provare il concorso.** In staging puoi impostare scadenze adatte alle prove prima di pubblicare l’edizione. Dopo l’apertura, calendario e regolamento si bloccano per tutelare le candidature già inviate; togliere la pubblicazione non sblocca le date.

## 4. Prove del premio

Apri una seconda finestra PowerShell mentre il server resta avviato. I test PostgreSQL sono in un pacchetto separato: non aggiungono dipendenze all’app e non contattano Supabase.

```powershell
cd G:\Users\User\ArtPortalImmersivo\web
npm ci --prefix tests/premio
if ($LASTEXITCODE -ne 0) { throw "Installazione test fallita" }
npm test --prefix tests/premio
```

Atteso: `26 Premio PostgreSQL integration checks passed`.

### Prova nel browser, prima del rilascio

Usa staging per il ciclo completo e due account distinti, uno artista e uno sostenitore. Il browser remoto del laboratorio non può raggiungere il localhost di questo ambiente: il controllo visivo desktop/telefono e il ciclo Auth/Storage su Supabase reale vanno completati qui.

1. Apri `/premiomostraspace` in finestra privata e verifica menu, premi, FAQ, date e lingue IT/EN/FR/ES, anche a circa 390 px di larghezza.
2. Apri `/premiomostraspace/iscriviti`; prova email e Google con i normali account di collaudo. La conferma email deve tornare al percorso del premio. Se l’account è già autenticato, passa direttamente alla candidatura.
3. Completa il passaggio gratuito ad Artista / Gallerista. Il requisito esistente di completamento account Google resta attivo.
4. Dal pannello del premio apri la candidatura. Seleziona una galleria propria pubblicata, con almeno un’opera e con profilo pubblico. Le gallerie altrui o draft non devono essere selezionabili né accettate dal server.
5. Invia. Attendi il completamento dell’archiviazione; poi controlla il messaggio e lo stato “in attesa di verifica”. Apri le opere inviate. Un altro utente non deve accedere a questa anteprima.
6. Admin: apri la candidatura, esamina l’archivio e ammettila. Ora la pagina compare nella lista pubblica. Verifica link alla galleria, profilo, condivisione e WhatsApp.
7. Dal secondo account premi “Segui e sostieni”. In galleria/profilo deve risultare lo stesso follow. I preferiti non devono cambiare. Le push non si attivano senza il consenso già previsto dal sito.
8. Modifica un testo della galleria: l’archivio inviato deve restare invariato. Reinvia prima del termine: nuova versione, ritorno in verifica, vecchie schede di giuria azzerate. Le versioni precedenti restano conservate per l’audit.
9. Admin: verifica esportazioni CSV, scheda JSON dell’allestimento, esclusioni motivate e schede di valutazione. Non finalizzare risultati fittizi sul database di produzione.
10. Controlla una normale galleria, un profilo, Account, campanella e chat. Il viewer Unity deve comportarsi come prima.

## 5. Commit, Preview e produzione

Dopo i controlli locali, dalla radice del repository prepara il commit usando l’elenco del pacchetto:

```powershell
cd G:\Users\User\ArtPortalImmersivo
$premioFiles = Get-Content "G:\Users\User\PremioMostraSpace\FILE_MODIFICATI.txt"
git --literal-pathspecs add -- $premioFiles
if ($LASTEXITCODE -ne 0) { throw "Staging fallito" }
git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw "Controllo commit fallito" }
git diff --cached --stat
```

Controlla che siano inclusi solo i file del premio e le piccole integrazioni descritte. Poi:

```powershell
git commit -m "feat: add Premio Mostra.Space 2026"
if ($LASTEXITCODE -ne 0) { throw "Commit fallito" }
git push -u origin feature/premio-mostraspace
if ($LASTEXITCODE -ne 0) { throw "Push fallito" }
```

Crea la PR verso main dal branch `feature/premio-mostraspace`. Puoi usare `PR_DESCRIPTION.md` nel pacchetto. Aspetta Preview Ready e controlli verdi; ripeti la prova sul dominio Preview con il suo database e callback Auth corretti.

Prima del merge, esegui in produzione le tre migrazioni già collaudate e verifica bucket privato e job attivo. L’edizione resta in bozza: le migrazioni non aprono le candidature. Dopo la Preview validata, effettua merge e attendi Production Ready. Configura e pubblica l’edizione dall’admin secondo il calendario concordato; l’invio si apre automaticamente all’orario previsto, non prima.

## 6. Riallinea il PC dopo merge e Production Ready

```powershell
cd G:\Users\User\ArtPortalImmersivo
git switch main
if ($LASTEXITCODE -ne 0) { throw "Cambio branch fallito" }
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw "Aggiornamento fallito" }
git fetch --prune origin
git branch --show-current
git diff --stat
git diff --cached --stat
git branch -d feature/premio-mostraspace
```

Il ramo deve essere main e i due diff vuoti. Se `branch -d` rifiuta la cancellazione dopo uno squash, conserva il messaggio e non forzare la cancellazione. Non occorre eliminare le vecchie patch per avere il codice allineato.

## Ambito delle modifiche

PWA, service worker, manifest, push, chat, badge notifiche, viewer e build Unity rimangono invariati. Le integrazioni toccano menu, ritorno al premio dopo login/upgrade, SEO, badge vincitore, pulizia delle immagini archiviate alla cancellazione dell’account e protezione dai checkout sovrapposti. Il webhook Stripe non cambia.

Sono incluse piccole correzioni necessarie ai controlli sui file interessati: fallback traduzione coerente nell’inventario opere, ripristino della preferenza sidebar in un task browser annullabile e Link di Next per il ritorno all’elenco gallerie dal profilo. Sono completate nelle quattro lingue anche nove chiavi mancanti nell’ultimo aggiornamento di main della pagina launch; il suo contenuto rimane quello pubblicato. L’ancora nella pagina Utenti permette di aprire l’account dalla candidatura. I dati o contenuti delle email estranee alla richiesta non sono inclusi.
