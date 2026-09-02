import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import T from "@/components/i18n/T";

export type CatalogLayoutVariant = "elegant" | "compact" | "price_list";
export type CatalogTheme =
  | "classic"
  | "contemporary"
  | "essential"
  | "noir"
  | "modernist_78";

export type PdfCatalogGallery = {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  qrCodeDataUrl: string;
  status: "draft" | "published" | "archived";
  publicUrl: string;
};

export type PdfCatalogArtwork = {
  galleryArtworkId: string;
  artworkId: string;
  title: string;
  artistName: string;
  year: string;
  technique: string;
  dimensions: string;
  description: string;
  imageUrl: string;
  price: number | string | null;
  currency: string;
  isForSale: boolean;
  isPublic: boolean;
  widthCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  sortOrder: number;
};

export type PdfCatalogSettings = {
  title: string;
  subtitle: string;
  curatorName: string;
  galleryName: string;
  introText: string;
  contactEmail: string;
  website: string;
  layoutVariant: CatalogLayoutVariant;
  catalogTheme?: CatalogTheme;
  includeDescriptions: boolean;
  includePrices: boolean;
  includePublicLink: boolean;
  includePrivateArtworks: boolean;
};

type GalleryCatalogPdfDocumentProps = {
  gallery: PdfCatalogGallery;
  artworks: PdfCatalogArtwork[];
  settings: PdfCatalogSettings;
};

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
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

function formatDimensions(artwork: PdfCatalogArtwork) {
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

const styles = StyleSheet.create({
  pageLight: {
    padding: 15,
    backgroundColor: "#f7f2e8",
    color: "#16120d",
    fontFamily: "Times-Roman",
  },
  pageDark: {
    padding: 15,
    backgroundColor: "#15120e",
    color: "#f7f2e8",
    fontFamily: "Times-Roman",
  },
  pageBetween: {
    flex: 1,
    justifyContent: "space-between",
  },
  smallCapsLight: {
    fontFamily: "Helvetica",
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#8b6a43",
  },
  smallCapsDark: {
    fontFamily: "Helvetica",
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#b9905b",
  },
  coverTitle: {
    marginTop: 48,
    maxWidth: 430,
    fontSize: 46,
    lineHeight: 1.05,
    fontWeight: "normal",
  },
  coverSubtitle: {
    marginTop: 22,
    maxWidth: 360,
    fontSize: 18,
    lineHeight: 1.5,
    color: "#d8c9b0",
  },
  coverImageBox: {
    marginTop: 42,
    marginBottom: 42,
    borderWidth: 1,
    borderColor: "#3a3024",
    height: 270,
  },
  coverImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  darkMeta: {
    fontSize: 12,
    lineHeight: 1.7,
    color: "#d8c9b0",
  },
  sheetTitle: {
    marginTop: 32,
    fontSize: 34,
    lineHeight: 1.15,
    fontWeight: "normal",
  },
  infoBox: {
    marginTop: 46,
    paddingTop: 24,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d8c9b0",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  infoLabel: {
    width: 120,
    fontFamily: "Helvetica",
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#8b6a43",
  },
  infoValue: {
    flex: 1,
    fontSize: 12,
    lineHeight: 1.5,
  },
  bodyText: {
    fontSize: 12,
    lineHeight: 1.75,
  },
  artworkHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  artworkNumber: {
    fontFamily: "Helvetica",
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#8b6a43",
  },
  artworkTitle: {
    marginTop: 14,
    maxWidth: 360,
    fontSize: 30,
    lineHeight: 1.1,
    fontWeight: "normal",
  },
  artworkArtist: {
    marginTop: 10,
    fontSize: 17,
    color: "#5c4b39",
  },
  artworkImageBox: {
    height: 390,
    borderWidth: 1,
    borderColor: "#d8c9b0",
    backgroundColor: "#eee6d8",
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  artworkImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  missingImage: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#8b6a43",
  },
  artworkInfoGrid: {
    flexDirection: "row",
    marginTop: 30,
  },
  artworkFacts: {
    width: 150,
    paddingRight: 20,
  },
  factBlock: {
    marginBottom: 12,
  },
  factLabel: {
    fontFamily: "Helvetica",
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#8b6a43",
  },
  factValue: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 1.45,
  },
  descriptionBlock: {
    flex: 1,
  },

  compactItem: {
    flexDirection: "row",
    minHeight: 320,
    paddingBottom: 24,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#d8c9b0",
  },
  compactImageBox: {
    width: 220,
    height: 250,
    borderWidth: 1,
    borderColor: "#d8c9b0",
    backgroundColor: "#eee6d8",
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  compactInfo: {
    flex: 1,
    paddingLeft: 24,
  },
  compactTitle: {
    fontSize: 22,
    lineHeight: 1.15,
    fontWeight: "normal",
  },
  compactArtist: {
    marginTop: 8,
    fontSize: 14,
    color: "#5c4b39",
  },
  compactDescription: {
    marginTop: 12,
    fontSize: 10,
    lineHeight: 1.55,
  },

  listGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 24,
  },
  listCard: {
    width: "48%",
    height: 205,
    marginRight: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#d8c9b0",
    padding: 10,
  },
  listImageBox: {
    height: 92,
    backgroundColor: "#eee6d8",
    justifyContent: "center",
    alignItems: "center",
  },
  listTitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 1.15,
  },
  listMeta: {
    marginTop: 4,
    fontSize: 8.5,
    lineHeight: 1.35,
    color: "#5c4b39",
  },
  listPrice: {
    marginTop: 6,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#8b6a43",
  },

  finalTitle: {
    marginTop: 32,
    maxWidth: 440,
    fontSize: 40,
    lineHeight: 1.12,
    fontWeight: "normal",
  },
  finalText: {
    marginTop: 32,
    maxWidth: 390,
    fontSize: 15,
    lineHeight: 1.75,
    color: "#d8c9b0",
  },
  finalInfo: {
    marginTop: 44,
    fontSize: 12,
    lineHeight: 1.8,
    color: "#d8c9b0",
  },
  finalLogo: {
    fontSize: 28,
    color: "#f7f2e8",
  },
  finalMuted: {
    marginTop: 12,
    fontSize: 9,
    lineHeight: 1.5,
    color: "#8e7f6c",
  },
  qrSection: {
    marginTop: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "#d8c9b0",
    flexDirection: "row",
    alignItems: "center",
  },
  qrImageBox: {
    width: 88,
    height: 88,
    backgroundColor: "#ffffff",
    padding: 6,
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  qrTextBox: {
    flex: 1,
    paddingLeft: 18,
  },
  qrTitle: {
    fontFamily: "Helvetica",
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#8b6a43",
  },
  qrText: {
    marginTop: 8,
    fontSize: 10,
    lineHeight: 1.5,
  },
});

