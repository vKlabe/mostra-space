"use client";

import { useEffect, useRef, useState } from "react";

type UnityMode = "visitor" | "editor";

type UnityGalleryViewerProps = {
  galleryId: string;
  mode: UnityMode;
};

function getViewerTitle(mode: UnityMode) {
  return mode === "editor" ? "Editor spazio 3D" : "Spazio immersivo";
}

function getViewerDescription(mode: UnityMode) {
  if (mode === "editor") {
    return "Allestisci la galleria, trascina le opere sulle pareti, modifica dimensioni e cornici, poi salva le modifiche.";
  }

  return "Entra nello spazio virtuale, muoviti tra le opere e apri le schede informative direttamente dal viewer.";
}

function getDesktopControls(mode: UnityMode) {
  if (mode === "editor") {
    return "WASD movimento · Q/E rotazione · R/F quota · mouse libero per UI e drag";
  }

  return "Click per entrare · WASD movimento · mouse visuale · Shift corsa · ESC libera mouse · SPACE comandi";
}

function getMobileControls(mode: UnityMode) {
  if (mode === "editor") {
    return "Per l’editor consigliamo desktop. Da smartphone o tablet puoi visualizzare, ma l’allestimento è più preciso da computer.";
  }

  return "Per una visita migliore ruota il dispositivo in orizzontale e apri lo spazio a schermo intero. Da mobile puoi guardarti intorno con il dito; il movimento completo è ottimizzato per desktop.";
}

export default function UnityGalleryViewer({
  galleryId,
  mode,
}: UnityGalleryViewerProps) {
  const [iframeVersion, setIframeVersion] = useState(0);
  const [isMobileViewer, setIsMobileViewer] = useState(false);
  const viewerShellRef = useRef<HTMLDivElement | null>(null);

  /**
   * IMPORTANTISSIMO:
   * Non aggiungiamo mobile=1, #mobile=1 o altri parametri all'iframe.
   * L'URL resta identico a prima per non interferire con il bootstrap Unity.
   */
  const iframeSrc = `/unity-frame?galleryId=${encodeURIComponent(
    galleryId
  )}&mode=${encodeURIComponent(mode)}&v=${iframeVersion}`;

  useEffect(() => {
    function updateDeviceMode() {
      const hasTouch =
        typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

      const smallScreen =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 1024px)").matches;

      setIsMobileViewer(Boolean(hasTouch && smallScreen));
    }

    updateDeviceMode();

    window.addEventListener("resize", updateDeviceMode);
    window.addEventListener("orientationchange", updateDeviceMode);

    return () => {
      window.removeEventListener("resize", updateDeviceMode);
      window.removeEventListener("orientationchange", updateDeviceMode);
    };
  }, []);

  function reloadIframe() {
    setIframeVersion((current) => current + 1);
  }

  async function openFullscreen() {
    const element = viewerShellRef.current;

    if (element?.requestFullscreen) {
      try {
        await element.requestFullscreen();
        return;
      } catch {
        window.open(iframeSrc, "_blank", "noopener,noreferrer");
        return;
      }
    }

    window.open(iframeSrc, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="w-full">
      {isMobileViewer && mode === "visitor" && (
        <div className="mb-4 rounded-[1.5rem] border border-[rgba(197,151,94,0.42)] bg-[rgba(168,121,69,0.1)] p-4">
          <p className="museum-label">Visita da smartphone</p>

          <h3 className="mt-2 font-editorial text-3xl font-medium text-[var(--museum-ivory)]">
            Ruota il telefono e apri a schermo intero.
          </h3>

          <p className="mt-3 text-sm leading-6 text-[var(--museum-stone)]">
            Lo spazio 3D è visitabile anche da mobile, ma per ora il movimento
            completo è ottimizzato per computer. Da smartphone puoi esplorare la
            visuale con il dito e consultare il catalogo opere sotto al viewer.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openFullscreen}
              className="museum-button-primary px-5 py-2.5"
            >
              Apri a schermo intero
            </button>

            <a href="#catalogo" className="museum-button-secondary px-5 py-2.5">
              Vai al catalogo
            </a>
          </div>
        </div>
      )}

      <div
        ref={viewerShellRef}
        className="overflow-hidden rounded-[2rem] border border-[var(--museum-border)] bg-black shadow-[var(--museum-shadow-soft)]"
      >
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--museum-border)] bg-[rgba(8,7,5,0.94)] px-5 py-4 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-editorial text-2xl font-medium text-[var(--museum-ivory)]">
                {getViewerTitle(mode)}
              </p>

              <span className="museum-pill rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em]">
                3D
              </span>

              {isMobileViewer && mode === "visitor" && (
                <span className="rounded-full border border-[rgba(197,151,94,0.42)] bg-[rgba(168,121,69,0.1)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--museum-bronze-light)]">
                  Mobile
                </span>
              )}
            </div>

            <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--museum-stone-muted)]">
              {getViewerDescription(mode)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reloadIframe}
              className="museum-button-secondary h-9 px-4 text-xs"
            >
              Ricarica
            </button>

            <button
              type="button"
              onClick={openFullscreen}
              className="museum-button-primary h-9 px-4 text-xs"
            >
              Schermo intero
            </button>
          </div>
        </div>

        <div className="relative">
          {isMobileViewer && mode === "visitor" && (
            <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] rounded-2xl border border-[rgba(8,7,5,0.72)] bg-[rgba(8,7,5,0.78)] px-4 py-3 text-xs leading-5 text-[var(--museum-ivory-soft)] backdrop-blur-md">
              Ruota il dispositivo in orizzontale · usa “Schermo intero” ·
              catalogo disponibile sotto
            </div>
          )}

          <iframe
            key={iframeVersion}
            src={iframeSrc}
            title={`3D gallery viewer ${galleryId}`}
            className="block h-[72vh] w-full bg-black"
            allow="fullscreen; gamepad; xr-spatial-tracking; clipboard-read; clipboard-write"
            allowFullScreen
          />
        </div>
      </div>

      <div className="museum-card mt-4 grid gap-3 rounded-[1.75rem] p-4 text-sm md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-[var(--museum-ivory-soft)]">
            {mode === "editor"
              ? "Ambiente editor isolato"
              : "Ambiente visitor isolato"}
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--museum-stone-muted)]">
            {isMobileViewer
              ? getMobileControls(mode)
              : getDesktopControls(mode)}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] px-4 py-3 text-xs leading-5 text-[var(--museum-stone-muted)]">
          {mode === "editor" ? (
            <>
              <p className="text-[var(--museum-ivory-soft)]">
                Promemoria editor
              </p>
              <p>Usa Salva opera, Salva tutto o attendi l’autosave.</p>
            </>
          ) : (
            <>
              <p className="text-[var(--museum-ivory-soft)]">
                Accesso alternativo
              </p>
              <p>Se lo spazio 3D non parte, consulta il catalogo opere sotto.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}