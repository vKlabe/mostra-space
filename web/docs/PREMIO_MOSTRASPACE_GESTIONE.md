# Premio Mostra.Space 2026 — gestione dell’edizione

Pannello organizzatore: `/admin/premiomostraspace`. È riservato agli account con ruolo admin già previsto dal sito. L’assegnazione resta distinta dalla pubblicazione: puoi preparare i risultati prima della cerimonia senza renderli visibili.

## Preparazione

L’edizione viene creata in bozza. Completa organizzatore, giuria e regolamento definitivo prima di pubblicarla. La spunta di approvazione registra una verifica dell’organizzatore: non sostituisce l’inquadramento professionale dell’iniziativa già concordato.

Nel regolamento devono essere espliciti almeno: artisti ammessi; gratuità; una candidatura con una galleria personale; dichiarazione di paternità e disponibilità dei diritti; calendario italiano; criteri e pesi della giuria; tre vincitori distinti; conteggio dei follow; esclusioni e parità; ritiro; pubblicazione di opere e risultati; trattamento/conservazione dei dati; consegna e decorrenza dei benefici. Non è incluso un testo legale presentato come già approvato.

Le schede della giuria sono inserite dagli admin, indicando il nome del giurato. Non vengono creati nuovi account o inviate credenziali alla giuria. Definisci lo stesso gruppo di valutatori per tutti gli ammessi e usa sempre la stessa grafia dei nomi: una scheda con lo stesso nome aggiorna quella esistente.

Il calendario iniziale è quello concordato: apertura il 6 ottobre alle 18:00; candidature entro il 15 novembre alle 23:59; Social entro il 29 novembre alle 23:59; premiazione il 3 dicembre alle 19:00, Europe/Rome. Le chiusure nel database sono le 00:00 del giorno successivo, istante escluso. Calendario e regolamento diventano non modificabili dopo l’apertura; sospendere o nascondere l’edizione non consente di aggirare il blocco.

## Partecipazione e ammissioni

1. L’artista crea un account gratuito dalla pagina del premio o accede al proprio account. Il passaggio ad Artista / Gallerista riusa quello già presente nella piattaforma.
2. Durante l’apertura può iniziare una candidatura anche prima di avere una galleria pronta. Questa preparazione è privata.
3. Per inviare deve avere email verificata, profilo pubblico, ruolo Artista / Gallerista, una galleria propria pubblicata con almeno un’opera. Deve indicare nome d’artista, testo del progetto e accettare le dichiarazioni/regolamento. Gli admin non partecipano.
4. Il server conserva immagini e scheda della galleria. Attendere il completamento senza chiudere la pagina. Ogni invio crea una versione e rimette la candidatura in verifica.
5. In admin esamina opere, testi e dichiarazione dell’artista, quindi ammetti o escludi. Una motivazione di esclusione è obbligatoria ed è visibile all’artista.

Solo le candidature ammesse con galleria ancora pubblicata e profilo ancora pubblico appaiono nell’elenco pubblico, ordinato alfabeticamente e paginato. Il premio è assegnato alla persona indicata come artista; l’ammissione editoriale deve verificare che la galleria rappresenti le sue opere, non una collettiva di autori diversi.

Prima del termine delle candidature l’artista può reinviare anche scegliendo un’altra propria galleria pubblicata. Il collegamento personale resta stabile; si annullano le valutazioni della versione precedente e occorre una nuova ammissione. Una candidatura esclusa deve essere riaperta dall’admin prima di un nuovo invio. Il ritiro è disponibile fino alla chiusura Social; il reinvio dopo un ritiro è possibile soltanto entro la chiusura delle candidature.

Il link sull’identificativo account apre la relativa scheda nella pagina Utenti. Per lavorare su tutte le candidature usa l’esportazione CSV, che include anche gli identificativi necessari all’assegnazione; il pannello ne mostra trenta per pagina.

## Cosa viene conservato all’invio

