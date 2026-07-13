"use client";

import { useMemo, useState } from "react";

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
};

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

export default function GalleryCatalogBuilder({
  gallery,
  artworks,
  defaultCuratorName,
  defaultContactEmail,
  initialSettings,
}: GalleryCatalogBuilderProps) {
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

  const displayedArtworks = useMemo(() => {
    if (includePrivateArtworks) {
      return artworks;
    }

    return artworks.filter((artwork) => artwork.isPublic);
  }, [artworks, includePrivateArtworks]);

  const coverImageUrl =
    gallery.coverImageUrl || displayedArtworks[0]?.imageUrl || "";

  function handlePrint() {
    window.print();
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

        .catalog-page {
          box-sizing: border-box;
          width: 210mm;
          min-height: 297mm;
          overflow: hidden;
          background: #f7f2e8;
          color: #16120d;
          padding: 20mm;
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
              Catalogo PDF
            </p>

            <h1 className="text-3xl font-semibold">
              Crea catalogo per “{gallery.title}”
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
              Compila i dati, controlla l’anteprima A4 e usa il pulsante
              “Esporta PDF”. Il browser aprirà la stampa: scegli “Salva come
              PDF”.
            </p>
          </div>

                    <div className="flex flex-wrap gap-3">
            <a
              href={`/dashboard/gallerie/${gallery.id}`}
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              Torna alla galleria
            </a>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="rounded-full border border-amber-800 px-5 py-2 text-sm text-amber-200 transition hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingSettings ? "Salvataggio..." : "Salva impostazioni"}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
            >
              Esporta PDF
            </button>
          </div>
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
              Dati catalogo
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  Titolo catalogo
                </label>

                <input
                  value={catalogTitle}
                  onChange={(event) => setCatalogTitle(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  Sottotitolo
                </label>

                <input
                  value={catalogSubtitle}
                  onChange={(event) => setCatalogSubtitle(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  Curatore
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
                  Galleria / organizzazione
                </label>

                <input
                  value={galleryName}
                  onChange={(event) => setGalleryName(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  Testo curatoriale / introduzione
                </label>

                <textarea
                  value={introText}
                  onChange={(event) => setIntroText(event.target.value)}
                  className="min-h-40 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm leading-6 text-neutral-100 outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  Email contatto
                </label>

                <input
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-neutral-300">
                  Sito / link
                </label>

                <input
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500"
                />
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
                  <span>Mostra descrizioni delle opere</span>
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
                  <span>Mostra prezzi / stato vendita</span>
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
                  <span>Mostra link alla galleria online</span>
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
                  <span>Includi anche opere private</span>
                </label>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
                <p>
                  Opere totali nella galleria:{" "}
                  <span className="text-neutral-100">{artworks.length}</span>
                </p>

                <p className="mt-1">
                  Opere incluse nel catalogo:{" "}
                  <span className="text-neutral-100">
                    {displayedArtworks.length}
                  </span>
                </p>

                <p className="mt-3 text-xs leading-5 text-neutral-500">
                  Layout MVP: A4 verticale, una opera per pagina.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Anteprima
            </p>

            <p className="text-sm leading-6 text-neutral-400">
              L’anteprima qui sotto è la stessa che verrà stampata. Per un PDF
              pulito, nella finestra di stampa scegli formato A4 e “Salva come
              PDF”.
            </p>
          </section>
        </div>
      </div>

      <div className="catalog-print-root">
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
            {curatorName && <p>A cura di {curatorName}</p>}
            <p>{new Date().getFullYear()}</p>
            {includePublicLink && <p>{gallery.publicUrl}</p>}
          </div>
        </section>

        <section className="catalog-page">
          <div className="flex h-full flex-col justify-between">
            <div>
              <p className="catalog-small-caps text-[#8b6a43]">
                Scheda mostra
              </p>

              <h2 className="mt-8 text-[34px] font-normal leading-tight">
                {catalogTitle || gallery.title}
              </h2>

              <dl className="mt-12 grid gap-6 border-y border-[#d8c9b0] py-8 text-sm">
                <div className="grid grid-cols-[42mm_1fr] gap-6">
                  <dt className="catalog-small-caps text-[#8b6a43]">
                    Galleria
                  </dt>
                  <dd>{galleryName || "MostraSpace"}</dd>
                </div>

                {curatorName && (
                  <div className="grid grid-cols-[42mm_1fr] gap-6">
                    <dt className="catalog-small-caps text-[#8b6a43]">
                      Curatore
                    </dt>
                    <dd>{curatorName}</dd>
                  </div>
                )}

                <div className="grid grid-cols-[42mm_1fr] gap-6">
                  <dt className="catalog-small-caps text-[#8b6a43]">Opere</dt>
                  <dd>{displayedArtworks.length}</dd>
                </div>

                <div className="grid grid-cols-[42mm_1fr] gap-6">
                  <dt className="catalog-small-caps text-[#8b6a43]">Stato</dt>
                  <dd>{gallery.status}</dd>
                </div>

                {includePublicLink && (
                  <div className="grid grid-cols-[42mm_1fr] gap-6">
                    <dt className="catalog-small-caps text-[#8b6a43]">
                      Online
                    </dt>
                    <dd className="break-all">{gallery.publicUrl}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-12">
                <p className="catalog-small-caps text-[#8b6a43]">
                  Testo curatoriale
                </p>

                <p className="catalog-body-text mt-6 whitespace-pre-line">
                  {introText ||
                    "Testo curatoriale non inserito. Usa il pannello di configurazione per aggiungere una descrizione critica o curatoriale della mostra."}
                </p>
              </div>
            </div>

            <p className="catalog-small-caps text-[#8b6a43]">
              mostra.space · catalogo digitale
            </p>
          </div>
        </section>

        {displayedArtworks.length === 0 && (
          <section className="catalog-page">
            <p className="catalog-small-caps text-[#8b6a43]">Catalogo opere</p>

            <h2 className="mt-8 text-[34px] font-normal">
              Nessuna opera inclusa
            </h2>

            <p className="catalog-body-text mt-8">
              Non ci sono opere selezionabili per questo catalogo. Controlla se
              le opere sono state collegate alla galleria oppure se hai escluso
              le opere private.
            </p>
          </section>
        )}

        {displayedArtworks.map((artwork, index) => {
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
                    Opera {String(index + 1).padStart(2, "0")}
                  </p>

                  <h2 className="mt-4 text-[30px] font-normal leading-tight">
                    {artwork.title || "Opera senza titolo"}
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
                {artwork.imageUrl ? (
                  <img
                    src={artwork.imageUrl}
                    alt={getArtworkCaption(artwork)}
                    className="catalog-artwork-image"
                  />
                ) : (
                  <div className="flex h-[120mm] w-full items-center justify-center text-sm text-[#8b6a43]">
                    Immagine non disponibile
                  </div>
                )}
              </div>

              <div className="mt-8 grid gap-8 md:grid-cols-[55mm_1fr]">
                <dl className="space-y-3 text-sm">
                  {artwork.year && (
                    <div>
                      <dt className="catalog-small-caps text-[#8b6a43]">
                        Anno
                      </dt>
                      <dd className="mt-1">{artwork.year}</dd>
                    </div>
                  )}

                  {artwork.technique && (
                    <div>
                      <dt className="catalog-small-caps text-[#8b6a43]">
                        Tecnica
                      </dt>
                      <dd className="mt-1">{artwork.technique}</dd>
                    </div>
                  )}

                  {artworkDimensions && (
                    <div>
                      <dt className="catalog-small-caps text-[#8b6a43]">
                        Dimensioni
                      </dt>
                      <dd className="mt-1">{artworkDimensions}</dd>
                    </div>
                  )}

                  {includePrices && (
                    <div>
                      <dt className="catalog-small-caps text-[#8b6a43]">
                        Disponibilità
                      </dt>
                      <dd className="mt-1">
                        {artwork.isForSale
                          ? artworkPrice || "Prezzo su richiesta"
                          : "Non in vendita"}
                      </dd>
                    </div>
                  )}
                </dl>

                {includeDescriptions && (
                  <div>
                    <p className="catalog-small-caps text-[#8b6a43]">
                      Descrizione
                    </p>

                    <p className="catalog-body-text mt-3 whitespace-pre-line">
                      {artwork.description ||
                        "Descrizione non inserita per questa opera."}
                    </p>
                  </div>
                )}
              </div>
            </section>
          );
        })}

        <section className="catalog-page catalog-page-dark flex flex-col justify-between">
          <div>
            <p className="catalog-small-caps text-[#b9905b]">Contatti</p>

            <h2 className="mt-8 max-w-[150mm] text-[40px] font-normal leading-tight">
              Visita la galleria online
            </h2>

            <p className="mt-8 max-w-[140mm] text-[16px] leading-8 text-[#d8c9b0]">
              Questo catalogo nasce dalla galleria digitale pubblicata su
              mostra.space. Consulta la mostra online per visitare lo spazio 3D,
              scoprire le opere e inviare richieste.
            </p>

            <div className="mt-12 space-y-5 text-sm leading-7 text-[#d8c9b0]">
              {includePublicLink && (
                <p className="break-all">
                  <span className="catalog-small-caps block text-[#b9905b]">
                    Link galleria
                  </span>
                  {gallery.publicUrl}
                </p>
              )}

              {website && website !== gallery.publicUrl && (
                <p className="break-all">
                  <span className="catalog-small-caps block text-[#b9905b]">
                    Sito
                  </span>
                  {website}
                </p>
              )}

              {contactEmail && (
                <p>
                  <span className="catalog-small-caps block text-[#b9905b]">
                    Email
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
              Catalogo generato da MostraSpace · {new Date().getFullYear()}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}