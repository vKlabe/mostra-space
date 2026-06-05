"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type GalleryStatus = "draft" | "published" | "archived";

type AdminGalleryControlsProps = {
  galleryId: string;
  currentStatus: GalleryStatus;
};

const statusOptions: Array<{
  value: GalleryStatus;
  label: string;
}> = [
  {
    value: "draft",
    label: "Bozza",
  },
  {
    value: "published",
    label: "Pubblicata",
  },
  {
    value: "archived",
    label: "Archiviata",
  },
];

export default function AdminGalleryControls({
  galleryId,
  currentStatus,
}: AdminGalleryControlsProps) {
  const router = useRouter();

  const [status, setStatus] = useState<GalleryStatus>(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const hasChanges = status !== currentStatus;

  async function handleSave() {
    if (!hasChanges) {
      setMessage("Nessuna modifica da salvare.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/galleries/${galleryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Errore aggiornamento galleria.");
        return;
      }

      setMessage("Galleria aggiornata correttamente.");
      router.refresh();
    } catch {
      setMessage("Errore di rete durante aggiornamento galleria.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
      <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
        Stato galleria
      </label>

      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as GalleryStatus)}
        disabled={isLoading}
        className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading || !hasChanges}
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Salvataggio..." : "Salva stato"}
        </button>

        {message && <p className="text-sm text-neutral-400">{message}</p>}
      </div>
    </div>
  );
}