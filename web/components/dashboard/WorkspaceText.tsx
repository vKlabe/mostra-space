"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Locale } from "@/lib/i18n/dictionaries";

const labels = {
  home: {
    it: "Home", en: "Home", fr: "Accueil", es: "Inicio",
  },
  workspace: {
    it: "Il tuo lavoro", en: "Your workspace", fr: "Votre espace de travail", es: "Tu espacio de trabajo",
  },
  connections: {
    it: "Community e attività", en: "Community and activity", fr: "Communauté et activité", es: "Comunidad y actividad",
  },
  account: {
    it: "Account e assistenza", en: "Account and help", fr: "Compte et assistance", es: "Cuenta y ayuda",
  },
  nextAction: {
    it: "Prossima azione", en: "Next action", fr: "Prochaine action", es: "Próxima acción",
  },
  startGallery: {
    it: "Crea la tua prima galleria", en: "Create your first gallery", fr: "Créez votre première galerie", es: "Crea tu primera galería",
  },
  startGalleryDetail: {
    it: "Puoi iniziare dallo spazio espositivo oppure caricare le opere. Le collegherai alla mostra prima di allestirla in 3D.",
    en: "Start with the exhibition space or upload your artwork first. You'll add the works to the exhibition before arranging them in 3D.",
    fr: "Commencez par l’espace d’exposition ou importez d’abord vos œuvres. Vous les ajouterez à l’exposition avant la mise en place en 3D.",
    es: "Empieza por el espacio expositivo o sube primero tus obras. Las añadirás a la exposición antes de organizarlas en 3D.",
  },
  firstWorks: {
    it: "Carica le prime opere", en: "Upload your first works", fr: "Importez vos premières œuvres", es: "Sube tus primeras obras",
  },
  firstWorksDetail: {
    it: "La galleria è pronta. Carica le opere nella tua libreria, poi aggiungile alla galleria.",
    en: "Your gallery is ready. Upload works to your library, then add them to the gallery.",
    fr: "Votre galerie est prête. Importez les œuvres dans votre bibliothèque, puis ajoutez-les à la galerie.",
    es: "Tu galería está lista. Sube las obras a tu biblioteca y luego añádelas a la galería.",
  },
  resumeDraft: {
    it: "Riprendi la bozza", en: "Resume the draft", fr: "Reprenez le brouillon", es: "Retoma el borrador",
  },
  resumeDraftDetail: {
    it: "Controlla la copertina, aggiungi le opere e posizionale in 3D. L’elenco di pubblicazione mostra cosa manca.",
    en: "Check the cover, add works, and position them in 3D. The publishing checklist shows what's missing.",
    fr: "Vérifiez la couverture, ajoutez les œuvres et placez-les en 3D. La liste de publication indique ce qui manque.",
    es: "Revisa la portada, añade obras y colócalas en 3D. La lista de publicación indica lo que falta.",
  },
  galleryLive: {
    it: "La tua galleria è online", en: "Your gallery is live", fr: "Votre galerie est en ligne", es: "Tu galería está en línea",
  },
  galleryLiveDetail: {
    it: "Rivedi la pagina pubblica, rispondi alle richieste ricevute o prepara il prossimo evento.",
    en: "Review the public page, respond to enquiries, or prepare the next event.",
    fr: "Consultez la page publique, répondez aux demandes ou préparez votre prochain événement.",
    es: "Revisa la página pública, responde a consultas o prepara el próximo evento.",
  },
  galleryTools: {
    it: "Catalogo e altri strumenti", en: "Catalogue and other tools", fr: "Catalogue et autres outils", es: "Catálogo y otras herramientas",
  },
  shareGallery: {
    it: "Condividi galleria", en: "Share gallery", fr: "Partager la galerie", es: "Compartir galería",
  },
  sharePublicLink: {
    it: "Link pubblico della galleria", en: "Public gallery link", fr: "Lien public de la galerie", es: "Enlace público de la galería",
  },
  shareViewerLink: {
    it: "Link alla visita 3D", en: "Link to the 3D visit", fr: "Lien vers la visite 3D", es: "Enlace a la visita 3D",
  },
  shareEmbed: {
    it: "Codice di incorporamento", en: "Embed code", fr: "Code d’intégration", es: "Código de inserción",
  },
  sharePublicDetail: {
    it: "Apre la pagina completa della mostra.", en: "Opens the full exhibition page.", fr: "Ouvre la page complète de l’exposition.", es: "Abre la página completa de la exposición.",
  },
  shareViewerDetail: {
    it: "Salta alla sezione 3D della pagina pubblica.", en: "Jumps to the 3D section of the public page.", fr: "Accède à la section 3D de la page publique.", es: "Va a la sección 3D de la página pública.",
  },
  shareEmbedDetail: {
    it: "Incolla il codice in un blocco HTML del tuo sito. La visualizzazione dipende dalle impostazioni di sicurezza del sito.",
    en: "Paste the code into an HTML block on your site. The page display depends on your site's security settings.",
    fr: "Collez le code dans un bloc HTML de votre site. L’affichage dépend des paramètres de sécurité de votre site.",
    es: "Pega el código en un bloque HTML de tu sitio. La visualización depende de la configuración de seguridad del sitio.",
  },
  shareUnavailable: {
    it: "I link e il codice di incorporamento sono disponibili dopo la pubblicazione.",
    en: "Sharing links and embed code are available after publication.",
    fr: "Les liens de partage et le code d’intégration sont disponibles après publication.",
    es: "Los enlaces y el código de inserción están disponibles después de publicar.",
  },
  shareCopyLink: {
    it: "Copia link", en: "Copy link", fr: "Copier le lien", es: "Copiar enlace",
  },
  shareCopyCode: {
    it: "Copia codice", en: "Copy code", fr: "Copier le code", es: "Copiar código",
  },
  shareCopied: {
    it: "Copiato", en: "Copied", fr: "Copié", es: "Copiado",
  },
  shareCopyError: {
    it: "Seleziona il testo e copialo manualmente.",
    en: "Select the text and copy it manually.",
    fr: "Sélectionnez le texte pour le copier manuellement.",
    es: "Selecciona el texto y cópialo manualmente.",
  },
  placementGuide: {
    it: "Carica le opere nella libreria, aggiungile alla galleria e posizionale nell’editor. Le opere senza posizione non appaiono nella visita.",
    en: "Upload works to your library, add them to the gallery, then position them in the editor. Unpositioned works are hidden in the visit.",
    fr: "Importez les œuvres, ajoutez-les à la galerie, puis placez-les dans l’éditeur. Les œuvres non placées restent invisibles pendant la visite.",
    es: "Sube las obras, añádelas a la galería y colócalas en el editor. Las obras sin colocar no se ven en la visita.",
  },
  inventoryLayout: {
    it: "Ogni scheda consente di modificare e salvare una singola opera.",
    en: "Edit and save one work at a time.",
    fr: "Modifiez et enregistrez une œuvre à la fois.",
    es: "Edita y guarda una obra cada vez.",
  },
  workFields: {
    it: "Dati dell’opera", en: "Artwork details", fr: "Détails de l’œuvre", es: "Datos de la obra",
  },
  catalogPreview: {
    it: "Anteprima catalogo", en: "Catalogue preview", fr: "Aperçu du catalogue", es: "Vista previa del catálogo",
  },
  adminNavigation: {
    it: "Navigazione amministrativa", en: "Admin navigation", fr: "Navigation administrative", es: "Navegación de administración",
  },
  adminContent: {
    it: "Contenuti e persone", en: "Content and people", fr: "Contenus et personnes", es: "Contenido y personas",
  },
  adminProgram: {
    it: "Programmazione", en: "Programming", fr: "Programmation", es: "Programación",
  },
  adminOperations: {
    it: "Operazioni", en: "Operations", fr: "Opérations", es: "Operaciones",
  },
  adminOverview: {
    it: "Panoramica", en: "Overview", fr: "Vue d’ensemble", es: "Resumen",
  },
  adminOverviewDetail: {
    it: "Controlla gli account e accedi a gallerie, richieste e abbonamenti.",
    en: "Review accounts and open galleries, enquiries and subscriptions.",
    fr: "Consultez les comptes et accédez aux galeries, aux demandes et aux abonnements.",
    es: "Revisa las cuentas y accede a galerías, consultas y suscripciones.",
  },
  adminUsers: {
    it: "Utenti", en: "Users", fr: "Utilisateurs", es: "Usuarios",
  },
  adminRequests: {
    it: "Richieste", en: "Enquiries", fr: "Demandes", es: "Consultas",
  },
  adminTemplates: {
    it: "Template", en: "Templates", fr: "Modèles", es: "Plantillas",
  },
  adminSound: {
    it: "Audio", en: "Audio", fr: "Audio", es: "Audio",
  },
  adminLive: {
    it: "Visite guidate live", en: "Live guided tours", fr: "Visites guidées en direct", es: "Visitas guiadas en directo",
  },
  adminStorage: {
    it: "Spazio di archiviazione", en: "Storage", fr: "Stockage", es: "Almacenamiento",
  },
  adminPwa: {
    it: "Notifiche e PWA", en: "Notifications and PWA", fr: "Notifications et PWA", es: "Notificaciones y PWA",
  },
  adminBilling: {
    it: "Abbonamenti", en: "Subscriptions", fr: "Abonnements", es: "Suscripciones",
  },
  adminBillingDetail: {
    it: "Piani, abbonamenti Stripe, cancellazioni programmate ed eventi webhook.",
    en: "Plans, Stripe subscriptions, scheduled cancellations and webhook events.",
    fr: "Offres, abonnements Stripe, résiliations programmées et événements webhook.",
    es: "Planes, suscripciones de Stripe, cancelaciones programadas y eventos webhook.",
  },
  adminArea: {
    it: "Area amministrativa", en: "Administration", fr: "Administration", es: "Administración",
  },
  publicSite: {
    it: "Sito pubblico", en: "Public site", fr: "Site public", es: "Sitio público",
  },
  adminPlans: {
    it: "Vedi piani", en: "View plans", fr: "Voir les offres", es: "Ver planes",
  },
} satisfies Record<string, Record<Locale, string>>;

type WorkspaceLabel = keyof typeof labels;

export function useWorkspaceCopy() {
  const { locale } = useLanguage();
  return (label: WorkspaceLabel) => labels[label][locale];
}

export default function WorkspaceText({ label }: { label: WorkspaceLabel }) {
  return useWorkspaceCopy()(label);
}
