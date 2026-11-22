"use client";

import { useSyncExternalStore } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import LocalDateTime from "@/components/time/LocalDateTime";

const copy = {
  it: {
    heroHeadingFirst: "Mostre da vivere.",
    heroHeadingSecond: "Spazi da creare.",
    heroDescription: "Visita gallerie 3D, scopri artisti e crea il tuo spazio espositivo online.",
    register: "Registrati gratis",
    explore: "Esplora le mostre",
    heroBenefit: "Dal tuo browser. Con un account segui artisti, salvi opere e inizi a esporre.",
    gallery: "Galleria pubblicata",
    openGallery: "Visita la galleria",
    galleryArchive: "Tutte le gallerie",
    heroFallback: "Scopri le mostre di Mostra.Space",
    heroFallbackDescription: "Entra negli spazi espositivi o sfoglia le opere nei cataloghi.",
    discoverHeading: "Mostre da scoprire",
    peopleHeading: "Incontra la community",
    peopleArchive: "Tutti i profili",
    publicProfile: "Profilo pubblico",
    artHeading: "Opere dalle mostre",
    artDescription: "Una selezione dai cataloghi pubblicati, da osservare prima di entrare negli spazi 3D.",
    artCatalogue: "Apri il catalogo",
    cultureHeading: "Appuntamenti d’arte",
    cultureDescription: "Visite guidate, vernissage digitali e incontri nelle gallerie.",
    cultureCalendar: "Consulta il calendario",
    audienceHeading: "Il tuo modo di vivere l’arte",
    visitorTitle: "Visita e colleziona",
    visitorDescription: "Esplora le mostre, ritrova le opere che hai salvato e segui gli artisti che ti interessano.",
    creatorTitle: "Crea ed esponi",
    creatorDescription: "Allestisci una galleria, presenta il tuo lavoro e condividi mostre e cataloghi.",
    curatorTitle: "Cura e condividi",
    curatorDescription: "Scegli uno spazio per il tuo progetto espositivo e aprilo al pubblico.",
    templates: "Esplora gli ambienti",
    planHeading: "Inizia con lo spazio che ti serve",
    comparePlans: "Confronta i piani",
    freePlanAction: "Inizia gratis",
    planAction: "Vedi il piano",
  },
  en: {
    heroHeadingFirst: "Art to discover.",
    heroHeadingSecond: "Space to create.",
    heroDescription: "Visit 3D galleries, discover artists and create your own exhibition space online.",
    register: "Sign up for free",
    explore: "Explore exhibitions",
    heroBenefit: "From your browser. Sign up to follow artists, save artworks and exhibit.",
    gallery: "Published gallery",
    openGallery: "Visit the gallery",
    galleryArchive: "All galleries",
    heroFallback: "Discover exhibitions on Mostra.Space",
    heroFallbackDescription: "Enter exhibition spaces or browse the artworks in their catalogues.",
    discoverHeading: "Exhibitions to discover",
    peopleHeading: "Meet the community",
    peopleArchive: "All profiles",
    publicProfile: "Public profile",
    artHeading: "Artworks from the exhibitions",
    artDescription: "A selection from published catalogues, ready to browse before entering the 3D spaces.",
    artCatalogue: "Open the catalogue",
    cultureHeading: "Art events",
    cultureDescription: "Guided visits, online openings and conversations in the galleries.",
    cultureCalendar: "Browse the calendar",
    audienceHeading: "Make art part of your day",
    visitorTitle: "Visit and collect",
    visitorDescription: "Explore shows, return to artworks you have saved and follow artists you want to keep up with.",
    creatorTitle: "Create and exhibit",
    creatorDescription: "Set up a gallery, present your work and share exhibitions and catalogues.",
    curatorTitle: "Curate and share",
    curatorDescription: "Choose a space for your exhibition project and open it to the public.",
    templates: "Explore spaces",
    planHeading: "Find the space you need",
    comparePlans: "Compare plans",
    freePlanAction: "Get started free",
    planAction: "View plan",
  },
  fr: {
    heroHeadingFirst: "L’art à découvrir.",
    heroHeadingSecond: "Un espace à créer.",
    heroDescription: "Visitez des galeries 3D, découvrez des artistes et créez votre espace d’exposition en ligne.",
    register: "Inscription gratuite",
    explore: "Explorer les expositions",
    heroBenefit: "Depuis votre navigateur. Créez un compte pour suivre, enregistrer et exposer.",
    gallery: "Galerie publiée",
    openGallery: "Visiter la galerie",
    galleryArchive: "Toutes les galeries",
    heroFallback: "Découvrez les expositions de Mostra.Space",
    heroFallbackDescription: "Visitez les espaces d’exposition ou parcourez les œuvres de leurs catalogues.",
    discoverHeading: "Expositions à découvrir",
    peopleHeading: "Rencontrez la communauté",
    peopleArchive: "Tous les profils",
    publicProfile: "Profil public",
    artHeading: "Œuvres des expositions",
    artDescription: "Une sélection des catalogues publiés à découvrir avant de visiter les espaces 3D.",
    artCatalogue: "Ouvrir le catalogue",
    cultureHeading: "Rendez-vous artistiques",
    cultureDescription: "Visites guidées, vernissages en ligne et rencontres dans les galeries.",
    cultureCalendar: "Consulter le calendrier",
    audienceHeading: "Vivez l’art à votre façon",
    visitorTitle: "Visiter et collectionner",
    visitorDescription: "Explorez les expositions, retrouvez vos œuvres enregistrées et suivez les artistes qui vous intéressent.",
    creatorTitle: "Créer et exposer",
    creatorDescription: "Aménagez une galerie, présentez votre travail et partagez vos expositions et catalogues.",
    curatorTitle: "Concevoir et partager",
    curatorDescription: "Choisissez un espace pour votre projet d’exposition et ouvrez-le au public.",
    templates: "Explorer les espaces",
    planHeading: "Trouvez l’espace qu’il vous faut",
    comparePlans: "Comparer les formules",
    freePlanAction: "Commencer gratuitement",
    planAction: "Voir la formule",
  },
  es: {
    heroHeadingFirst: "Arte por descubrir.",
    heroHeadingSecond: "Espacios para crear.",
    heroDescription: "Visita galerías 3D, descubre artistas y crea tu espacio expositivo en línea.",
    register: "Regístrate gratis",
    explore: "Explorar exposiciones",
    heroBenefit: "Desde tu navegador. Regístrate para seguir a artistas, guardar obras y exponer.",
    gallery: "Galería publicada",
    openGallery: "Visitar la galería",
    galleryArchive: "Todas las galerías",
    heroFallback: "Descubre las exposiciones de Mostra.Space",
    heroFallbackDescription: "Entra en los espacios expositivos o explora las obras de sus catálogos.",
    discoverHeading: "Exposiciones por descubrir",
    peopleHeading: "Conoce a la comunidad",
    peopleArchive: "Todos los perfiles",
    publicProfile: "Perfil público",
    artHeading: "Obras de las exposiciones",
    artDescription: "Una selección de los catálogos publicados para explorar antes de entrar en los espacios 3D.",
    artCatalogue: "Abrir el catálogo",
    cultureHeading: "Agenda artística",
    cultureDescription: "Visitas guiadas, inauguraciones en línea y encuentros en las galerías.",
    cultureCalendar: "Consultar el calendario",
    audienceHeading: "Vive el arte a tu manera",
    visitorTitle: "Visita y colecciona",
    visitorDescription: "Explora exposiciones, vuelve a las obras que has guardado y sigue a los artistas que te interesan.",
    creatorTitle: "Crea y expón",
    creatorDescription: "Monta una galería, presenta tu trabajo y comparte exposiciones y catálogos.",
    curatorTitle: "Comisaría y comparte",
    curatorDescription: "Elige un espacio para tu proyecto expositivo y ábrelo al público.",
    templates: "Explorar los espacios",
    planHeading: "Encuentra el espacio que necesitas",
    comparePlans: "Comparar planes",
    freePlanAction: "Empieza gratis",
    planAction: "Ver el plan",
  },
};

export type PublicHomeTextId = keyof typeof copy.it;

const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

function usePublicHomeLocale() {
  const { locale } = useLanguage();
  // Streamed sections can hydrate after the outer provider has selected the browser language.
  const hydrated = useSyncExternalStore(subscribeToHydration, getHydratedSnapshot, getServerSnapshot);
  return hydrated ? locale : "it";
}

export function PublicHomeText({ id }: { id: PublicHomeTextId }) {
  return copy[usePublicHomeLocale()][id];
}

export function PublicHomeEventDate({ value, timeZone }: { value: string; timeZone: string | null }) {
  const locale = usePublicHomeLocale();
  return <LocalDateTime value={value} timeZone={timeZone} locale={locale} format="datetime-medium" />;
}
