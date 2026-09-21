"use client";

import { useState } from "react";

type GalleryShareEmbedSectionProps = {
  publicUrl: string;
  published: boolean;
};

export default function GalleryShareEmbedSection({
  publicUrl,
  published,
}: GalleryShareEmbedSectionProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);

  const viewerUrl = publicUrl ? `${publicUrl}#viewer` : "";
  // Usa solo la pagina pubblica già esistente: non modifica il viewer Unity.
  const iframeCode = viewerUrl
    ? `<iframe src="${viewerUrl}" title="Galleria virtuale Mostra.Space" width="100%" height="650" style="border:0;" loading="lazy" allow="fullscreen" allowfullscreen></iframe>`
    : "";

  async function copyValue(id: string, value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      setCopyError(false);
    } catch {
      setCopied(null);
      setCopyError(true);
    }
  }

  const items = [
    {
      id: "public",
      label: "Link pubblico della galleria",
      explanation: "Per condividere la pagina completa della galleria.",
      value: publicUrl,
      multiline: false,
    },
    {
      id: "viewer",
      label: "Link alla sezione 3D",
      explanation: "Apre la pagina pubblica direttamente all'altezza del viewer.",
      value: viewerUrl,
      multiline: false,
    },
    {
      id: "iframe",
      label: "Codice HTML iframe",
      explanation:
        "Da incollare in un blocco HTML del tuo sito. Incorpora la pagina pubblica, posizionandola sulla sezione 3D.",
      value: iframeCode,
      multiline: true,
    },
  ] as const;

  return (
    <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
        Condivisione e incorporamento
      </p>
      <h2 className="text-2xl font-medium">Porta la tua galleria sul tuo sito web</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
        Copia il link per condividerla oppure il codice HTML per inserirla nel tuo sito.
      </p>

      {!published ? (
        <p className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
          Pubblica la galleria per ottenere i link e il codice di incorporamento.
        </p>
      ) : (
        <div className="mt-6 grid gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
            >
              <label
                htmlFor={`gallery-share-${item.id}`}
                className="block text-sm font-medium text-neutral-100"
              >
                {item.label}
              </label>
              <p className="mt-1 text-xs leading-5 text-neutral-400">
                {item.explanation}
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                {item.multiline ? (
                  <textarea
                    id={`gallery-share-${item.id}`}
                    readOnly
                    rows={3}
                    value={item.value}
                    onClick={() => void copyValue(item.id, item.value)}
                    className="min-w-0 w-full flex-1 resize-y rounded-xl border border-neutral-700 bg-neutral-900 p-3 font-mono text-xs leading-5 text-neutral-200 outline-none focus:border-amber-700"
                    aria-label={`${item.label}: clicca per copiare`}
                  />
                ) : (
                  <input
                    id={`gallery-share-${item.id}`}
                    readOnly
                    value={item.value}
                    onClick={() => void copyValue(item.id, item.value)}
                    className="min-w-0 w-full flex-1 rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-sm text-neutral-200 outline-none focus:border-amber-700"
                    aria-label={`${item.label}: clicca per copiare`}
                  />
                )}
                <button
                  type="button"
                  disabled={!item.value}
                  onClick={() => void copyValue(item.id, item.value)}
                  className="shrink-0 rounded-full border border-amber-800 px-5 py-2 text-sm text-amber-200 transition hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copied === item.id ? "Copiato!" : item.multiline ? "Copia codice" : "Copia link"}
                </button>
              </div>
            </div>
          ))}
          {copyError && (
            <p role="alert" className="text-sm text-amber-200">
              Copia automatica non disponibile: seleziona il testo e copialo manualmente.
            </p>
          )}
          <p className="text-xs leading-5 text-neutral-500">
            L&apos;iframe mostra la pagina pubblica esistente, non un viewer separato.
            L&apos;incorporamento in siti esterni dipende anche dalle impostazioni di sicurezza del sito.
          </p>
        </div>
      )}
    </section>
  );
}
