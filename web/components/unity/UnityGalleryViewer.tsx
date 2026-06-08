"use client";

import { useState } from "react";

type UnityMode = "visitor" | "editor";

type UnityGalleryViewerProps = {
  galleryId: string;
  mode: UnityMode;
};

function getViewerTitle(mode: UnityMode) {
  return mode === "editor" ? "Editor Unity WebGL" : "Viewer Unity WebGL";
}

function getViewerDescription(mode: UnityMode) {
  if (mode === "editor") {
    return "Allestisci la galleria 3D, trascina le opere sulle pareti, modifica dimensioni e cornici, poi salva le modifiche.";
  }

  return "Visita la galleria virtuale, muoviti nello spazio e clicca sulle opere per aprire la scheda informativa.";
}

function getViewerControls(mode: UnityMode) {
  if (mode === "editor") {
    return "WASD movimento · Q/E rotazione · R/F quota · mouse libero per UI e drag";
  }

  return "Click per entrare · WASD movimento · mouse visuale · Shift corsa · ESC libera mouse · SPACE menu";
}

export default function UnityGalleryViewer({
  galleryId,
  mode,
}: UnityGalleryViewerProps) {
  const [iframeVersion, setIframeVersion] = useState(0);

  const iframeSrc = `/unity-frame?galleryId=${encodeURIComponent(
    galleryId
  )}&mode=${encodeURIComponent(mode)}&v=${iframeVersion}`;

  function reloadIframe() {
    setIframeVersion((current) => current + 1);
  }

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-black shadow-2xl">
        <div className="flex flex-col justify-between gap-3 border-b border-neutral-800 bg-neutral-950 px-5 py-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium text-neutral-100">
              {getViewerTitle(mode)}
            </p>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-neutral-500">
              {getViewerDescription(mode)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reloadIframe}
              className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400"
            >
              Ricarica viewer
            </button>

            <a
              href={iframeSrc}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400"
            >
              Apri a schermo intero
            </a>
          </div>
        </div>

        <iframe
          key={iframeVersion}
          src={iframeSrc}
          title={`Unity gallery viewer ${galleryId}`}
          className="block h-[70vh] w-full bg-black"
          allow="fullscreen; gamepad; xr-spatial-tracking; clipboard-read; clipboard-write"
          allowFullScreen
        />
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-neutral-100">
            {mode === "editor"
              ? "Editor 3D isolato in iframe"
              : "Viewer 3D isolato in iframe"}
          </p>

          <p className="mt-1 text-xs leading-5 text-neutral-500">
            {getViewerControls(mode)}
          </p>

          <p className="mt-1 break-all text-xs text-neutral-600">
            GalleryId: {galleryId} · Mode: {mode}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-xs leading-5 text-neutral-500">
          {mode === "editor" ? (
            <>
              <p className="text-neutral-300">Promemoria editor</p>
              <p>Usa Salva opera, Salva tutto o attendi l’autosave.</p>
            </>
          ) : (
            <>
              <p className="text-neutral-300">Fallback pubblico</p>
              <p>Se il 3D non parte, usa il catalogo opere sotto al viewer.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}