type CatalogStyleMap = typeof styles;
type CatalogStyleOverrides = Partial<
  Record<keyof CatalogStyleMap, Record<string, string | number>>
>;

const catalogThemeOverrides: Record<CatalogTheme, CatalogStyleOverrides> = {
  classic: {},
  contemporary: {
    pageLight: {
      position: "relative",
      padding: 24,
      backgroundColor: "#ffffff",
      color: "#0b0b0b",
      fontFamily: "Helvetica",
    },
    pageDark: {
      position: "relative",
      padding: 24,
      backgroundColor: "#0a0a0a",
      color: "#ffffff",
      fontFamily: "Helvetica",
    },
    smallCapsLight: {
      fontFamily: "Helvetica-Bold",
      fontSize: 7.5,
      letterSpacing: 2.5,
      color: "#2246ff",
    },
    smallCapsDark: {
      fontFamily: "Helvetica-Bold",
      fontSize: 7.5,
      letterSpacing: 2.5,
      color: "#8da0ff",
    },
    coverTitle: {
      marginTop: 34,
      fontFamily: "Helvetica-Bold",
      fontSize: 54,
      lineHeight: 0.98,
    },
    coverSubtitle: {
      marginTop: 18,
      fontFamily: "Helvetica",
      fontSize: 15,
      lineHeight: 1.45,
      color: "#d8d8d8",
    },
    coverImageBox: {
      marginTop: 32,
      marginBottom: 32,
      borderWidth: 2,
      borderColor: "#2246ff",
      height: 290,
    },
    darkMeta: {
      fontFamily: "Helvetica",
      fontSize: 10,
      color: "#d8d8d8",
    },
    sheetTitle: {
      marginTop: 28,
      fontFamily: "Helvetica-Bold",
      fontSize: 38,
      lineHeight: 1.02,
    },
    infoBox: {
      marginTop: 36,
      borderColor: "#2246ff",
      borderTopWidth: 2,
      borderBottomWidth: 2,
    },
    infoLabel: {
      fontFamily: "Helvetica-Bold",
      color: "#2246ff",
    },
    infoValue: { fontFamily: "Helvetica", fontSize: 11 },
    bodyText: { fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.62 },
    artworkNumber: {
      fontFamily: "Helvetica-Bold",
      color: "#2246ff",
      letterSpacing: 2.2,
    },
    artworkTitle: {
      fontFamily: "Helvetica-Bold",
      fontSize: 34,
      lineHeight: 1.02,
    },
    artworkArtist: {
      fontFamily: "Helvetica",
      color: "#4d4d4d",
      fontSize: 14,
    },
    artworkImageBox: {
      borderWidth: 2,
      borderColor: "#bfc7ff",
      backgroundColor: "#f2f3f7",
      padding: 8,
    },
    missingImage: { fontFamily: "Helvetica", color: "#2246ff" },
    factLabel: { fontFamily: "Helvetica-Bold", color: "#2246ff" },
    factValue: { fontFamily: "Helvetica", fontSize: 10.5 },
    compactItem: { borderBottomColor: "#bfc7ff" },
    compactImageBox: {
      borderWidth: 2,
      borderColor: "#bfc7ff",
      backgroundColor: "#f2f3f7",
    },
    compactTitle: { fontFamily: "Helvetica-Bold", fontSize: 23 },
    compactArtist: { fontFamily: "Helvetica", color: "#4d4d4d" },
    compactDescription: { fontFamily: "Helvetica", lineHeight: 1.45 },
    listCard: { borderColor: "#bfc7ff", borderWidth: 2 },
    listImageBox: { backgroundColor: "#f2f3f7" },
    listTitle: { fontFamily: "Helvetica-Bold" },
    listMeta: { fontFamily: "Helvetica", color: "#4d4d4d" },
    listPrice: { fontFamily: "Helvetica-Bold", color: "#2246ff" },
    finalTitle: { fontFamily: "Helvetica-Bold", fontSize: 46, lineHeight: 1.0 },
    finalText: { fontFamily: "Helvetica", color: "#d8d8d8" },
    finalInfo: { fontFamily: "Helvetica", color: "#d8d8d8" },
    finalLogo: { fontFamily: "Helvetica-Bold", color: "#ffffff" },
    finalMuted: { fontFamily: "Helvetica", color: "#999999" },
    qrSection: { borderColor: "#2246ff", borderWidth: 2 },
    qrTitle: { fontFamily: "Helvetica-Bold", color: "#2246ff" },
    qrText: { fontFamily: "Helvetica" },
  },
  essential: {
    pageLight: {
      position: "relative",
      padding: 34,
      backgroundColor: "#fbfaf7",
      color: "#1f1f1d",
      fontFamily: "Times-Roman",
    },
    pageDark: {
      position: "relative",
      padding: 34,
      backgroundColor: "#fbfaf7",
      color: "#1f1f1d",
      fontFamily: "Times-Roman",
    },
    smallCapsLight: {
      color: "#77736d",
      letterSpacing: 2.6,
      fontSize: 7,
    },
    smallCapsDark: {
      color: "#77736d",
      letterSpacing: 2.6,
      fontSize: 7,
    },
    coverTitle: { marginTop: 82, fontSize: 42, lineHeight: 1.08 },
    coverSubtitle: { color: "#68645f", fontSize: 15, lineHeight: 1.6 },
    coverImageBox: {
      marginTop: 54,
      marginBottom: 54,
      borderColor: "#d8d4ce",
      height: 245,
    },
    darkMeta: { color: "#68645f", fontSize: 10.5 },
    sheetTitle: { marginTop: 42, fontSize: 32 },
    infoBox: { marginTop: 54, borderColor: "#d8d4ce" },
    infoLabel: { color: "#77736d", letterSpacing: 2.2 },
    infoValue: { color: "#2b2a28" },
    bodyText: { fontSize: 11.5, lineHeight: 1.85 },
    artworkHeader: { marginBottom: 34 },
    artworkNumber: { color: "#77736d", letterSpacing: 2.2 },
    artworkTitle: { fontSize: 29, lineHeight: 1.13 },
    artworkArtist: { color: "#68645f", fontSize: 15 },
    artworkImageBox: {
      borderColor: "#d8d4ce",
      backgroundColor: "#f1efeb",
      padding: 16,
    },
    missingImage: { color: "#77736d" },
    factLabel: { color: "#77736d" },
    compactItem: { borderBottomColor: "#d8d4ce" },
    compactImageBox: { borderColor: "#d8d4ce", backgroundColor: "#f1efeb" },
    compactArtist: { color: "#68645f" },
    listCard: { borderColor: "#d8d4ce" },
    listImageBox: { backgroundColor: "#f1efeb" },
    listMeta: { color: "#68645f" },
    listPrice: { color: "#77736d" },
    finalTitle: { fontSize: 38, color: "#1f1f1d" },
    finalText: { color: "#68645f" },
    finalInfo: { color: "#68645f" },
    finalLogo: { color: "#1f1f1d" },
    finalMuted: { color: "#77736d" },
    qrSection: { borderColor: "#d8d4ce" },
    qrTitle: { color: "#77736d" },
  },
  noir: {
    pageLight: {
      position: "relative",
      backgroundColor: "#11110f",
      color: "#f5efe5",
      fontFamily: "Times-Roman",
    },
    pageDark: {
      position: "relative",
      backgroundColor: "#070706",
      color: "#fffaf0",
      fontFamily: "Times-Roman",
    },
    smallCapsLight: { color: "#bd9561" },
    smallCapsDark: { color: "#d7b27d" },
    coverSubtitle: { color: "#d7ccbd" },
    coverImageBox: { borderColor: "#4a4339" },
    darkMeta: { color: "#d7ccbd" },
    infoBox: { borderColor: "#4a4339" },
    infoLabel: { color: "#bd9561" },
    infoValue: { color: "#f5efe5" },
    bodyText: { color: "#eee5d8" },
    artworkNumber: { color: "#bd9561" },
    artworkArtist: { color: "#b9ad9d" },
    artworkImageBox: {
      borderColor: "#4a4339",
      backgroundColor: "#1b1a17",
    },
    missingImage: { color: "#bd9561" },
    factLabel: { color: "#bd9561" },
    factValue: { color: "#eee5d8" },
    compactItem: { borderBottomColor: "#4a4339" },
    compactImageBox: {
      borderColor: "#4a4339",
      backgroundColor: "#1b1a17",
    },
    compactArtist: { color: "#b9ad9d" },
    compactDescription: { color: "#eee5d8" },
    listCard: { borderColor: "#4a4339" },
    listImageBox: { backgroundColor: "#1b1a17" },
    listMeta: { color: "#b9ad9d" },
    listPrice: { color: "#bd9561" },
    finalText: { color: "#d7ccbd" },
    finalInfo: { color: "#d7ccbd" },
    finalLogo: { color: "#fffaf0" },
    finalMuted: { color: "#8f8577" },
    qrSection: { borderColor: "#4a4339" },
    qrTitle: { color: "#bd9561" },
    qrText: { color: "#eee5d8" },
  },
  modernist_78: {
    pageLight: {
      position: "relative",
      padding: 24,
      backgroundColor: "#eee3cd",
      color: "#20292d",
      fontFamily: "Helvetica",
    },
    pageDark: {
      position: "relative",
      padding: 24,
      backgroundColor: "#273238",
      color: "#f6eddc",
      fontFamily: "Helvetica",
    },
    smallCapsLight: {
      fontFamily: "Helvetica-Bold",
      color: "#c84f2a",
      letterSpacing: 2.2,
    },
    smallCapsDark: {
      fontFamily: "Helvetica-Bold",
      color: "#f09a4c",
      letterSpacing: 2.2,
    },
    coverTitle: {
      marginTop: 38,
      fontFamily: "Helvetica-Bold",
      fontSize: 51,
      lineHeight: 0.98,
    },
    coverSubtitle: {
      fontFamily: "Helvetica",
      color: "#eadcc5",
      fontSize: 15,
    },
    coverImageBox: {
      borderWidth: 3,
      borderColor: "#c84f2a",
      height: 280,
    },
    darkMeta: { fontFamily: "Helvetica", color: "#eadcc5" },
    sheetTitle: { fontFamily: "Helvetica-Bold", fontSize: 37, lineHeight: 1.02 },
    infoBox: { borderColor: "#9c917b", borderTopWidth: 2, borderBottomWidth: 2 },
    infoLabel: { fontFamily: "Helvetica-Bold", color: "#c84f2a" },
    infoValue: { fontFamily: "Helvetica" },
    bodyText: { fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.6 },
    artworkNumber: { fontFamily: "Helvetica-Bold", color: "#c84f2a" },
    artworkTitle: { fontFamily: "Helvetica-Bold", fontSize: 32, lineHeight: 1.0 },
    artworkArtist: { fontFamily: "Helvetica", color: "#4a565a", fontSize: 14 },
    artworkImageBox: {
      borderWidth: 2,
      borderColor: "#9c917b",
      backgroundColor: "#ddd0b7",
      padding: 8,
    },
    missingImage: { fontFamily: "Helvetica", color: "#c84f2a" },
    factLabel: { fontFamily: "Helvetica-Bold", color: "#c84f2a" },
    factValue: { fontFamily: "Helvetica" },
    compactItem: { borderBottomColor: "#9c917b", borderBottomWidth: 2 },
    compactImageBox: {
      borderWidth: 2,
      borderColor: "#9c917b",
      backgroundColor: "#ddd0b7",
    },
    compactTitle: { fontFamily: "Helvetica-Bold", fontSize: 23 },
    compactArtist: { fontFamily: "Helvetica", color: "#4a565a" },
    compactDescription: { fontFamily: "Helvetica" },
    listCard: { borderWidth: 2, borderColor: "#9c917b" },
    listImageBox: { backgroundColor: "#ddd0b7" },
    listTitle: { fontFamily: "Helvetica-Bold" },
    listMeta: { fontFamily: "Helvetica", color: "#4a565a" },
    listPrice: { fontFamily: "Helvetica-Bold", color: "#c84f2a" },
    finalTitle: { fontFamily: "Helvetica-Bold", fontSize: 44, lineHeight: 1.0 },
    finalText: { fontFamily: "Helvetica", color: "#eadcc5" },
    finalInfo: { fontFamily: "Helvetica", color: "#eadcc5" },
    finalLogo: { fontFamily: "Helvetica-Bold", color: "#f6eddc" },
    finalMuted: { fontFamily: "Helvetica", color: "#b6aa96" },
    qrSection: { borderWidth: 2, borderColor: "#c84f2a" },
    qrTitle: { fontFamily: "Helvetica-Bold", color: "#c84f2a" },
    qrText: { fontFamily: "Helvetica" },
  },
};

