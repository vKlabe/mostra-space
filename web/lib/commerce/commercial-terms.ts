// Versioned text: keep published versions unchanged; publish a new slug for revisions.
export const artworkCommercialTerms = {
  slug: 'vendita-opere-2026-11-05',
  version: '2026-11-05',
  title: 'Vendita e acquisto di opere',
  description: 'Ruoli, commissioni, pagamenti, spedizioni, resi e fatturazione delle opere su Mostra.space.',
  updatedAt: '5 novembre 2026',
  sections: [
    { title: '1. Gestore e ambito', paragraphs: [
      'Mostra.space è gestita da Barattolo XR Lab, P. IVA 14040331002. Sede fiscale: Via Giacomo Corradi 12, 00151 Roma (RM), Italia. Assistenza: support@mostra.space. Fatturazione: billing@mostra.space.',
      'Queste condizioni riguardano la compravendita di opere fisiche e il servizio di intermediazione. I piani di abbonamento restano disciplinati dalle rispettive condizioni. Il venditore indicato nelle condizioni di ciascuna offerta è la controparte dell’acquirente per la vendita dell’opera; Mostra.space fornisce il servizio digitale e assiste nella gestione dei pagamenti, senza diventare proprietaria dell’opera. Restano ferme le responsabilità che la legge attribuisce alla piattaforma.',
    ] },
    { title: '2. Informazioni e obblighi del venditore', paragraphs: [
      'Prima di abilitare un’offerta, il venditore deve pubblicare all’URL delle proprie condizioni la sua identità, la qualifica di professionista o privato, i recapiti e l’indirizzo per reclami e resi, gli eventuali dati fiscali, le caratteristiche e lo stato dell’opera, il prezzo finale, i costi e i tempi di consegna, le garanzie applicabili e le modalità di recesso e rimborso. La qualifica dichiarata deve corrispondere all’attività effettivamente svolta.',
      'Il venditore deve avere titolo a vendere l’opera, fornire informazioni veritiere su autenticità e provenienza e rispettare le eventuali regole su esportazione e beni culturali. È responsabile dell’imballaggio, della consegna e degli adempimenti relativi alla vendita. Prima di spedire deve verificare che il pagamento risulti completato.',
      'Il venditore deve fornire all’acquirente una conferma del contratto e delle condizioni applicabili su supporto durevole, per esempio tramite email, entro i termini di legge. La sola presenza di un link modificabile non sostituisce tale conferma.',
    ] },
    { title: '3. Commissione di Mostra.space', paragraphs: [
      'Il venditore riconosce a Mostra.space una commissione del 10% del prezzo finale dell’opera. La spedizione è esclusa dalla base di calcolo. L’importo è arrotondato al centesimo secondo il calcolo mostrato nel pagamento e trattenuto tramite Stripe Connect. Nessuna commissione aggiuntiva di Mostra.space viene addebitata all’acquirente.',
      'Esempio: opera a 100 euro e spedizione a 10 euro; l’acquirente paga 110 euro, la commissione di Mostra.space è 10 euro. Al venditore restano 100 euro prima degli eventuali costi Stripe. Le commissioni di pagamento e gli eventuali costi di contestazione di Stripe sono separati e dipendono dal contratto del venditore con Stripe.',
      'Per le operazioni nazionali, Barattolo XR Lab applica il regime forfettario senza addebito dell’IVA in rivalsa ai sensi della legge 190/2014. Il 10% è l’importo complessivo della commissione trattenuta dalla piattaforma. Il trattamento di operazioni transfrontaliere e gli ulteriori adempimenti fiscali sono gestiti con il commercialista.',
    ] },
    { title: '4. Pagamento e disponibilità', paragraphs: [
      'I pagamenti sono elaborati da Stripe sul conto collegato del venditore. Tempi di accredito, verifiche di identità e disponibilità dei fondi dipendono da Stripe e dal metodo di pagamento. Un pagamento in elaborazione non equivale a un pagamento completato.',
      'Prima di pagare, l’acquirente deve controllare l’opera, il prezzo totale comprensivo della spedizione, il paese di consegna e le condizioni del venditore. Un tentativo fallito non autorizza ad avviare pagamenti duplicati: lo stato dell’ordine può essere verificato nella pagina degli acquisti.',
    ] },
    { title: '5. Recesso, resi e garanzie', paragraphs: [
      'Quando il venditore opera come professionista e l’acquirente come consumatore, si applicano le tutele inderogabili del Codice del consumo, incluse le informazioni precontrattuali, la garanzia legale e, salvo le eccezioni previste dalla legge, il diritto di recesso entro 14 giorni dalla consegna. Il solo fatto che un’opera sia originale o unica non la rende automaticamente un bene personalizzato escluso dal recesso.',
      'Il venditore deve indicare come comunicare il recesso e dove restituire l’opera, fornire il modulo previsto dalla legge e precisare prima dell’acquisto gli eventuali costi diretti di restituzione a carico del consumatore. Il rimborso dovuto comprende i costi della consegna standard nei casi previsti dalla legge; l’eventuale differenza per una consegna più costosa scelta dall’acquirente segue la disciplina applicabile.',
      'Per una vendita tra privati non si applicano automaticamente il recesso e la garanzia legale previsti per i rapporti tra professionista e consumatore; restano applicabili le garanzie e i rimedi previsti dal diritto civile e gli impegni assunti dal venditore. Nessuna dichiarazione o casella di accettazione limita diritti inderogabili.',
      'Per una richiesta di reso o un problema con l’opera, l’acquirente contatta il venditore ai recapiti indicati nelle sue condizioni. Può inoltre scrivere a support@mostra.space indicando il numero d’ordine per ricevere assistenza dalla piattaforma.',
    ] },
    { title: '6. Restituzione della commissione', paragraphs: [
      'Per i rimborsi eseguiti tramite Mostra.space, la commissione viene restituita al venditore in proporzione all’importo del pagamento rimborsato, secondo il meccanismo di Stripe. La proporzione è calcolata sul pagamento originario totale, che comprende la spedizione. Con rimborso integrale viene restituita l’intera commissione.',
      'Nell’esempio di un pagamento di 110 euro con commissione di 10 euro, un rimborso di 55 euro restituisce al venditore 5 euro di commissione. Gli arrotondamenti sono quelli applicati da Stripe. Chi esegue un rimborso direttamente dalla Dashboard Stripe deve verificare anche la restituzione della commissione della piattaforma e contattare l’assistenza se occorre riconciliarla.',
      'La commissione della piattaforma e gli eventuali costi Stripe non vengono sottratti agli importi che devono essere restituiti all’acquirente per legge. I costi Stripe dell’operazione originaria possono non essere restituiti al venditore. Un rimborso richiesto può restare in attesa o fallire: il venditore resta tenuto a gestire quanto dovuto e verificare l’esito.',
    ] },
    { title: '7. Fatturazione e dati fiscali', paragraphs: [
      'La vendita dell’opera e il servizio della piattaforma sono operazioni distinte. Il venditore cura la documentazione fiscale della vendita secondo il proprio regime. Barattolo XR Lab cura tramite il proprio commercialista la fatturazione delle commissioni e le eventuali rettifiche relative ai rimborsi.',
      'Il venditore fornisce i dati di fatturazione corretti e aggiornati a billing@mostra.space: nome o denominazione, indirizzo fiscale, codice fiscale o partita IVA e, se pertinenti, codice destinatario o PEC e paese fiscale. La ricevuta del pagamento Stripe non sostituisce automaticamente una fattura fiscale né implica che il documento sia stato trasmesso allo SdI.',
      'Le informazioni relative agli ordini, ai pagamenti e all’accettazione delle condizioni sono trattate per eseguire e documentare il rapporto contrattuale e adempiere agli obblighi applicabili, secondo l’informativa privacy della piattaforma. I dati necessari per obblighi fiscali, contabili o di comunicazione devono essere forniti e conservati nei termini di legge.',
    ] },
    { title: '8. Accettazione e modifiche', paragraphs: [
      'Il venditore accetta espressamente queste condizioni, inclusi commissione e rimborsi, prima di collegare Stripe e abilitare nuove offerte. La piattaforma registra l’account, la data, la versione del testo e i parametri economici accettati. L’accettazione non riguarda finalità promozionali.',
      'Una nuova versione o una modifica dei parametri economici richiede una nuova accettazione prima di nuove vendite. Gli ordini già conclusi conservano le condizioni e gli importi applicabili al momento dell’acquisto. Eventuali sospensioni dei nuovi pagamenti non cancellano gli obblighi relativi a ordini, resi e rimborsi già esistenti.',
    ] },
  ],
} as const;
export const ARTWORK_TERMS_URL = '/legal/' + artworkCommercialTerms.slug;
