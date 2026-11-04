# Commissione vendita opere: scelta progettuale del 28 ottobre 2026

L'utente conferma il mantenimento del 10% e della restituzione proporzionale,
subordinandoli alla liceita. La verifica delle fonti consente di mantenere
questo modello in via generale; non costituisce un parere legale sul caso
completo ne una certificazione fiscale o autorizzazione all'attivazione live.

## Parametri da conservare nella preparazione

COMMERCE_FEE_BPS=1000
COMMERCE_FEE_BASE=artwork
COMMERCE_REFUND_APPLICATION_FEE=true

La commissione e a carico del venditore, sul prezzo dell'opera registrato
nell'ordine, spedizione esclusa. Non e un costo da sottrarre al rimborso
legalmente dovuto al consumatore.

Per i rimborsi emessi dall'app, Stripe restituisce al venditore la commissione
intera in caso di rimborso totale, proporzionale in caso di rimborso parziale.
La proporzione Stripe usa l'importo rimborsato rispetto al pagamento originario
complessivo, anche se la commissione originaria e calcolata sulla sola opera.
I rimborsi dalla Dashboard Stripe richiedono la relativa opzione oppure un
rimborso separato della application fee: non presumere che sia automatico.

Esempio senza spedizione: opera 100 EUR, commissione 10 EUR;
rimborso all'acquirente 50 EUR, commissione restituita al venditore 5 EUR.
Le commissioni di elaborazione Stripe sono separate e, con tariffe standard,
quelle originarie normalmente non vengono restituite.

## Condizioni da formalizzare prima del live

- Termini chiari e accettati dai venditori: aliquota, base di calcolo,
  rimborsi, costi Stripe e responsabilita delle parti.
- Nel recesso del consumatore applicabile, niente trattenuta del 10%
  dal rimborso dovuto; considerare anche la consegna standard e gli altri
  diritti previsti dal Codice del consumo, senza limitazioni contrattuali.
- Verifica con legale dei termini e con commercialista di IVA e fatturazione.
  Non e ancora deciso se il 10% sia fiscalmente comprensivo di IVA oppure
  da integrare: il codice attuale trattiene esattamente il 10%, senza
  aggiungere automaticamente IVA sulla commissione.
- COMMERCE_COMMERCIAL_REVIEWED e COMMERCE_ACTIVATION_APPROVED non vengono
  impostati a true con questa nota. Nessuna modifica a produzione.

## Fonti ufficiali consultate il 28 ottobre 2026

- Codice civile, art. 1322, testo del portale del Dipartimento della
  Giustizia Tributaria: autonomia contrattuale nei limiti di legge.
- Codice del consumo, art. 56, stesso portale: rimborso in caso di recesso.
- Regolamento UE 2019/1150, art. 3: chiarezza e accessibilita dei termini.
  https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32019R1150
- Stripe, rimborsi delle application fee negli addebiti diretti:
  https://docs.stripe.com/connect/saas/tasks/refunds-disputes
- Stripe, tariffe e trattamento dei rimborsi:
  https://stripe.com/it/pricing

Il resoconto dei test e delle lingue e stato salvato dall'utente nel commit
8e99c1a4a109e6792025daa4e8944a1b853d92b3. Questa nota registra la scelta
successiva senza modificare il resoconto storico dei test.