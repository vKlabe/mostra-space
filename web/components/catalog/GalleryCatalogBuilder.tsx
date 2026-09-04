"use client";

import { useEffect, useMemo, useState } from "react";
import * as QRCode from "qrcode";
import T from "@/components/i18n/T";

type CatalogLayoutVariant = "elegant" | "compact" | "price_list";
type CatalogTheme =
  | "classic"
  | "contemporary"
  | "essential"
  | "noir"
  | "modernist_78";

type CatalogPlan = "free" | "pro" | "business" | "diamond" | "institution";

type CatalogGallery = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  status: "draft" | "published" | "archived";
  publicUrl: string;
};

type CatalogArtwork = {
  galleryArtworkId: string;
  artworkId: string;
  title: string;
  artistName: string;
  year: string;
  technique: string;
  dimensions: string;
  description: string;
  imageUrl: string;
  thumbnailImageUrl: string;
  cardImageUrl: string;
  detailImageUrl: string;
  price: number | string | null;
  currency: string;
  isForSale: boolean;
  isPublic: boolean;
  widthCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  sortOrder: number;
};

type CatalogSettings = {
  title: string | null;
  subtitle: string | null;
  curatorName: string | null;
  galleryName: string | null;
  introText: string | null;
  contactEmail: string | null;
  website: string | null;
  layoutVariant: CatalogLayoutVariant | null;
  catalogTheme?: CatalogTheme | null;
  includeDescriptions: boolean;
  includePrices: boolean;
  includePublicLink: boolean;
  includePrivateArtworks: boolean;
};

type GalleryCatalogBuilderProps = {
  gallery: CatalogGallery;
  artworks: CatalogArtwork[];
  defaultCuratorName: string;
  defaultContactEmail: string;
  initialSettings: CatalogSettings | null;
  userPlan: string;
};

const catalogLayouts: Array<{
  key: CatalogLayoutVariant;
  labelKey: string;
  labelFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
}> = [
  {
    key: "elegant",
    labelKey: "catalog.layout.elegant",
    labelFallback: "Elegante",
    descriptionKey: "catalog.layout.elegantDescription",
    descriptionFallback:
      "1 opera per pagina. Più editoriale, pulito e museale.",
  },
  {
    key: "compact",
    labelKey: "catalog.layout.compact",
    labelFallback: "Compatto",
    descriptionKey: "catalog.layout.compactDescription",
    descriptionFallback:
      "2 opere per pagina. Utile per mostre con molte opere.",
  },
  {
    key: "price_list",
    labelKey: "catalog.layout.priceList",
    labelFallback: "Listino",
    descriptionKey: "catalog.layout.priceListDescription",
    descriptionFallback:
      "Fino a 6 opere per pagina. Pensato per vendita e invio rapido.",
  },
];

const catalogThemes: Array<{
  key: CatalogTheme;
  labelKey: string;
  labelFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
  previewClassName: string;
}> = [
  {
    key: "classic",
    labelKey: "catalog.theme.classic",
    labelFallback: "MostraSpace Classic",
    descriptionKey: "catalog.theme.classicDescription",
    descriptionFallback:
      "Lo stile originale mostra.space: avorio, nero, bronzo e impaginazione editoriale.",
    previewClassName: "catalog-theme-preview-classic",
  },
  {
    key: "contemporary",
    labelKey: "catalog.theme.contemporary",
    labelFallback: "Contemporary",
    descriptionKey: "catalog.theme.contemporaryDescription",
    descriptionFallback:
      "Tipografia netta, contrasti forti e ritmo visivo da catalogo d’arte contemporanea.",
    previewClassName: "catalog-theme-preview-contemporary",
  },
  {
    key: "essential",
    labelKey: "catalog.theme.essential",
    labelFallback: "Essential",
    descriptionKey: "catalog.theme.essentialDescription",
    descriptionFallback:
      "Minimale, luminoso e raffinato. Lascia il massimo spazio alle opere e ai testi.",
    previewClassName: "catalog-theme-preview-essential",
  },
  {
    key: "noir",
    labelKey: "catalog.theme.noir",
    labelFallback: "Noir",
    descriptionKey: "catalog.theme.noirDescription",
    descriptionFallback:
      "Dark elegante, fondi profondi e dettagli caldi per una presenza più scenografica.",
    previewClassName: "catalog-theme-preview-noir",
  },
  {
    key: "modernist_78",
    labelKey: "catalog.theme.modernist78",
    labelFallback: "Modernist 78",
    descriptionKey: "catalog.theme.modernist78Description",
    descriptionFallback:
      "Griglia modernista, accenti grafici e carattere editoriale ispirato agli anni ’70/’80.",
    previewClassName: "catalog-theme-preview-modernist",
  },
];


function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function getCatalogArtworkImageUrl(
  artwork: CatalogArtwork,
  layoutVariant: CatalogLayoutVariant
) {
  if (layoutVariant === "price_list") {
    return artwork.thumbnailImageUrl || artwork.imageUrl;
  }

  if (layoutVariant === "compact") {
    return artwork.cardImageUrl || artwork.imageUrl;
  }

  return artwork.detailImageUrl || artwork.imageUrl;
}

function formatPrice(value: number | string | null, currency: string) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const normalizedValue =
    typeof value === "string" ? value.replace(",", ".").trim() : value;

  const numericValue = Number(normalizedValue);

  if (Number.isFinite(numericValue)) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: (currency || "EUR").toUpperCase(),
    }).format(numericValue);
  }

  return `${value} ${(currency || "EUR").toUpperCase()}`;
}

function formatDimensions(artwork: CatalogArtwork) {
  if (artwork.dimensions) {
    return artwork.dimensions;
  }

  const parts = [
    artwork.widthCm ? `${artwork.widthCm} cm` : "",
    artwork.heightCm ? `${artwork.heightCm} cm` : "",
    artwork.depthCm ? `${artwork.depthCm} cm` : "",
  ].filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  return parts.join(" × ");
}

function getArtworkCaption(artwork: CatalogArtwork) {
  const title = artwork.title || "Opera senza titolo";
  const year = artwork.year ? `, ${artwork.year}` : "";

  return `${title}${year}`;
}

function getLayoutLabel(layoutVariant: CatalogLayoutVariant) {
  if (layoutVariant === "compact") {
    return "Compatto · 2 opere per pagina";
  }

  if (layoutVariant === "price_list") {
    return "Listino · fino a 6 opere per pagina";
  }

  return "Elegante · 1 opera per pagina";
}

function normalizeCatalogPlan(value: string | null | undefined): CatalogPlan {
  if (
    value === "pro" ||
    value === "business" ||
    value === "diamond" ||
    value === "institution"
  ) {
    return value;
  }

  return "free";
}

function canExportCatalogPdf(plan: CatalogPlan) {
  return plan !== "free";
}

function canUseCatalogLayout(
  plan: CatalogPlan,
  layoutVariant: CatalogLayoutVariant
) {
  if (layoutVariant === "elegant") {
    return true;
  }

  return plan === "business" || plan === "diamond" || plan === "institution";
}