L’archivio contiene titolo e descrizione della galleria, opere con testi e metadati, copie delle immagini disponibili, identificazione del template e dati di allestimento/coordinate. Le immagini vengono copiate nel bucket privato `premio-archives` e passano da un endpoint che verifica l’accesso. Si usano le immagini ottimizzate esistenti quando disponibili. Le copie non si aggiungono all’inventario dell’artista e richiedono storage dell’organizzatore.

La pagina «Opere e testi inviati» mostra la versione conservata. Prima dell’ammissione è accessibile solo ad artista e admin; dopo l’ammissione è pubblica. Le versioni precedenti restano nel database per l’audit e non vengono esposte al pubblico. Il download JSON admin contiene anche l’allestimento e le coordinate della versione corrente.

**Il collegamento «Visita la galleria» apre il viewer Unity esistente con la galleria attuale.** Questa consegna non crea un secondo viewer 3D dell’archivio. Per valutare opere e testi usa la copia inviata; per ricostruire l’allestimento inviato consulta la scheda JSON. Le modifiche successive alla galleria live non modificano la copia già conservata. Durante la valutazione dell’uso dello spazio confronta l’allestimento visitabile con la scheda conservata.

L’invio accetta immagini provenienti dai bucket pubblici dello stesso progetto Supabase. Sono gestite fino a 500 opere per invio e tre tentativi di archiviazione ogni quindici minuti. Se una copia fallisce, la candidatura non viene ammessa/inviata parzialmente e le copie provvisorie riuscite vengono rimosse. La cancellazione dell’account pulisce anche le copie premio, oltre al normale flusso esistente.

## Social: lo stesso Segui del sito

Il pulsante nella galleria esistente segue il profilo proprietario attraverso `account_follows`. Il premio riusa quel collegamento, coerentemente con una sola candidatura per artista. Non introduce voti, like, preferiti o iscrizioni separate.

- Contano anche i follower presenti prima del concorso.
- Ogni account conta una volta per artista. Può seguire più artisti.
- Il proprio account non conta. Occorre un account con email verificata prima del termine.
- Il follow deve essere attivo immediatamente prima della chiusura Social. Un follow iniziato alla chiusura o dopo non conta.
- Smettere di seguire e poi seguire di nuovo non moltiplica i voti. La cronologia conserva gli intervalli.
- Il job ogni cinque minuti fissa i conteggi dopo la chiusura. Gli unfollow successivi non cambiano il totale già fissato.

Il CSV di verifica contiene identificativi e intervalli dei follow degli artisti candidati, data di verifica email ed eventuale motivo di esclusione; non esporta indirizzi email dei sostenitori. Il collegamento sociale continua a funzionare dopo il concorso. Le notifiche seguono le preferenze e il consenso già gestiti dal sito: il premio non abilita automaticamente push o marketing.

L’email verificata non certifica che ogni account corrisponda a una persona diversa. Per anomalie accertate usa «Verifica follower e anomalie», inserendo ID account e motivazione. L’esclusione vale per il conteggio dell’intera edizione e non rimuove il follow. Prima dell’assegnazione puoi ripristinare un account motivando la decisione. Dopo la chiusura il sistema ricalcola i totali interessati; dopo l’assegnazione definitiva le esclusioni non sono più modificabili.

## Giuria e assegnazione

Ogni scheda usa punteggi interi da 0 a 100 e produce questo totale:

| Criterio | Peso |
|---|---:|
| Qualità delle opere | 30% |
| Concetto del progetto | 20% |
| Curatela | 20% |
| Testi | 15% |
| Uso dello spazio | 15% |

Il risultato principale è la media delle schede dell’artista. Il server richiede almeno una scheda per ogni ammesso; la verifica che tutti abbiano lo stesso gruppo completo di giurati resta a cura dell’organizzatore. I punteggi e le note di giuria non sono pubblici.

Dopo la chiusura Social:

