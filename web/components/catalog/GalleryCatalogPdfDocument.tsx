import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

export type CatalogLayoutVariant = "elegant" | "compact" | "price_list";

export type PdfCatalogGallery = {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string;
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
    padding: 56,
    backgroundColor: "#f7f2e8",
    color: "#16120d",
    fontFamily: "Times-Roman",
  },
  pageDark: {
    padding: 56,
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
});

function renderArtworkFacts(
  artwork: PdfCatalogArtwork,
  settings: PdfCatalogSettings
) {
  const artworkPrice = formatPrice(artwork.price, artwork.currency);
  const artworkDimensions = formatDimensions(artwork);

  return (
    <View>
      {artwork.year ? (
        <View style={styles.factBlock}>
          <Text style={styles.factLabel}>Anno</Text>
          <Text style={styles.factValue}>{artwork.year}</Text>
        </View>
      ) : null}

      {artwork.technique ? (
        <View style={styles.factBlock}>
          <Text style={styles.factLabel}>Tecnica</Text>
          <Text style={styles.factValue}>{artwork.technique}</Text>
        </View>
      ) : null}

      {artworkDimensions ? (
        <View style={styles.factBlock}>
          <Text style={styles.factLabel}>Dimensioni</Text>
          <Text style={styles.factValue}>{artworkDimensions}</Text>
        </View>
      ) : null}

      {settings.includePrices ? (
        <View style={styles.factBlock}>
          <Text style={styles.factLabel}>Disponibilità</Text>
          <Text style={styles.factValue}>
            {artwork.isForSale
              ? artworkPrice || "Prezzo su richiesta"
              : "Non in vendita"}
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

  function renderElegantPages() {
    return artworks.map((artwork, index) => (
      <Page key={artwork.galleryArtworkId} size="A4" style={styles.pageLight}>
        <View style={styles.artworkHeader}>
          <View>
            <Text style={styles.artworkNumber}>
              Opera {String(index + 1).padStart(2, "0")}
            </Text>

            <Text style={styles.artworkTitle}>
              {artwork.title || "Opera senza titolo"}
            </Text>

            {artwork.artistName ? (
              <Text style={styles.artworkArtist}>{artwork.artistName}</Text>
            ) : null}
          </View>

          <Text style={styles.smallCapsLight}>
            {settings.galleryName || "MostraSpace"}
          </Text>
        </View>

        <View style={styles.artworkImageBox}>
          {artwork.imageUrl ? (
            <Image src={artwork.imageUrl} style={styles.artworkImage} />
          ) : (
            <Text style={styles.missingImage}>Immagine non disponibile</Text>
          )}
        </View>

        <View style={styles.artworkInfoGrid}>
          <View style={styles.artworkFacts}>
            {renderArtworkFacts(artwork, settings)}
          </View>

          {settings.includeDescriptions ? (
            <View style={styles.descriptionBlock}>
              <Text style={styles.factLabel}>Descrizione</Text>

              <Text style={[styles.bodyText, { marginTop: 10 }]}>
                {artwork.description ||
                  "Descrizione non inserita per questa opera."}
              </Text>
            </View>
          ) : null}
        </View>
      </Page>
    ));
  }

  function renderCompactPages() {
    return chunkItems(artworks, 2).map((chunk, pageIndex) => (
      <Page key={`compact-${pageIndex}`} size="A4" style={styles.pageLight}>
        <Text style={styles.smallCapsLight}>
          Catalogo opere · {settings.galleryName || "MostraSpace"}
        </Text>

        <Text style={styles.sheetTitle}>
          {settings.title || gallery.title}
        </Text>

        <View style={{ marginTop: 30 }}>
          {chunk.map((artwork, index) => {
            const absoluteIndex = pageIndex * 2 + index;

            return (
              <View key={artwork.galleryArtworkId} style={styles.compactItem}>
                <View style={styles.compactImageBox}>
                  {artwork.imageUrl ? (
                    <Image src={artwork.imageUrl} style={styles.artworkImage} />
                  ) : (
                    <Text style={styles.missingImage}>
                      Immagine non disponibile
                    </Text>
                  )}
                </View>

                <View style={styles.compactInfo}>
                  <Text style={styles.artworkNumber}>
                    Opera {String(absoluteIndex + 1).padStart(2, "0")}
                  </Text>

                  <Text style={styles.compactTitle}>
                    {artwork.title || "Opera senza titolo"}
                  </Text>

                  {artwork.artistName ? (
                    <Text style={styles.compactArtist}>
                      {artwork.artistName}
                    </Text>
                  ) : null}

                  <View style={{ marginTop: 12 }}>
                    {renderArtworkFacts(artwork, settings)}
                  </View>

                  {settings.includeDescriptions ? (
                    <Text style={styles.compactDescription}>
                      {artwork.description ||
                        "Descrizione non inserita per questa opera."}
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
      <Page key={`list-${pageIndex}`} size="A4" style={styles.pageLight}>
        <Text style={styles.smallCapsLight}>
          Listino opere · {settings.galleryName || "MostraSpace"}
        </Text>

        <Text style={styles.sheetTitle}>
          {settings.title || gallery.title}
        </Text>

        <View style={styles.listGrid}>
          {chunk.map((artwork, index) => {
            const absoluteIndex = pageIndex * 6 + index;
            const artworkPrice = formatPrice(artwork.price, artwork.currency);
            const artworkDimensions = formatDimensions(artwork);

            return (
              <View key={artwork.galleryArtworkId} style={styles.listCard}>
                <View style={styles.listImageBox}>
                  {artwork.imageUrl ? (
                    <Image src={artwork.imageUrl} style={styles.artworkImage} />
                  ) : (
                    <Text style={styles.missingImage}>No image</Text>
                  )}
                </View>

                <Text style={styles.listMeta}>
                  {String(absoluteIndex + 1).padStart(2, "0")}
                </Text>

                <Text style={styles.listTitle}>
                  {artwork.title || "Opera senza titolo"}
                </Text>

                <Text style={styles.listMeta}>
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
                  <Text style={styles.listPrice}>
                    {artwork.isForSale
                      ? artworkPrice || "Prezzo su richiesta"
                      : "Non in vendita"}
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
        <Page size="A4" style={styles.pageLight}>
          <Text style={styles.smallCapsLight}>Catalogo opere</Text>

          <Text style={styles.sheetTitle}>Nessuna opera inclusa</Text>

          <Text style={[styles.bodyText, { marginTop: 28 }]}>
            Non ci sono opere selezionabili per questo catalogo.
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
      <Page size="A4" style={styles.pageDark}>
        <View style={styles.pageBetween}>
          <View>
            <Text style={styles.smallCapsDark}>
              {settings.galleryName || "MostraSpace"}
            </Text>

            <Text style={styles.coverTitle}>
              {settings.title || gallery.title}
            </Text>

            {settings.subtitle ? (
              <Text style={styles.coverSubtitle}>{settings.subtitle}</Text>
            ) : null}
          </View>

          {coverImageUrl ? (
            <View style={styles.coverImageBox}>
              <Image src={coverImageUrl} style={styles.coverImage} />
            </View>
          ) : null}

          <View>
            {settings.curatorName ? (
              <Text style={styles.darkMeta}>
                A cura di {settings.curatorName}
              </Text>
            ) : null}

            <Text style={styles.darkMeta}>{new Date().getFullYear()}</Text>

            {settings.includePublicLink ? (
              <Text style={styles.darkMeta}>{gallery.publicUrl}</Text>
            ) : null}
          </View>
        </View>
      </Page>

      <Page size="A4" style={styles.pageLight}>
        <View style={styles.pageBetween}>
          <View>
            <Text style={styles.smallCapsLight}>Scheda mostra</Text>

            <Text style={styles.sheetTitle}>
              {settings.title || gallery.title}
            </Text>

            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Galleria</Text>
                <Text style={styles.infoValue}>
                  {settings.galleryName || "MostraSpace"}
                </Text>
              </View>

              {settings.curatorName ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Curatore</Text>
                  <Text style={styles.infoValue}>{settings.curatorName}</Text>
                </View>
              ) : null}

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Opere</Text>
                <Text style={styles.infoValue}>{artworks.length}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Layout</Text>
                <Text style={styles.infoValue}>
                  {settings.layoutVariant === "compact"
                    ? "Compatto · 2 opere per pagina"
                    : settings.layoutVariant === "price_list"
                      ? "Listino · fino a 6 opere per pagina"
                      : "Elegante · 1 opera per pagina"}
                </Text>
              </View>

              {settings.includePublicLink ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Online</Text>
                  <Text style={styles.infoValue}>{gallery.publicUrl}</Text>
                </View>
              ) : null}
            </View>

            <View style={{ marginTop: 46 }}>
              <Text style={styles.smallCapsLight}>Testo curatoriale</Text>

              <Text style={[styles.bodyText, { marginTop: 22 }]}>
                {settings.introText ||
                  "Testo curatoriale non inserito. Completa le impostazioni del catalogo dalla dashboard."}
              </Text>
            </View>
          </View>

          <Text style={styles.smallCapsLight}>
            mostra.space · catalogo digitale
          </Text>
        </View>
      </Page>

      {renderSelectedLayoutPages()}

      <Page size="A4" style={styles.pageDark}>
        <View style={styles.pageBetween}>
          <View>
            <Text style={styles.smallCapsDark}>Contatti</Text>

            <Text style={styles.finalTitle}>Visita la galleria online</Text>

            <Text style={styles.finalText}>
              Questo catalogo nasce dalla galleria digitale pubblicata su
              mostra.space. Consulta la mostra online per visitare lo spazio 3D,
              scoprire le opere e inviare richieste.
            </Text>

            <View style={styles.finalInfo}>
              {settings.includePublicLink ? (
                <View style={{ marginBottom: 18 }}>
                  <Text style={styles.smallCapsDark}>Link galleria</Text>
                  <Text>{gallery.publicUrl}</Text>
                </View>
              ) : null}

              {settings.website && settings.website !== gallery.publicUrl ? (
                <View style={{ marginBottom: 18 }}>
                  <Text style={styles.smallCapsDark}>Sito</Text>
                  <Text>{settings.website}</Text>
                </View>
              ) : null}

              {settings.contactEmail ? (
                <View>
                  <Text style={styles.smallCapsDark}>Email</Text>
                  <Text>{settings.contactEmail}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View>
            <Text style={styles.finalLogo}>mostra.space</Text>

            <Text style={styles.finalMuted}>
              Catalogo generato da MostraSpace · {new Date().getFullYear()}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}