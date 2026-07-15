"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import T from "@/components/i18n/T";

type GalleryStatus = "draft" | "published" | "archived";

type DeleteGalleryButtonProps = {
  galleryId: string;
  galleryTitle: string;
  currentStatus: GalleryStatus;
};

export default function DeleteGalleryButton({
  galleryId,
  galleryTitle,
  currentStatus,
}: DeleteGalleryButtonProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const canDelete = currentStatus === "draft" || currentStatus === "archived";

  async function handleDelete() {
    if (!canDelete) {
      setMessage(
        "Per eliminare una galleria pubblicata, riportala prima in bozza o archiviala."
      );
      return;
    }

    const confirmed = window.confirm(
      `Vuoi davvero eliminare la galleria "${galleryTitle}"?\n\nLe opere resteranno nell archivio, ma questa galleria e il suo allestimento verranno cancellati.`
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/dashboard/galleries/${galleryId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Errore eliminazione galleria.");
        return;
      }

      router.push("/dashboard/gallerie");
      router.refresh();
    } catch {
      setMessage("Errore di rete durante eliminazione galleria.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-red-950 bg-red-950/20 p-6">
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-300">
        <T
          textKey="dashboard.deleteGallery.header.label"
          fallback="Zona pericolosa"
        />
      </p>

      <h2 className="text-2xl font-medium text-red-50">
        <T
          textKey="dashboard.deleteGallery.header.title"
          fallback="Elimina galleria"
        />
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-red-100/80">
        <T
          textKey="dashboard.deleteGallery.header.description"
          fallback="Puoi eliminare solo gallerie in bozza o archiviate. Le opere originali non verranno cancellate: verra eliminato solo lo spazio galleria e il suo allestimento."
        />
      </p>

      {!canDelete && (
        <p className="mt-4 rounded-2xl border border-yellow-900 bg-yellow-950/30 p-4 text-sm text-yellow-100">
          <T
            textKey="dashboard.deleteGallery.warning.published"
            fallback="Questa galleria e pubblicata. Prima riportala in bozza oppure archiviala."
          />
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isLoading || !canDelete}
          className="rounded-full border border-red-700 px-5 py-2 text-sm text-red-100 transition hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <T
              textKey="dashboard.deleteGallery.actions.deleting"
              fallback="Eliminazione..."
            />
          ) : (
            <T
              textKey="dashboard.deleteGallery.actions.deletePermanently"
              fallback="Elimina definitivamente"
            />
          )}
        </button>

        {message && (
          <p className="text-sm text-red-100">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}