1. Completa verifiche, ammissioni e schede di tutti gli artisti ancora ammessi. Escludi con motivazione chi non soddisfa più i requisiti.
2. Aggiorna scadenze e conteggi dal pannello e scarica i CSV per il verbale.
3. In «Assegnazione dei tre premi», indica l’ID candidatura dell’artista con media massima per Mostra.Space e l’ID della scelta di Vincenzo Bordoni per la Critica. Devono essere persone diverse. In caso di media massima uguale documenta la scelta tra gli ex aequo.
4. Inserisci una motivazione pubblica per ciascun premio. Il Social viene calcolato automaticamente tra gli altri ammessi: follower validi, media giuria, invio più antico, identificativo stabile.
5. Conferma l’assegnazione definitiva. Le tre attribuzioni e i tre benefici vengono registrati insieme. Una richiesta ripetuta non crea altri premi.

Servono tre artisti idonei e distinti. Il sistema non sceglie un vincitore alternativo arbitrario se mancano candidature o schede. L’assegnazione definitiva blocca modifiche ai risultati e alle valutazioni: controlla il verbale prima di confermare.

## Evento e pubblicazione dei vincitori

La pagina `/premiomostraspace/evento` presenta la premiazione e consente di scaricare il calendario. Inserisci il link effettivo della diretta quando disponibile. La pagina non avvia una diretta e non invia inviti o promemoria automaticamente.

Il 3 dicembre dalle 19:00 puoi premere «Pubblica i vincitori». La pubblicazione resta un’azione dell’admin per sincronizzarla con la rivelazione durante l’evento; non parte automaticamente allo scoccare dell’ora. Il server impedisce di pubblicare prima o senza tre premi assegnati.

Dopo la pubblicazione compaiono vincitori, motivazioni, badge sui profili e sulle gallerie vincitrici e benefici nel pannello dell’artista. Prima di questo passaggio le assegnazioni restano riservate agli admin.

## Erogazione dei piani

Il vincitore con piano Free può attivare il beneficio dal proprio pannello dopo la pubblicazione: Business per 12 mesi, Pro per 12 mesi o Pro per 6 mesi. I mesi decorrono dall’attivazione e sono mesi di calendario. Non viene richiesta una carta né creato un abbonamento Stripe con rinnovo automatico.

Il job di manutenzione riporta il piano al diritto sottostante alla scadenza, con cadenza massima ordinaria di cinque minuti. Un evento Stripe tardivo che tentasse un downgrade durante il premio non annulla il beneficio. Un piano pagato superiore rimane preservato. Durante un premio attivo un nuovo checkout dal sito viene indirizzato alla gestione Billing per evitare sovrapposizioni.

Per un vincitore che abbia già un piano a pagamento, il premio resta disponibile: l’app non cancella, sospende o modifica da sola il suo abbonamento Stripe. Concorda ed eroga il beneficio con Billing, verifica il risultato, poi usa «Registra consegna concordata» specificando trattamento e periodo. **Quel pulsante registra una consegna già effettuata; non applica coupon, crediti o mesi a Stripe.**

## Sospensione, manutenzione e assistenza

«Sospendi temporaneamente nuovi invii» ferma le nuove candidature senza cancellare quelle esistenti. Togliere la pubblicazione nasconde le pagine di candidatura ai visitatori; non elimina candidature, archivi o premi. Non usare questi controlli per cambiare il regolamento dopo l’apertura.

Il registro mostra le ultime cento operazioni; lo storico rimane nel database. Mantieni attivo `mostraspace-premio-maintenance` e controlla gli errori del job nel progetto Supabase. L’azione admin «Aggiorna scadenze e conteggi» può eseguire la stessa manutenzione in modo idempotente, ma non sostituisce il job periodico.

Non eliminare tabelle, trigger o il bucket per tornare a una versione precedente del sito: possono contenere candidature e piani premio attivi. Se occorre sospendere il lancio, lascia l’edizione in bozza o in pausa e conserva i dati. Le procedure di conservazione e cancellazione straordinaria vanno concordate con l’organizzatore prima dell’apertura.