function getAllowedCatalogLayout(
  plan: CatalogPlan,
  layoutVariant: CatalogLayoutVariant
): CatalogLayoutVariant {
  if (canUseCatalogLayout(plan, layoutVariant)) {
    return layoutVariant;
  }

  return "elegant";
}

function canUseCatalogTheme(plan: CatalogPlan, theme: CatalogTheme) {
  if (theme === "classic") {
    return true;
  }

  return plan === "business" || plan === "diamond" || plan === "institution";
}

function getAllowedCatalogTheme(
  plan: CatalogPlan,
  theme: CatalogTheme
): CatalogTheme {
  return canUseCatalogTheme(plan, theme) ? theme : "classic";
}

function getPlanLabel(plan: CatalogPlan) {
  if (plan === "free") {
    return "Free";
  }

  if (plan === "pro") {
    return "Pro";
  }

  if (plan === "business") {
    return "Business";
  }

  if (plan === "diamond") {
    return "Diamond";
  }

  return "Institution";
}

export default function GalleryCatalogBuilder({
  gallery,
  artworks,
  defaultCuratorName,
  defaultContactEmail,
  initialSettings,
  userPlan,
}: GalleryCatalogBuilderProps) {
  const normalizedPlan = normalizeCatalogPlan(userPlan);
  const canExportPdf = canExportCatalogPdf(normalizedPlan);

  const [catalogTitle, setCatalogTitle] = useState(
    initialSettings?.title || gallery.title
  );
  const [catalogSubtitle, setCatalogSubtitle] = useState(
    initialSettings?.subtitle || "Catalogo mostra"
  );
  const [curatorName, setCuratorName] = useState(
    initialSettings?.curatorName || defaultCuratorName
  );
  const [galleryName, setGalleryName] = useState(
    initialSettings?.galleryName || "MostraSpace"
  );
  const [introText, setIntroText] = useState(
    initialSettings?.introText || gallery.description || ""
  );
  const [contactEmail, setContactEmail] = useState(
    initialSettings?.contactEmail || defaultContactEmail
  );
  const [website, setWebsite] = useState(
    initialSettings?.website || gallery.publicUrl
  );
  const [layoutVariant, setLayoutVariant] = useState<CatalogLayoutVariant>(
    getAllowedCatalogLayout(
      normalizedPlan,
      initialSettings?.layoutVariant || "elegant"
    )
  );
  const [catalogTheme, setCatalogTheme] = useState<CatalogTheme>(
    getAllowedCatalogTheme(
      normalizedPlan,
      initialSettings?.catalogTheme || "classic"
    )
  );
  const [includeDescriptions, setIncludeDescriptions] = useState(
    initialSettings?.includeDescriptions ?? true
  );
  const [includePrices, setIncludePrices] = useState(
    initialSettings?.includePrices ?? true
  );
  const [includePublicLink, setIncludePublicLink] = useState(
    initialSettings?.includePublicLink ?? true
  );
  const [includePrivateArtworks, setIncludePrivateArtworks] = useState(
    initialSettings?.includePrivateArtworks ?? true
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsMessageType, setSettingsMessageType] = useState<
    "success" | "error" | ""
  >("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  const allowedLayoutVariant = getAllowedCatalogLayout(
    normalizedPlan,
    layoutVariant
  );
  const allowedCatalogTheme = getAllowedCatalogTheme(
    normalizedPlan,
    catalogTheme
  );
  const selectedThemeDefinition =
    catalogThemes.find((theme) => theme.key === allowedCatalogTheme) ||
    catalogThemes[0];

  const displayedArtworks = useMemo(() => {
    if (includePrivateArtworks) {
      return artworks;
    }

    return artworks.filter((artwork) => artwork.isPublic);
  }, [artworks, includePrivateArtworks]);

  const coverImageUrl =
    gallery.coverImageUrl ||
    (displayedArtworks[0]
      ? getCatalogArtworkImageUrl(displayedArtworks[0], allowedLayoutVariant)
      : "");

  useEffect(() => {
    setLayoutVariant((currentLayout) =>
      getAllowedCatalogLayout(normalizedPlan, currentLayout)
    );
  }, [normalizedPlan]);

  useEffect(() => {
    setCatalogTheme((currentTheme) =>
      getAllowedCatalogTheme(normalizedPlan, currentTheme)
    );
  }, [normalizedPlan]);

  useEffect(() => {
    let isMounted = true;

    async function generateQrCode() {
      if (!gallery.publicUrl || !includePublicLink) {
        setQrCodeDataUrl("");
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(gallery.publicUrl, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 420,
          color: {
            dark: "#15120e",
            light: "#ffffff",
          },
        });

        if (isMounted) {
          setQrCodeDataUrl(dataUrl);
        }
      } catch {
        if (isMounted) {
          setQrCodeDataUrl("");
        }
      }
    }

    generateQrCode();

    return () => {
      isMounted = false;
    };
  }, [gallery.publicUrl, includePublicLink]);

  function handlePrint() {
    if (!canExportPdf) {
      setSettingsMessageType("error");
      setSettingsMessage(
        "L’export PDF del catalogo è disponibile dal piano Pro. Con il piano Free puoi usare l’anteprima, ma non scaricare il PDF."
      );
      return;
    }

    window.print();
  }

  async function handleDownloadDirectPdf() {
    if (!canExportPdf) {
      setSettingsMessageType("error");
      setSettingsMessage(
        "L’export PDF del catalogo è disponibile dal piano Pro. Con il piano Free puoi usare l’anteprima, ma non scaricare il PDF."
      );
      return;
    }

    setIsDownloadingPdf(true);
    setSettingsMessage("");
    setSettingsMessageType("");

    try {
      const saveResponse = await fetch(
        `/api/dashboard/galleries/${gallery.id}/catalog-settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: catalogTitle,
            subtitle: catalogSubtitle,
            curatorName,
            galleryName,
            introText,
            contactEmail,
            website,
            layoutVariant: allowedLayoutVariant,
            catalogTheme: allowedCatalogTheme,
            includeDescriptions,
            includePrices,
            includePublicLink,
            includePrivateArtworks,
          }),
        }
      );

      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        setSettingsMessageType("error");
        setSettingsMessage(
          saveData.error || "Errore salvataggio impostazioni catalogo."
        );
        return;
      }

      const pdfResponse = await fetch(
        `/api/dashboard/galleries/${gallery.id}/catalog-pdf`
      );

      if (!pdfResponse.ok) {
        const errorData = await pdfResponse.json().catch(() => null);

        setSettingsMessageType("error");
        setSettingsMessage(
          errorData?.error || "Errore generazione PDF catalogo."
        );
        return;
      }

      const blob = await pdfResponse.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = `catalogo-${gallery.slug}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);

      setSettingsMessageType("success");
      setSettingsMessage("PDF catalogo generato correttamente.");
    } catch {
      setSettingsMessageType("error");
      setSettingsMessage("Errore di rete durante la generazione del PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  async function handleSaveSettings() {
    setIsSavingSettings(true);
    setSettingsMessage("");
    setSettingsMessageType("");

    try {
      const response = await fetch(
        `/api/dashboard/galleries/${gallery.id}/catalog-settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: catalogTitle,
            subtitle: catalogSubtitle,
            curatorName,
            galleryName,
            introText,
            contactEmail,
            website,
            layoutVariant: allowedLayoutVariant,
            catalogTheme: allowedCatalogTheme,
            includeDescriptions,
            includePrices,
            includePublicLink,
            includePrivateArtworks,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setSettingsMessageType("error");
        setSettingsMessage(
          data.error || "Errore salvataggio impostazioni catalogo."
        );
        return;
      }

      setLayoutVariant(allowedLayoutVariant);
      setCatalogTheme(allowedCatalogTheme);
      setSettingsMessageType("success");
      setSettingsMessage("Impostazioni catalogo salvate correttamente.");
    } catch {
      setSettingsMessageType("error");
      setSettingsMessage("Errore di rete durante il salvataggio.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-6 py-8 text-neutral-50">
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }

        .catalog-print-root {
          --catalog-paper: #f7f2e8;
          --catalog-ink: #16120d;
          --catalog-dark: #15120e;
          --catalog-dark-ink: #f7f2e8;
          --catalog-accent: #8b6a43;
          --catalog-accent-dark: #b9905b;
          --catalog-muted: #5c4b39;
          --catalog-dark-muted: #d8c9b0;
          --catalog-border: #d8c9b0;
          --catalog-image-bg: #eee6d8;
          --catalog-body-font: Georgia, "Times New Roman", serif;
          --catalog-title-font: Georgia, "Times New Roman", serif;
          --catalog-label-font: Arial, Helvetica, sans-serif;
        }

        .catalog-theme-contemporary {
          --catalog-paper: #ffffff;
          --catalog-ink: #0b0b0b;
          --catalog-dark: #0a0a0a;
          --catalog-dark-ink: #ffffff;
          --catalog-accent: #2246ff;
          --catalog-accent-dark: #7f97ff;
          --catalog-muted: #4d4d4d;
          --catalog-dark-muted: #d6d6d6;
          --catalog-border: #bfc7ff;
          --catalog-image-bg: #f2f3f7;
          --catalog-body-font: Arial, Helvetica, sans-serif;
          --catalog-title-font: Arial, Helvetica, sans-serif;
          --catalog-label-font: Arial, Helvetica, sans-serif;
        }

        .catalog-theme-essential {
          --catalog-paper: #fbfaf7;
          --catalog-ink: #1f1f1d;
          --catalog-dark: #fbfaf7;
          --catalog-dark-ink: #1f1f1d;
          --catalog-accent: #77736d;
          --catalog-accent-dark: #77736d;
          --catalog-muted: #68645f;
          --catalog-dark-muted: #68645f;
          --catalog-border: #d8d4ce;
          --catalog-image-bg: #f1efeb;
          --catalog-body-font: Georgia, "Times New Roman", serif;
          --catalog-title-font: Georgia, "Times New Roman", serif;
          --catalog-label-font: Arial, Helvetica, sans-serif;
        }

        .catalog-theme-noir {
          --catalog-paper: #11110f;
          --catalog-ink: #f5efe5;
          --catalog-dark: #070706;
          --catalog-dark-ink: #fffaf0;
          --catalog-accent: #bd9561;
          --catalog-accent-dark: #d7b27d;
          --catalog-muted: #b9ad9d;
          --catalog-dark-muted: #d7ccbd;
          --catalog-border: #4a4339;
          --catalog-image-bg: #1b1a17;
          --catalog-body-font: Georgia, "Times New Roman", serif;
          --catalog-title-font: Georgia, "Times New Roman", serif;
          --catalog-label-font: Arial, Helvetica, sans-serif;
        }

        .catalog-theme-modernist_78 {
          --catalog-paper: #eee3cd;
          --catalog-ink: #20292d;
          --catalog-dark: #273238;
          --catalog-dark-ink: #f6eddc;
          --catalog-accent: #c84f2a;
          --catalog-accent-dark: #f09a4c;
          --catalog-muted: #4a565a;
          --catalog-dark-muted: #eadcc5;
          --catalog-border: #9c917b;
          --catalog-image-bg: #ddd0b7;
          --catalog-body-font: Arial, Helvetica, sans-serif;
          --catalog-title-font: Arial, Helvetica, sans-serif;
          --catalog-label-font: Arial, Helvetica, sans-serif;
        }

        .catalog-print-root .catalog-page {
          position: relative;
          background: var(--catalog-paper) !important;
          color: var(--catalog-ink) !important;
          font-family: var(--catalog-body-font) !important;
          border-color: var(--catalog-border) !important;
        }

        .catalog-print-root .catalog-page-dark {
          background: var(--catalog-dark) !important;
          color: var(--catalog-dark-ink) !important;
        }

        .catalog-print-root .catalog-page h1,
        .catalog-print-root .catalog-page h2,
        .catalog-print-root .catalog-page h3 {
          font-family: var(--catalog-title-font) !important;
        }

        .catalog-print-root .catalog-small-caps {
          font-family: var(--catalog-label-font) !important;
          color: var(--catalog-accent) !important;
        }

        .catalog-print-root [class*="text-[#8b6a43]"] {
          color: var(--catalog-accent) !important;
        }

        .catalog-print-root [class*="text-[#b9905b]"] {
          color: var(--catalog-accent-dark) !important;
        }

        .catalog-print-root [class*="text-[#5c4b39]"] {
          color: var(--catalog-muted) !important;
        }

        .catalog-print-root [class*="text-[#d8c9b0]"] {
          color: var(--catalog-dark-muted) !important;
        }

        .catalog-print-root [class*="text-[#f7f2e8]"] {
          color: var(--catalog-dark-ink) !important;
        }

        .catalog-print-root [class*="text-[#8e7f6c]"] {
          color: var(--catalog-muted) !important;
        }

        .catalog-print-root [class*="border-[#d8c9b0]"],
        .catalog-print-root [class*="border-[#3a3024]"] {
          border-color: var(--catalog-border) !important;
        }

        .catalog-print-root [class*="bg-[#eee6d8]"] {
          background: var(--catalog-image-bg) !important;
        }

        .catalog-theme-contemporary .catalog-page {
          padding: 10mm 12mm 12mm 16mm;
        }

        .catalog-theme-contemporary .catalog-page::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 4mm;
          height: 100%;
          background: var(--catalog-accent);
        }

        .catalog-theme-contemporary .catalog-page h1,
        .catalog-theme-contemporary .catalog-page h2,
        .catalog-theme-contemporary .catalog-page h3 {
          font-weight: 700 !important;
          letter-spacing: -0.035em;
        }

        .catalog-theme-contemporary .catalog-small-caps {
          letter-spacing: 0.22em;
          font-weight: 700;
        }

        .catalog-theme-essential .catalog-page {
          padding: 16mm;
        }

        .catalog-theme-essential .catalog-page-dark {
          border: 1px solid var(--catalog-border);
        }

        .catalog-theme-essential .catalog-small-caps {
          letter-spacing: 0.28em;
        }

        .catalog-theme-noir .catalog-page {
          box-shadow: inset 0 0 0 1px var(--catalog-border);
        }

        .catalog-theme-noir .catalog-page [class*="bg-white"] {
          background: #ffffff !important;
        }

        .catalog-theme-modernist_78 .catalog-page {
          padding-top: 18mm;
        }

        .catalog-theme-modernist_78 .catalog-page::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 46mm;
          height: 7mm;
          background: var(--catalog-accent);
        }

        .catalog-theme-modernist_78 .catalog-page::after {
          content: "";
          position: absolute;
          top: 0;
          left: 46mm;
          width: 24mm;
          height: 7mm;
          background: #d9a63d;
        }

        .catalog-theme-modernist_78 .catalog-page h1,
        .catalog-theme-modernist_78 .catalog-page h2,
        .catalog-theme-modernist_78 .catalog-page h3 {
          font-weight: 700 !important;
          letter-spacing: -0.025em;
        }

        .catalog-theme-preview {
          height: 92px;
          overflow: hidden;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          position: relative;
        }

        .catalog-theme-preview::before,
        .catalog-theme-preview::after {
          content: "";
          position: absolute;
        }

        .catalog-theme-preview-classic {
          background: linear-gradient(90deg, #15120e 0 39%, #f7f2e8 39% 100%);
        }
        .catalog-theme-preview-classic::before {
          left: 12px; top: 15px; width: 54px; height: 5px; background: #b9905b;
          box-shadow: 0 13px 0 #f7f2e8, 0 24px 0 #d8c9b0;
        }
        .catalog-theme-preview-classic::after {
          right: 16px; top: 15px; width: 78px; height: 55px; border: 1px solid #d8c9b0; background: #eee6d8;
        }

        .catalog-theme-preview-contemporary {
          background: #ffffff;
          border-left: 10px solid #2246ff;
        }
        .catalog-theme-preview-contemporary::before {
          left: 16px; top: 14px; width: 115px; height: 10px; background: #0b0b0b;
          box-shadow: 0 18px 0 #0b0b0b, 0 34px 0 #c7c7c7;
        }
        .catalog-theme-preview-contemporary::after {
          right: 13px; bottom: 12px; width: 58px; height: 46px; background: #f1f2f6; border: 2px solid #0b0b0b;
        }

        .catalog-theme-preview-essential {
          background: #fbfaf7;
        }
        .catalog-theme-preview-essential::before {
          left: 18px; right: 18px; top: 20px; height: 1px; background: #b7b1aa;
          box-shadow: 0 22px 0 #dedad4, 0 44px 0 #dedad4;
        }
        .catalog-theme-preview-essential::after {
          left: 18px; bottom: 12px; width: 46px; height: 6px; background: #77736d;
        }

        .catalog-theme-preview-noir {
          background: #0b0b09;
          box-shadow: inset 0 0 0 1px #4a4339;
        }
        .catalog-theme-preview-noir::before {
          left: 16px; top: 14px; width: 75px; height: 5px; background: #bd9561;
          box-shadow: 0 17px 0 #f5efe5, 0 31px 0 #b9ad9d;
        }
        .catalog-theme-preview-noir::after {
          right: 15px; top: 14px; width: 62px; height: 58px; border: 1px solid #4a4339; background: #1b1a17;
        }

        .catalog-theme-preview-modernist {
          background: #eee3cd;
        }
        .catalog-theme-preview-modernist::before {
          left: 0; top: 0; width: 72px; height: 11px; background: #c84f2a;
          box-shadow: 72px 0 0 #d9a63d;
        }
        .catalog-theme-preview-modernist::after {
          left: 16px; top: 28px; width: 122px; height: 10px; background: #273238;
          box-shadow: 0 17px 0 #273238, 102px 35px 0 -1px #c84f2a;
        }

        .catalog-page {
          box-sizing: border-box;
          width: 210mm;
          min-height: 297mm;
          overflow: hidden;
          background: #f7f2e8;
          color: #16120d;
          padding: 12mm;
          font-family: Georgia, "Times New Roman", serif;
        }

        .catalog-page-dark {
          background: #15120e;
          color: #f7f2e8;
        }

        .catalog-page + .catalog-page {
          margin-top: 24px;
        }

        .catalog-small-caps {
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-size: 10px;
        }

        .catalog-body-text {
          font-size: 13px;
          line-height: 1.75;
        }

        .catalog-artwork-image {
          max-height: 145mm;
          width: 100%;
          object-fit: contain;
          background: #eee6d8;
        }

        @media screen {
          .catalog-page {
            max-width: 100%;
            margin-left: auto;
            margin-right: auto;
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
          }
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
          }

          body * {
            visibility: hidden;
          }

          .catalog-print-root,
          .catalog-print-root * {
            visibility: visible;
          }

          .catalog-no-print {
            display: none !important;
          }

          .catalog-print-root {
            position: absolute;
            inset: 0 auto auto 0;
            width: 210mm;
            background: #ffffff !important;
          }

          .catalog-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 !important;
            box-shadow: none !important;
            page-break-after: always;
            break-after: page;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .catalog-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .catalog-page + .catalog-page {
            margin-top: 0 !important;
          }
        }
      `}</style>

      <div className="catalog-no-print mx-auto mb-8 max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              <T textKey="catalog.header.label" fallback="Catalogo PDF" />
            </p>

            <h1 className="text-3xl font-semibold">
              <T
                textKey="catalog.header.createFor"
                fallback="Crea catalogo per"
              />{" "}
              “{gallery.title}”
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
              <T
                textKey="catalog.header.description"
                fallback="Compila i dati, controlla l’anteprima A4 e usa “Scarica PDF diretto” per generare automaticamente il file."
              />
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={`/dashboard/gallerie/${gallery.id}`}
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              <T
                textKey="catalog.header.backToGallery"
                fallback="Torna alla galleria"
              />
            </a>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSavingSettings || isDownloadingPdf}
              className="rounded-full border border-amber-800 px-5 py-2 text-sm text-amber-200 transition hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingSettings ? (
                <T
                  textKey="catalog.actions.savingSettings"
                  fallback="Salvataggio..."
                />
              ) : (
                <T
                  textKey="catalog.actions.saveSettings"
                  fallback="Salva impostazioni"
                />
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadDirectPdf}
              disabled={isDownloadingPdf || isSavingSettings || !canExportPdf}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDownloadingPdf ? (
                <T
                  textKey="catalog.actions.creatingPdf"
                  fallback="Creo PDF..."
                />
              ) : canExportPdf ? (
                <T
                  textKey="catalog.actions.downloadPdf"
                  fallback="Scarica PDF diretto"
                />
              ) : (
                <T
                  textKey="catalog.actions.pdfFromPro"
                  fallback="PDF dal piano Pro"
                />
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isDownloadingPdf || !canExportPdf}
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {canExportPdf ? (
                <T
                  textKey="catalog.actions.print"
                  fallback="Esporta con stampa"
                />
              ) : (
                <T
                  textKey="catalog.actions.printBlocked"
                  fallback="Stampa bloccata"
                />
              )}
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm leading-6 text-neutral-400">
          {normalizedPlan === "free" ? (
            <p>
              <T
                textKey="catalog.plan.freeNotice"
                fallback="Piano Free: puoi configurare e vedere l’anteprima Classic del catalogo, ma l’export PDF è disponibile dal piano Pro."
              />
            </p>
          ) : normalizedPlan === "pro" ? (
            <p>
              <T
                textKey="catalog.plan.proNotice"
                fallback="Piano Pro: puoi esportare il catalogo con il layout Elegante e lo stile MostraSpace Classic. Layout e stili avanzati si sbloccano dal Business."
              />
            </p>
          ) : (
            <p>
              <T textKey="catalog.plan.currentPrefix" fallback="Piano" />{" "}
              {getPlanLabel(normalizedPlan)}:{" "}
              <T
                textKey="catalog.plan.allLayoutsNotice"
                fallback="puoi usare tutti i layout e tutti i 5 stili grafici: Classic, Contemporary, Essential, Noir e Modernist 78."
              />
            </p>
          )}
        </div>

        {settingsMessage && (
          <div
            className={
              settingsMessageType === "success"
                ? "mb-6 rounded-2xl border border-green-900 bg-green-950/30 p-4 text-sm text-green-200"
                : "mb-6 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200"
            }
          >
            {settingsMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-neutral-500">
              <T textKey="catalog.form.label" fallback="Dati catalogo" />
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  <T
                    textKey="catalog.form.title"
                    fallback="Titolo catalogo"
                  />
                </label>

                <input
                  value={catalogTitle}
                  onChange={(event) => setCatalogTitle(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  <T
                    textKey="catalog.form.subtitle"
                    fallback="Sottotitolo"
                  />
                </label>

                <input
                  value={catalogSubtitle}
                  onChange={(event) => setCatalogSubtitle(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  <T textKey="catalog.form.curator" fallback="Curatore" />
                </label>

                <input
                  value={curatorName}
                  onChange={(event) => setCuratorName(event.target.value)}
                  placeholder="Nome curatore"
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  <T
                    textKey="catalog.form.galleryOrganization"
                    fallback="Galleria / organizzazione"
                  />
                </label>

                <input
                  value={galleryName}
                  onChange={(event) => setGalleryName(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  <T
                    textKey="catalog.form.introText"
                    fallback="Testo curatoriale / introduzione"
                  />
                </label>

                <textarea
                  value={introText}
                  onChange={(event) => setIntroText(event.target.value)}
                  className="min-h-40 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm leading-6 text-neutral-100 outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  <T
                    textKey="catalog.form.contactEmail"
                    fallback="Email contatto"
                  />
                </label>

                <input
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  <T
                    textKey="catalog.form.website"
                    fallback="Sito / link"
                  />
                </label>

                <input
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                />
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.18em] text-neutral-600">
                  <T textKey="catalog.layout.label" fallback="Layout catalogo" />
                </p>

                <div className="grid gap-3">
                  {catalogLayouts.map((layout) => {
                    const isAllowed = canUseCatalogLayout(
                      normalizedPlan,
                      layout.key
                    );

                    return (
                      <button
                        key={layout.key}
                        type="button"
                        disabled={!isAllowed}
                        onClick={() => {
                          if (!isAllowed) {
                            return;
                          }

                          setLayoutVariant(layout.key);
                        }}
                        className={
                          layoutVariant === layout.key
                            ? "rounded-2xl border border-amber-600 bg-amber-950/30 p-4 text-left"
                            : isAllowed
                              ? "rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-left transition hover:border-neutral-600"
                              : "cursor-not-allowed rounded-2xl border border-neutral-900 bg-neutral-950 p-4 text-left opacity-45"
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-neutral-100">
                              <T
                                textKey={layout.labelKey}
                                fallback={layout.labelFallback}
                              />
                            </p>

                            <p className="mt-1 text-xs leading-5 text-neutral-500">
                              <T
                                textKey={layout.descriptionKey}
                                fallback={layout.descriptionFallback}
                              />
                            </p>
                          </div>

                          {!isAllowed && (
                            <span className="shrink-0 rounded-full border border-neutral-800 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                              <T
                                textKey="catalog.layout.businessRequired"
                                fallback="Business"
                              />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                      <T
                        textKey="catalog.theme.label"
                        fallback="Stile grafico"
                      />
                    </p>
                    <p className="mt-2 text-xs leading-5 text-neutral-500">
                      <T
                        textKey="catalog.theme.description"
                        fallback="Lo stile grafico cambia colori, tipografia e carattere editoriale senza modificare il layout scelto."
                      />
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full border border-neutral-800 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                    <T
                      textKey="catalog.theme.businessUnlock"
                      fallback="5 stili da Business"
                    />
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {catalogThemes.map((theme) => {
                    const isAllowed = canUseCatalogTheme(normalizedPlan, theme.key);
                    const isSelected = catalogTheme === theme.key;

                    return (
                      <button
                        key={theme.key}
                        type="button"
                        disabled={!isAllowed}
                        onClick={() => {
                          if (!isAllowed) {
                            return;
                          }

                          setCatalogTheme(theme.key);
                        }}
                        className={
                          isSelected
                            ? "overflow-hidden rounded-2xl border border-amber-600 bg-amber-950/20 p-3 text-left"
                            : isAllowed
                              ? "overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-3 text-left transition hover:border-neutral-600"
                              : "cursor-not-allowed overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-950 p-3 text-left opacity-45"
                        }
                      >
                        <div
                          className={`catalog-theme-preview ${theme.previewClassName}`}
                          aria-hidden="true"
                        />

                        <div className="mt-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-neutral-100">
                              <T
                                textKey={theme.labelKey}
                                fallback={theme.labelFallback}
                              />
                            </p>
                            <p className="mt-1 text-xs leading-5 text-neutral-500">
                              <T
                                textKey={theme.descriptionKey}
                                fallback={theme.descriptionFallback}
                              />
                            </p>
                          </div>

                          {theme.key === "classic" ? (
                            <span className="shrink-0 rounded-full border border-neutral-700 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                              <T
                                textKey="catalog.theme.proBadge"
                                fallback="Pro"
                              />
                            </span>
                          ) : !isAllowed ? (
                            <span className="shrink-0 rounded-full border border-neutral-800 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                              <T
                                textKey="catalog.theme.businessRequired"
                                fallback="Business"
                              />
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    checked={includeDescriptions}
                    onChange={(event) =>
                      setIncludeDescriptions(event.target.checked)
                    }
                    className="mt-1"
                  />
                  <span>
                    <T
                      textKey="catalog.options.includeDescriptions"
                      fallback="Mostra descrizioni delle opere"
                    />
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    checked={includePrices}
                    onChange={(event) =>
                      setIncludePrices(event.target.checked)
                    }
                    className="mt-1"
                  />
                  <span>
                    <T
                      textKey="catalog.options.includePrices"
                      fallback="Mostra prezzi / stato vendita"
                    />
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    checked={includePublicLink}
                    onChange={(event) =>
                      setIncludePublicLink(event.target.checked)
                    }
                    className="mt-1"
                  />
                  <span>
                    <T
                      textKey="catalog.options.includePublicLink"
                      fallback="Mostra link e QR alla galleria online"
                    />
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    checked={includePrivateArtworks}
                    onChange={(event) =>
                      setIncludePrivateArtworks(event.target.checked)
                    }
                    className="mt-1"
                  />
                  <span>
                    <T
                      textKey="catalog.options.includePrivateArtworks"
                      fallback="Includi anche opere private"
                    />
                  </span>
                </label>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
                <p>
                  <T
                    textKey="catalog.summary.totalGalleryArtworks"
                    fallback="Opere totali nella galleria:"
                  />{" "}
                  <span className="text-neutral-100">{artworks.length}</span>
                </p>

                <p className="mt-1">
                  <T
                    textKey="catalog.summary.includedArtworks"
                    fallback="Opere incluse nel catalogo:"
                  />{" "}
                  <span className="text-neutral-100">
                    {displayedArtworks.length}
                  </span>
                </p>

                <p className="mt-3 text-xs leading-5 text-neutral-500">
                  <T
                    textKey="catalog.summary.selectedLayout"
                    fallback="Layout selezionato:"
                  />{" "}
                  {getLayoutLabel(layoutVariant)}
                </p>

                <p className="mt-1 text-xs leading-5 text-neutral-500">
                  <T
                    textKey="catalog.summary.selectedTheme"
                    fallback="Stile grafico:"
                  />{" "}
                  <T
                    textKey={selectedThemeDefinition.labelKey}
                    fallback={selectedThemeDefinition.labelFallback}
                  />
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-neutral-500">
              <T textKey="catalog.preview.label" fallback="Anteprima" />
            </p>

            <p className="text-sm leading-6 text-neutral-400">
              <T
                textKey="catalog.preview.description"
                fallback="L’anteprima qui sotto combina il layout selezionato con lo stile grafico scelto."
              />
            </p>
          </section>
        </div>
      </div>

      <div className={`catalog-print-root catalog-theme-${allowedCatalogTheme}`}>
        <section className="catalog-page catalog-page-dark flex flex-col justify-between">
          <div>
            <p className="catalog-small-caps text-[#b9905b]">
              {galleryName || "MostraSpace"}
            </p>

            <h1 className="mt-12 max-w-[150mm] text-[46px] font-normal leading-[1.05]">
              {catalogTitle || gallery.title}
            </h1>

            {catalogSubtitle && (
              <p className="mt-6 max-w-[120mm] text-[19px] leading-8 text-[#d8c9b0]">
                {catalogSubtitle}
              </p>
            )}
          </div>

          {coverImageUrl && (
            <div className="my-12 overflow-hidden border border-[#3a3024]">
              <img
                src={coverImageUrl}
                alt={catalogTitle || gallery.title}
                className="h-[95mm] w-full object-cover"
              />
            </div>
          )}

          <div className="grid gap-3 text-sm leading-7 text-[#d8c9b0]">
            {curatorName && (
              <p>
                <T textKey="catalog.print.curatedBy" fallback="A cura di" />{" "}
                {curatorName}
              </p>
            )}
            <p>{new Date().getFullYear()}</p>
            {includePublicLink && <p>{gallery.publicUrl}</p>}
          </div>
        </section>

        <section className="catalog-page">
          <div className="flex h-full flex-col justify-between">
            <div>
              <p className="catalog-small-caps text-[#8b6a43]">
                <T textKey="catalog.print.showSheet" fallback="Scheda mostra" />
              </p>

              <h2 className="mt-8 text-[34px] font-normal leading-tight">
                {catalogTitle || gallery.title}
              </h2>

              <dl className="mt-12 grid gap-6 border-y border-[#d8c9b0] py-8 text-sm">
                <div className="grid grid-cols-[42mm_1fr] gap-6">
                  <dt className="catalog-small-caps text-[#8b6a43]">
                    <T textKey="catalog.print.gallery" fallback="Galleria" />
                  </dt>
                  <dd>{galleryName || "MostraSpace"}</dd>
                </div>

                {curatorName && (
                  <div className="grid grid-cols-[42mm_1fr] gap-6">
                    <dt className="catalog-small-caps text-[#8b6a43]">
                      <T textKey="catalog.print.curator" fallback="Curatore" />
                    </dt>
                    <dd>{curatorName}</dd>
                  </div>
                )}

                <div className="grid grid-cols-[42mm_1fr] gap-6">
                  <dt className="catalog-small-caps text-[#8b6a43]">
                    <T textKey="catalog.print.artworks" fallback="Opere" />
                  </dt>
                  <dd>{displayedArtworks.length}</dd>
                </div>

                <div className="grid grid-cols-[42mm_1fr] gap-6">
                  <dt className="catalog-small-caps text-[#8b6a43]">
                    <T textKey="catalog.print.layout" fallback="Layout" />
                  </dt>
                  <dd>{getLayoutLabel(layoutVariant)}</dd>
                </div>

                {includePublicLink && (
                  <div className="grid grid-cols-[42mm_1fr] gap-6">
                    <dt className="catalog-small-caps text-[#8b6a43]">
                      <T textKey="catalog.print.online" fallback="Online" />
                    </dt>
                    <dd className="break-all">{gallery.publicUrl}</dd>
                  </div>
                )}
              </dl>

              {includePublicLink && qrCodeDataUrl && (
                <div className="mt-8 flex items-center gap-6 border border-[#d8c9b0] p-5">
                  <div className="h-[32mm] w-[32mm] shrink-0 bg-white p-2">
                    <img
                      src={qrCodeDataUrl}
                      alt="QR code galleria online"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div>
                    <p className="catalog-small-caps text-[#8b6a43]">
                      <T
                        textKey="catalog.print.onlineGalleryQr"
                        fallback="QR galleria online"
                      />
                    </p>

                    <p className="catalog-body-text mt-3">
                      <T
                        textKey="catalog.print.qrDescription"
                        fallback="Scansiona il codice per aprire direttamente la galleria digitale online."
                      />
                    </p>

                    <p className="mt-3 break-all text-[10px] leading-5 text-[#5c4b39]">
                      {gallery.publicUrl}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-12">
                <p className="catalog-small-caps text-[#8b6a43]">
                  <T
                    textKey="catalog.print.curatorialText"
                    fallback="Testo curatoriale"
                  />
                </p>

                <p className="catalog-body-text mt-6 whitespace-pre-line">
                  {introText ? (
                    introText
                  ) : (
                    <T
                      textKey="catalog.print.missingCuratorialText"
                      fallback="Testo curatoriale non inserito. Usa il pannello di configurazione per aggiungere una descrizione critica o curatoriale della mostra."
                    />
                  )}
                </p>
              </div>
            </div>

            <p className="catalog-small-caps text-[#8b6a43]">
              <T
                textKey="catalog.print.digitalCatalog"
                fallback="mostra.space · catalogo digitale"
              />
            </p>
          </div>
        </section>

        {displayedArtworks.length === 0 && (
          <section className="catalog-page">
            <p className="catalog-small-caps text-[#8b6a43]">
              <T
                textKey="catalog.print.artworksCatalog"
                fallback="Catalogo opere"
              />
            </p>

            <h2 className="mt-8 text-[34px] font-normal">
              <T
                textKey="catalog.print.noArtworksIncluded"
                fallback="Nessuna opera inclusa"
              />
            </h2>

            <p className="catalog-body-text mt-8">
              <T
                textKey="catalog.print.noArtworksDescription"
                fallback="Non ci sono opere selezionabili per questo catalogo. Controlla se le opere sono state collegate alla galleria oppure se hai escluso le opere private."
              />
            </p>
          </section>
        )}

        {displayedArtworks.length > 0 &&
          layoutVariant === "elegant" &&
          displayedArtworks.map((artwork, index) => {
            const artworkPrice = formatPrice(artwork.price, artwork.currency);
            const artworkDimensions = formatDimensions(artwork);

            return (
              <section
                key={artwork.galleryArtworkId}
                className="catalog-page flex flex-col"
              >
                <div className="mb-8 flex items-start justify-between gap-8">
                  <div>
                    <p className="catalog-small-caps text-[#8b6a43]">
                      <T
                        textKey="catalog.print.artworkNumber"
                        fallback="Opera"
                      />{" "}
                      {String(index + 1).padStart(2, "0")}
                    </p>

                    <h2 className="mt-4 text-[30px] font-normal leading-tight">
                      {artwork.title ? (
                        artwork.title
                      ) : (
                        <T
                          textKey="catalog.print.untitledArtwork"
                          fallback="Opera senza titolo"
                        />
                      )}
                    </h2>

                    {artwork.artistName && (
                      <p className="mt-3 text-[18px] text-[#5c4b39]">
                        {artwork.artistName}
                      </p>
                    )}
                  </div>

                  <p className="catalog-small-caps text-[#8b6a43]">
                    {galleryName || "MostraSpace"}
                  </p>
                </div>

                <div className="flex flex-1 items-center justify-center border border-[#d8c9b0] bg-[#eee6d8] p-4">
                  {getCatalogArtworkImageUrl(artwork, "elegant") ? (
                    <img
                      src={getCatalogArtworkImageUrl(artwork, "elegant")}
                      alt={getArtworkCaption(artwork)}
                      className="catalog-artwork-image"
                    />
                  ) : (
                    <div className="flex h-[120mm] w-full items-center justify-center text-sm text-[#8b6a43]">
                      <T
                        textKey="catalog.print.imageUnavailable"
                        fallback="Immagine non disponibile"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-8 grid gap-8 md:grid-cols-[55mm_1fr]">
                  <dl className="space-y-3 text-sm">
                    {artwork.year && (
                      <div>
                        <dt className="catalog-small-caps text-[#8b6a43]">
                          <T textKey="catalog.print.year" fallback="Anno" />
                        </dt>
                        <dd className="mt-1">{artwork.year}</dd>
                      </div>
                    )}

                    {artwork.technique && (
                      <div>
                        <dt className="catalog-small-caps text-[#8b6a43]">
                          <T
                            textKey="catalog.print.technique"
                            fallback="Tecnica"
                          />
                        </dt>
                        <dd className="mt-1">{artwork.technique}</dd>
                      </div>
                    )}

                    {artworkDimensions && (
                      <div>
                        <dt className="catalog-small-caps text-[#8b6a43]">
                          <T
                            textKey="catalog.print.dimensions"
                            fallback="Dimensioni"
                          />
                        </dt>
                        <dd className="mt-1">{artworkDimensions}</dd>
                      </div>
                    )}

                    {includePrices && (
                      <div>
                        <dt className="catalog-small-caps text-[#8b6a43]">
                          <T
                            textKey="catalog.print.availability"
                            fallback="Disponibilità"
                          />
                        </dt>
                        <dd className="mt-1">
                          {artwork.isForSale ? (
                            artworkPrice || (
                              <T
                                textKey="catalog.print.priceOnRequest"
                                fallback="Prezzo su richiesta"
                              />
                            )
                          ) : (
                            <T
                              textKey="catalog.print.notForSale"
                              fallback="Non in vendita"
                            />
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {includeDescriptions && (
                    <div>
                      <p className="catalog-small-caps text-[#8b6a43]">
                        <T
                          textKey="catalog.print.description"
                          fallback="Descrizione"
                        />
                      </p>

                      <p className="catalog-body-text mt-3 whitespace-pre-line">
                        {artwork.description ? (
                          artwork.description
                        ) : (
                          <T
                            textKey="catalog.print.missingArtworkDescription"
                            fallback="Descrizione non inserita per questa opera."
                          />
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}

        {displayedArtworks.length > 0 &&
          layoutVariant === "compact" &&
          chunkItems(displayedArtworks, 2).map((chunk, pageIndex) => (
            <section
              key={`compact-${pageIndex}`}
              className="catalog-page flex flex-col"
            >
              <p className="catalog-small-caps text-[#8b6a43]">
                <T
                  textKey="catalog.print.artworksCatalog"
                  fallback="Catalogo opere"
                />{" "}
                · {galleryName || "MostraSpace"}
              </p>

              <div className="mt-8 grid flex-1 gap-6">
                {chunk.map((artwork, index) => {
                  const absoluteIndex = pageIndex * 2 + index;
                  const artworkPrice = formatPrice(
                    artwork.price,
                    artwork.currency
                  );
                  const artworkDimensions = formatDimensions(artwork);

                  return (
                    <div
                      key={artwork.galleryArtworkId}
                      className="grid grid-cols-[58mm_1fr] gap-6 border-b border-[#d8c9b0] pb-6"
                    >
                      <div className="flex h-[82mm] items-center justify-center border border-[#d8c9b0] bg-[#eee6d8] p-2">
                        {getCatalogArtworkImageUrl(artwork, "compact") ? (
                          <img
                            src={getCatalogArtworkImageUrl(artwork, "compact")}
                            alt={getArtworkCaption(artwork)}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="text-xs text-[#8b6a43]">
                            <T
                              textKey="catalog.print.imageUnavailable"
                              fallback="Immagine non disponibile"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="catalog-small-caps text-[#8b6a43]">
                          <T
                            textKey="catalog.print.artworkNumber"
                            fallback="Opera"
                          />{" "}
                          {String(absoluteIndex + 1).padStart(2, "0")}
                        </p>

                        <h3 className="mt-3 text-[23px] font-normal leading-tight">
                          {artwork.title ? (
                            artwork.title
                          ) : (
                            <T
                              textKey="catalog.print.untitledArtwork"
                              fallback="Opera senza titolo"
                            />
                          )}
                        </h3>

                        {artwork.artistName && (
                          <p className="mt-2 text-[15px] text-[#5c4b39]">
                            {artwork.artistName}
                          </p>
                        )}

                        <dl className="mt-4 grid gap-2 text-[11px] leading-5">
                          {artwork.year && (
                            <div>
                              <dt className="catalog-small-caps text-[#8b6a43]">
                                <T
                                  textKey="catalog.print.year"
                                  fallback="Anno"
                                />
                              </dt>
                              <dd>{artwork.year}</dd>
                            </div>
                          )}

                          {artwork.technique && (
                            <div>
                              <dt className="catalog-small-caps text-[#8b6a43]">
                                <T
                                  textKey="catalog.print.technique"
                                  fallback="Tecnica"
                                />
                              </dt>
                              <dd>{artwork.technique}</dd>
                            </div>
                          )}

                          {artworkDimensions && (
                            <div>
                              <dt className="catalog-small-caps text-[#8b6a43]">
                                <T
                                  textKey="catalog.print.dimensions"
                                  fallback="Dimensioni"
                                />
                              </dt>
                              <dd>{artworkDimensions}</dd>
                            </div>
                          )}

                          {includePrices && (
                            <div>
                              <dt className="catalog-small-caps text-[#8b6a43]">
                                <T
                                  textKey="catalog.print.availability"
                                  fallback="Disponibilità"
                                />
                              </dt>
                              <dd>
                                {artwork.isForSale ? (
                                  artworkPrice || (
                                    <T
                                      textKey="catalog.print.priceOnRequest"
                                      fallback="Prezzo su richiesta"
                                    />
                                  )
                                ) : (
                                  <T
                                    textKey="catalog.print.notForSale"
                                    fallback="Non in vendita"
                                  />
                                )}
                              </dd>
                            </div>
                          )}
                        </dl>

                        {includeDescriptions && (
                          <p className="mt-4 text-[11px] leading-5">
                            {artwork.description ? (
                              artwork.description
                            ) : (
                              <T
                                textKey="catalog.print.missingArtworkDescription"
                                fallback="Descrizione non inserita per questa opera."
                              />
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

        {displayedArtworks.length > 0 &&
          layoutVariant === "price_list" &&
          chunkItems(displayedArtworks, 6).map((chunk, pageIndex) => (
            <section key={`list-${pageIndex}`} className="catalog-page">
              <p className="catalog-small-caps text-[#8b6a43]">
                <T
                  textKey="catalog.print.artworksPriceList"
                  fallback="Listino opere"
                />{" "}
                · {galleryName || "MostraSpace"}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4">
                {chunk.map((artwork, index) => {
                  const absoluteIndex = pageIndex * 6 + index;
                  const artworkPrice = formatPrice(
                    artwork.price,
                    artwork.currency
                  );
                  const artworkDimensions = formatDimensions(artwork);

                  return (
                    <div
                      key={artwork.galleryArtworkId}
                      className="min-h-[70mm] border border-[#d8c9b0] p-3"
                    >
                      <div className="flex h-[30mm] items-center justify-center bg-[#eee6d8] p-1">
                        {getCatalogArtworkImageUrl(artwork, "price_list") ? (
                          <img
                            src={getCatalogArtworkImageUrl(artwork, "price_list")}
                            alt={getArtworkCaption(artwork)}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-[#8b6a43]">
                            <T
                              textKey="catalog.print.noImage"
                              fallback="No image"
                            />
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-[10px] text-[#8b6a43]">
                        {String(absoluteIndex + 1).padStart(2, "0")}
                      </p>

                      <h3 className="mt-1 text-[14px] font-normal leading-tight">
                        {artwork.title ? (
                          artwork.title
                        ) : (
                          <T
                            textKey="catalog.print.untitledArtwork"
                            fallback="Opera senza titolo"
                          />
                        )}
                      </h3>

                      <p className="mt-2 text-[9px] leading-4 text-[#5c4b39]">
                        {[
                          artwork.artistName,
                          artwork.year,
                          artwork.technique,
                          artworkDimensions,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>

                      {includePrices && (
                        <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[#8b6a43]">
                          {artwork.isForSale ? (
                            artworkPrice || (
                              <T
                                textKey="catalog.print.priceOnRequest"
                                fallback="Prezzo su richiesta"
                              />
                            )
                          ) : (
                            <T
                              textKey="catalog.print.notForSale"
                              fallback="Non in vendita"
                            />
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

        <section className="catalog-page catalog-page-dark flex flex-col justify-between">
          <div>
            <p className="catalog-small-caps text-[#b9905b]">
              <T textKey="catalog.contacts.label" fallback="Contatti" />
            </p>

            <h2 className="mt-8 max-w-[150mm] text-[40px] font-normal leading-tight">
              <T
                textKey="catalog.contacts.title"
                fallback="Visita la galleria online"
              />
            </h2>

            <p className="mt-8 max-w-[140mm] text-[16px] leading-8 text-[#d8c9b0]">
              <T
                textKey="catalog.contacts.description"
                fallback="Questo catalogo nasce dalla galleria digitale pubblicata su mostra.space. Consulta la mostra online per visitare lo spazio 3D, scoprire le opere e inviare richieste."
              />
            </p>

            <div className="mt-12 space-y-5 text-sm leading-7 text-[#d8c9b0]">
              {includePublicLink && (
                <p className="break-all">
                  <span className="catalog-small-caps block text-[#b9905b]">
                    <T
                      textKey="catalog.contacts.galleryLink"
                      fallback="Link galleria"
                    />
                  </span>
                  {gallery.publicUrl}
                </p>
              )}

              {website && website !== gallery.publicUrl && (
                <p className="break-all">
                  <span className="catalog-small-caps block text-[#b9905b]">
                    <T textKey="catalog.contacts.website" fallback="Sito" />
                  </span>
                  {website}
                </p>
              )}

              {contactEmail && (
                <p>
                  <span className="catalog-small-caps block text-[#b9905b]">
                    <T textKey="catalog.contacts.email" fallback="Email" />
                  </span>
                  {contactEmail}
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="museum-logo text-3xl leading-none text-[#f7f2e8]">
              mostra<span className="text-[#b9905b]">.</span>
              <span className="text-[#d8c9b0]">space</span>
            </p>

            <p className="mt-4 text-xs leading-6 text-[#8e7f6c]">
              <T
                textKey="catalog.contacts.generatedBy"
                fallback="Catalogo generato da MostraSpace"
              />{" "}
              · {new Date().getFullYear()}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