function getCatalogStyles(theme: CatalogTheme): CatalogStyleMap {
  const override = catalogThemeOverrides[theme] || catalogThemeOverrides.classic;
  const merged: Record<string, unknown> = {};

  for (const key of Object.keys(styles) as Array<keyof CatalogStyleMap>) {
    merged[key as string] = {
      ...(styles[key] as unknown as Record<string, unknown>),
      ...(override[key] || {}),
    };
  }

  return merged as unknown as CatalogStyleMap;
}

function renderThemeDecoration(theme: CatalogTheme | undefined, dark = false) {
  if (theme === "contemporary") {
    return (
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 9,
          height: "100%",
          backgroundColor: dark ? "#8da0ff" : "#2246ff",
        }}
      />
    );
  }

  if (theme === "essential") {
    return (
      <View
        style={{
          position: "absolute",
          left: 34,
          right: 34,
          top: 24,
          height: 0.7,
          backgroundColor: "#d8d4ce",
        }}
      />
    );
  }

  if (theme === "noir") {
    return (
      <View
        style={{
          position: "absolute",
          left: 15,
          right: 15,
          top: 15,
          height: 1,
          backgroundColor: dark ? "#d7b27d" : "#bd9561",
        }}
      />
    );
  }

  if (theme === "modernist_78") {
    return (
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: 16,
          width: 150,
          backgroundColor: "#c84f2a",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: 150,
            top: 0,
            height: 16,
            width: 78,
            backgroundColor: "#d9a63d",
          }}
        />
      </View>
    );
  }

  return null;
}


