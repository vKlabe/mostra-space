"use client";

import { useState } from "react";
import { useWorkspaceCopy } from "@/components/dashboard/WorkspaceText";

type GalleryShareEmbedSectionProps = {
  publicUrl: string;
  published: boolean;
};

export default function GalleryShareEmbedSection({
  publicUrl,
  published,
}: GalleryShareEmbedSectionProps) {
  const text = useWorkspaceCopy();
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
      label: text("sharePublicLink"),
      explanation: text("sharePublicDetail"),
      value: publicUrl,
      multiline: false,
    },
    {
      id: "viewer",
      label: text("shareViewerLink"),
      explanation: text("shareViewerDetail"),
      value: viewerUrl,
      multiline: false,
    },
    {
      id: "iframe",
      label: text("shareEmbed"),
      explanation: text("shareEmbedDetail"),
      value: iframeCode,
      multiline: true,
    },
  ] as const;

  return (
    <section id="condividi-galleria" aria-labelledby="gallery-sharing-title" className="museum-dashboard-card mt-6 scroll-mt-48 rounded-3xl p-5 sm:p-6">
      <h2 id="gallery-sharing-title" className="font-editorial text-3xl text-[var(--museum-ivory)]">
        {text("shareGallery")}
      </h2>

      {!published ? (
        <p className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
          {text("shareUnavailable")}
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
              <p id={`gallery-share-detail-${item.id}`} className="mt-1 text-xs leading-5 text-neutral-400">
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
                  />
                ) : (
                  <input
                    id={`gallery-share-${item.id}`}
                    readOnly
                    value={item.value}
                    onClick={() => void copyValue(item.id, item.value)}
                    className="min-w-0 w-full flex-1 rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-sm text-neutral-200 outline-none focus:border-amber-700"
                  />
                )}
                <button
                  type="button"
                  disabled={!item.value}
                  onClick={() => void copyValue(item.id, item.value)}
                  aria-describedby={`gallery-share-detail-${item.id}`}
                  className={`min-h-11 shrink-0 px-5 py-2 text-sm ${item.id === "public" ? "museum-button-primary" : "museum-button-secondary"}`}
                >
                  <span aria-live="polite">{copied === item.id ? text("shareCopied") : text(item.multiline ? "shareCopyCode" : "shareCopyLink")}</span>
                </button>
              </div>
            </div>
          ))}
          {copyError && (
            <p role="alert" className="text-sm text-amber-200">
              {text("shareCopyError")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
