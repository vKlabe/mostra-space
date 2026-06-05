"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type GalleryStatus = "draft" | "published" | "archived";

type GalleryPublishStatusButtonProps = {
  galleryId: string;
  currentStatus: GalleryStatus;
};

function getStatusLabel(status: GalleryStatus) {
  if (status === "published") {
    return "Galleria pubblicata";
  }

  if (status === "archived") {
    return "Galleria archiviata";
  }

  return "Galleria in bozza";
}

function getStatusDescription(status: GalleryStatus) {
  if (status === "published") {
    return "La galleria è visibile pubblicamente nella pagina /gallerie e nel suo link pubblico.";
  }

  if (status === "archived") {
    return "La galleria è archiviata: non è visibile pubblicamente, ma puoi ancora ripristinarla in bozza.";
  }

  return "La galleria è privata. Puoi lavorarci nell editor Unity prima di pubblicarla.";
}

function getStatusBadgeClass(status: GalleryStatus) {
  if (status === "published") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  if (status === "archived") {
    return "border-yellow-900 bg-yellow-950/40 text-yellow-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-300";
}

export default function GalleryPublishStatusButton({
  galleryId,
  currentStatus,
}: GalleryPublishStatusButtonProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function updateStatus(nextStatus: GalleryStatus) {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/dashboard/galleries/${galleryId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Errore aggiornamento status.");
        return;
      }

      if (nextStatus === "published") {
        setMessage("Galleria pubblicata correttamente.");
      }

      if (nextStatus === "draft") {
        setMessage("Galleria riportata in bozza.");
      }

      if (nextStatus === "archived") {
        setMessage("Galleria archiviata correttamente.");
      }

      router.refresh();
    } catch {
      setMessage("Errore di rete durante aggiornamento status.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Pubblicazione
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-medium">
              {getStatusLabel(currentStatus)}
            </h2>

            <span
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getStatusBadgeClass(
                currentStatus
              )}`}
            >
              {currentStatus}
            </span>
          </div>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
            {getStatusDescription(currentStatus)}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {currentStatus === "draft" && (
          <>
            <button
              type="button"
              onClick={() => updateStatus("published")}
              disabled={isLoading}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Aggiornamento..." : "Pubblica galleria"}
            </button>

            <button
              type="button"
              onClick={() => updateStatus("archived")}
              disabled={isLoading}
              className="rounded-full border border-yellow-800 px-5 py-2 text-sm text-yellow-200 transition hover:border-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Archivia galleria
            </button>
          </>
        )}

        {currentStatus === "published" && (
          <>
            <button
              type="button"
              onClick={() => updateStatus("draft")}
              disabled={isLoading}
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Aggiornamento..." : "Torna in bozza"}
            </button>

            <button
              type="button"
              onClick={() => updateStatus("archived")}
              disabled={isLoading}
              className="rounded-full border border-yellow-800 px-5 py-2 text-sm text-yellow-200 transition hover:border-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Archivia galleria
            </button>
          </>
        )}

        {currentStatus === "archived" && (
          <button
            type="button"
            onClick={() => updateStatus("draft")}
            disabled={isLoading}
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Ripristino..." : "Ripristina in bozza"}
          </button>
        )}
      </div>

      {message && (
        <p className="mt-4 text-sm text-neutral-300">
          {message}
        </p>
      )}
    </div>
  );
}