function renderArtworkFacts(
  artwork: PdfCatalogArtwork,
  settings: PdfCatalogSettings,
  activeStyles: CatalogStyleMap
) {
  const artworkPrice = formatPrice(artwork.price, artwork.currency);
  const artworkDimensions = formatDimensions(artwork);

  return (
    <View>
      {artwork.year ? (
        <View style={activeStyles.factBlock}>
          <Text style={activeStyles.factLabel}>
            <T textKey="catalog.pdf.artwork.year" fallback="Anno" />
          </Text>
          <Text style={activeStyles.factValue}>{artwork.year}</Text>
        </View>
      ) : null}

      {artwork.technique ? (
        <View style={activeStyles.factBlock}>
          <Text style={activeStyles.factLabel}>
            <T textKey="catalog.pdf.artwork.technique" fallback="Tecnica" />
          </Text>
          <Text style={activeStyles.factValue}>{artwork.technique}</Text>
        </View>
      ) : null}

      {artworkDimensions ? (
        <View style={activeStyles.factBlock}>
          <Text style={activeStyles.factLabel}>
            <T textKey="catalog.pdf.artwork.dimensions" fallback="Dimensioni" />
          </Text>
          <Text style={activeStyles.factValue}>{artworkDimensions}</Text>
        </View>
      ) : null}

      {settings.includePrices ? (
        <View style={activeStyles.factBlock}>
          <Text style={activeStyles.factLabel}>
            <T
              textKey="catalog.pdf.artwork.availability"
              fallback="Disponibilità"
            />
          </Text>
          <Text style={activeStyles.factValue}>
            {artwork.isForSale ? (
              artworkPrice || (
                <T
                  textKey="catalog.pdf.artwork.priceOnRequest"
                  fallback="Prezzo su richiesta"
                />
              )
            ) : (
              <T
                textKey="catalog.pdf.artwork.notForSale"
                fallback="Non in vendita"
              />
            )}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function GalleryCatalogPdfDocument({
  gallery,
  artworks,
  settings,
}: GalleryCatalogPdfDocumentProps) {
  const coverImageUrl = gallery.coverImageUrl || artworks[0]?.imageUrl || "";
  const activeStyles = getCatalogStyles(settings.catalogTheme || "classic");

  function renderElegantPages() {
    return artworks.map((artwork, index) => (
      <Page key={artwork.galleryArtworkId} size="A4" style={activeStyles.pageLight}>
        {renderThemeDecoration(settings.catalogTheme)}
        <View style={activeStyles.artworkHeader}>
          <View>
            <Text style={activeStyles.artworkNumber}>
              <T textKey="catalog.pdf.artwork.number" fallback="Opera" />{" "}
              {String(index + 1).padStart(2, "0")}
            </Text>

            <Text style={activeStyles.artworkTitle}>
              {artwork.title ? (
                artwork.title
              ) : (
                <T
                  textKey="catalog.pdf.artwork.untitled"
                  fallback="Opera senza titolo"
                />
              )}
            </Text>

            {artwork.artistName ? (
              <Text style={activeStyles.artworkArtist}>{artwork.artistName}</Text>
            ) : null}
          </View>

          <Text style={activeStyles.smallCapsLight}>
            {settings.galleryName || "MostraSpace"}
          </Text>
        </View>

        <View style={activeStyles.artworkImageBox}>
          {artwork.imageUrl ? (
            <Image src={artwork.imageUrl} style={activeStyles.artworkImage} />
          ) : (
            <Text style={activeStyles.missingImage}>
              <T
                textKey="catalog.pdf.artwork.imageUnavailable"
                fallback="Immagine non disponibile"
              />
            </Text>
          )}
        </View>

        <View style={activeStyles.artworkInfoGrid}>
          <View style={activeStyles.artworkFacts}>
            {renderArtworkFacts(artwork, settings, activeStyles)}
          </View>

          {settings.includeDescriptions ? (
            <View style={activeStyles.descriptionBlock}>
              <Text style={activeStyles.factLabel}>
                <T
                  textKey="catalog.pdf.artwork.description"
                  fallback="Descrizione"
                />
              </Text>

              <Text style={[activeStyles.bodyText, { marginTop: 10 }]}>
                {artwork.description ? (
                  artwork.description
                ) : (
                  <T
                    textKey="catalog.pdf.artwork.descriptionMissing"
                    fallback="Descrizione non inserita per questa opera."
                  />
                )}
              </Text>
            </View>
          ) : null}
        </View>
      </Page>
    ));
  }

  function renderCompactPages() {
    return chunkItems(artworks, 2).map((chunk, pageIndex) => (
      <Page key={`compact-${pageIndex}`} size="A4" style={activeStyles.pageLight}>
        {renderThemeDecoration(settings.catalogTheme)}
        <Text style={activeStyles.smallCapsLight}>
          <T
            textKey="catalog.pdf.artworks.catalog"
            fallback="Catalogo opere"
          />{" "}
          · {settings.galleryName || "MostraSpace"}
        </Text>

        <View style={{ marginTop: 30 }}>
          {chunk.map((artwork, index) => {
            const absoluteIndex = pageIndex * 2 + index;

            return (
              <View key={artwork.galleryArtworkId} style={activeStyles.compactItem}>
                <View style={activeStyles.compactImageBox}>
                  {artwork.imageUrl ? (
                    <Image src={artwork.imageUrl} style={activeStyles.artworkImage} />
                  ) : (
                    <Text style={activeStyles.missingImage}>
                      <T
                        textKey="catalog.pdf.artwork.imageUnavailable"
                        fallback="Immagine non disponibile"
                      />
                    </Text>
                  )}
                </View>

                <View style={activeStyles.compactInfo}>
                  <Text style={activeStyles.artworkNumber}>
                    <T textKey="catalog.pdf.artwork.number" fallback="Opera" />{" "}
                    {String(absoluteIndex + 1).padStart(2, "0")}
                  </Text>

                  <Text style={activeStyles.compactTitle}>
                    {artwork.title ? (
                      artwork.title
                    ) : (
                      <T
                        textKey="catalog.pdf.artwork.untitled"
                        fallback="Opera senza titolo"
                      />
                    )}
                  </Text>

                  {artwork.artistName ? (
                    <Text style={activeStyles.compactArtist}>
                      {artwork.artistName}
                    </Text>
                  ) : null}

                  <View style={{ marginTop: 12 }}>
                    {renderArtworkFacts(artwork, settings, activeStyles)}
                  </View>

                  {settings.includeDescriptions ? (
                    <Text style={activeStyles.compactDescription}>
                      {artwork.description ? (
                        artwork.description
                      ) : (
                        <T
                          textKey="catalog.pdf.artwork.descriptionMissing"
                          fallback="Descrizione non inserita per questa opera."
                        />
                      )}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </Page>
    ));
  }

  function renderPriceListPages() {
    return chunkItems(artworks, 6).map((chunk, pageIndex) => (
      <Page key={`list-${pageIndex}`} size="A4" style={activeStyles.pageLight}>
        {renderThemeDecoration(settings.catalogTheme)}
        <Text style={activeStyles.smallCapsLight}>
          <T
            textKey="catalog.pdf.artworks.priceList"
            fallback="Listino opere"
          />{" "}
          · {settings.galleryName || "MostraSpace"}
        </Text>

        <View style={activeStyles.listGrid}>
          {chunk.map((artwork, index) => {
            const absoluteIndex = pageIndex * 6 + index;
            const artworkPrice = formatPrice(artwork.price, artwork.currency);
            const artworkDimensions = formatDimensions(artwork);

            return (
              <View key={artwork.galleryArtworkId} style={activeStyles.listCard}>
                <View style={activeStyles.listImageBox}>
                  {artwork.imageUrl ? (
                    <Image src={artwork.imageUrl} style={activeStyles.artworkImage} />
                  ) : (
                    <Text style={activeStyles.missingImage}>
                      <T
                        textKey="catalog.pdf.artwork.noImage"
                        fallback="No image"
                      />
                    </Text>
                  )}
                </View>

                <Text style={activeStyles.listMeta}>
                  {String(absoluteIndex + 1).padStart(2, "0")}
                </Text>

                <Text style={activeStyles.listTitle}>
                  {artwork.title ? (
                    artwork.title
                  ) : (
                    <T
                      textKey="catalog.pdf.artwork.untitled"
                      fallback="Opera senza titolo"
                    />
                  )}
                </Text>

                <Text style={activeStyles.listMeta}>
                  {[
                    artwork.artistName,
                    artwork.year,
                    artwork.technique,
                    artworkDimensions,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>

                {settings.includePrices ? (
                  <Text style={activeStyles.listPrice}>
                    {artwork.isForSale ? (
                      artworkPrice || (
                        <T
                          textKey="catalog.pdf.artwork.priceOnRequest"
                          fallback="Prezzo su richiesta"
                        />
                      )
                    ) : (
                      <T
                        textKey="catalog.pdf.artwork.notForSale"
                        fallback="Non in vendita"
                      />
                    )}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </Page>
    ));
  }

  function renderSelectedLayoutPages() {
    if (artworks.length === 0) {
      return (
        <Page size="A4" style={activeStyles.pageLight}>
          {renderThemeDecoration(settings.catalogTheme)}
          <Text style={activeStyles.smallCapsLight}>
            <T
              textKey="catalog.pdf.artworks.catalog"
              fallback="Catalogo opere"
            />
          </Text>

          <Text style={activeStyles.sheetTitle}>
            <T
              textKey="catalog.pdf.artworks.noneIncluded"
              fallback="Nessuna opera inclusa"
            />
          </Text>

          <Text style={[activeStyles.bodyText, { marginTop: 28 }]}>
            <T
              textKey="catalog.pdf.artworks.noneDescription"
              fallback="Non ci sono opere selezionabili per questo catalogo."
            />
          </Text>
        </Page>
      );
    }

    if (settings.layoutVariant === "compact") {
      return renderCompactPages();
    }

    if (settings.layoutVariant === "price_list") {
      return renderPriceListPages();
    }

    return renderElegantPages();
  }

  return (
    <Document
      title={settings.title || gallery.title}
      author={settings.curatorName || settings.galleryName || "MostraSpace"}
      subject={`Catalogo mostra ${settings.title || gallery.title}`}
      creator="MostraSpace"
      producer="MostraSpace"
    >
      <Page size="A4" style={activeStyles.pageDark}>
        {renderThemeDecoration(settings.catalogTheme, true)}
        <View style={activeStyles.pageBetween}>
          <View>
            <Text style={activeStyles.smallCapsDark}>
              {settings.galleryName || "MostraSpace"}
            </Text>

            <Text style={activeStyles.coverTitle}>
              {settings.title || gallery.title}
            </Text>

            {settings.subtitle ? (
              <Text style={activeStyles.coverSubtitle}>{settings.subtitle}</Text>
            ) : null}
          </View>

          {coverImageUrl ? (
            <View style={activeStyles.coverImageBox}>
              <Image src={coverImageUrl} style={activeStyles.coverImage} />
            </View>
          ) : null}

          <View>
            {settings.curatorName ? (
              <Text style={activeStyles.darkMeta}>
                <T textKey="catalog.pdf.cover.curatedBy" fallback="A cura di" />{" "}
                {settings.curatorName}
              </Text>
            ) : null}

            <Text style={activeStyles.darkMeta}>{new Date().getFullYear()}</Text>

            {settings.includePublicLink ? (
              <Text style={activeStyles.darkMeta}>{gallery.publicUrl}</Text>
            ) : null}
          </View>
        </View>
      </Page>

      <Page size="A4" style={activeStyles.pageLight}>
        {renderThemeDecoration(settings.catalogTheme)}
        <View style={activeStyles.pageBetween}>
          <View>
            <Text style={activeStyles.smallCapsLight}>
              <T
                textKey="catalog.pdf.showSheet.label"
                fallback="Scheda mostra"
              />
            </Text>

            <Text style={activeStyles.sheetTitle}>
              {settings.title || gallery.title}
            </Text>

            <View style={activeStyles.infoBox}>
              <View style={activeStyles.infoRow}>
                <Text style={activeStyles.infoLabel}>
                  <T
                    textKey="catalog.pdf.showSheet.gallery"
                    fallback="Galleria"
                  />
                </Text>
                <Text style={activeStyles.infoValue}>
                  {settings.galleryName || "MostraSpace"}
                </Text>
              </View>

              {settings.curatorName ? (
                <View style={activeStyles.infoRow}>
                  <Text style={activeStyles.infoLabel}>
                    <T
                      textKey="catalog.pdf.showSheet.curator"
                      fallback="Curatore"
                    />
                  </Text>
                  <Text style={activeStyles.infoValue}>{settings.curatorName}</Text>
                </View>
              ) : null}

              <View style={activeStyles.infoRow}>
                <Text style={activeStyles.infoLabel}>
                  <T
                    textKey="catalog.pdf.showSheet.artworks"
                    fallback="Opere"
                  />
                </Text>
                <Text style={activeStyles.infoValue}>{artworks.length}</Text>
              </View>

              <View style={activeStyles.infoRow}>
                <Text style={activeStyles.infoLabel}>
                  <T
                    textKey="catalog.pdf.showSheet.layout"
                    fallback="Layout"
                  />
                </Text>
                <Text style={activeStyles.infoValue}>
                  {settings.layoutVariant === "compact" ? (
                    <T
                      textKey="catalog.pdf.layout.compact"
                      fallback="Compatto · 2 opere per pagina"
                    />
                  ) : settings.layoutVariant === "price_list" ? (
                    <T
                      textKey="catalog.pdf.layout.priceList"
                      fallback="Listino · fino a 6 opere per pagina"
                    />
                  ) : (
                    <T
                      textKey="catalog.pdf.layout.elegant"
                      fallback="Elegante · 1 opera per pagina"
                    />
                  )}
                </Text>
              </View>

              {settings.includePublicLink ? (
                <View style={activeStyles.infoRow}>
                  <Text style={activeStyles.infoLabel}>
                    <T
                      textKey="catalog.pdf.showSheet.online"
                      fallback="Online"
                    />
                  </Text>
                  <Text style={activeStyles.infoValue}>{gallery.publicUrl}</Text>
                </View>
              ) : null}
            </View>

            {settings.includePublicLink && gallery.qrCodeDataUrl ? (
              <View style={activeStyles.qrSection}>
                <View style={activeStyles.qrImageBox}>
                  <Image src={gallery.qrCodeDataUrl} style={activeStyles.qrImage} />
                </View>

                <View style={activeStyles.qrTextBox}>
                  <Text style={activeStyles.qrTitle}>
                    <T
                      textKey="catalog.pdf.qr.title"
                      fallback="QR galleria online"
                    />
                  </Text>
                  <Text style={activeStyles.qrText}>
                    <T
                      textKey="catalog.pdf.qr.description"
                      fallback="Scansiona il codice per aprire direttamente la galleria digitale online."
                    />
                  </Text>
                  <Text style={activeStyles.qrText}>{gallery.publicUrl}</Text>
                </View>
              </View>
            ) : null}

            <View style={{ marginTop: 46 }}>
              <Text style={activeStyles.smallCapsLight}>
                <T
                  textKey="catalog.pdf.curatorialText.label"
                  fallback="Testo curatoriale"
                />
              </Text>

              <Text style={[activeStyles.bodyText, { marginTop: 22 }]}>
                {settings.introText ? (
                  settings.introText
                ) : (
                  <T
                    textKey="catalog.pdf.curatorialText.missing"
                    fallback="Testo curatoriale non inserito. Completa le impostazioni del catalogo dalla dashboard."
                  />
                )}
              </Text>
            </View>
          </View>

          <Text style={activeStyles.smallCapsLight}>
            <T
              textKey="catalog.pdf.footer.digitalCatalog"
              fallback="mostra.space · catalogo digitale"
            />
          </Text>
        </View>
      </Page>

      {renderSelectedLayoutPages()}

      <Page size="A4" style={activeStyles.pageDark}>
        {renderThemeDecoration(settings.catalogTheme, true)}
        <View style={activeStyles.pageBetween}>
          <View>
            <Text style={activeStyles.smallCapsDark}>
              <T textKey="catalog.pdf.contacts.label" fallback="Contatti" />
            </Text>

            <Text style={activeStyles.finalTitle}>
              <T
                textKey="catalog.pdf.contacts.title"
                fallback="Visita la galleria online"
              />
            </Text>

            <Text style={activeStyles.finalText}>
              <T
                textKey="catalog.pdf.contacts.description"
                fallback="Questo catalogo nasce dalla galleria digitale pubblicata su mostra.space. Consulta la mostra online per visitare lo spazio 3D, scoprire le opere e inviare richieste."
              />
            </Text>

            <View style={activeStyles.finalInfo}>
              {settings.includePublicLink ? (
                <View style={{ marginBottom: 18 }}>
                  <Text style={activeStyles.smallCapsDark}>
                    <T
                      textKey="catalog.pdf.contacts.galleryLink"
                      fallback="Link galleria"
                    />
                  </Text>
                  <Text>{gallery.publicUrl}</Text>
                </View>
              ) : null}

              {settings.website && settings.website !== gallery.publicUrl ? (
                <View style={{ marginBottom: 18 }}>
                  <Text style={activeStyles.smallCapsDark}>
                    <T
                      textKey="catalog.pdf.contacts.website"
                      fallback="Sito"
                    />
                  </Text>
                  <Text>{settings.website}</Text>
                </View>
              ) : null}

              {settings.contactEmail ? (
                <View>
                  <Text style={activeStyles.smallCapsDark}>
                    <T
                      textKey="catalog.pdf.contacts.email"
                      fallback="Email"
                    />
                  </Text>
                  <Text>{settings.contactEmail}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View>
            <Text style={activeStyles.finalLogo}>mostra.space</Text>

            <Text style={activeStyles.finalMuted}>
              <T
                textKey="catalog.pdf.footer.generatedBy"
                fallback="Catalogo generato da MostraSpace"
              />{" "}
              · {new Date().getFullYear()}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}