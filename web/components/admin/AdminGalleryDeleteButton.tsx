"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminGalleryDeleteButtonProps = {
  galleryId: string;
  galleryTitle: string;
};

export default function AdminGalleryDeleteButton({
  galleryId,
  galleryTitle,
}: AdminGalleryDeleteButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function deleteGallery() {
    if (confirmText.trim().toUpperCase() !== "ELIMINA") {
      setMessage({
        type: "error",
        text: "Per confermare devi scrivere ELIMINA.",
      });
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/galleries/${galleryId}`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error || payload?.message || "Errore eliminazione galleria."
        );
      }

      setMessage({
        type: "success",
        text: "Galleria eliminata definitivamente.",
      });
      setConfirmText("");
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Errore eliminazione galleria.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-red-300">
        Zona pericolosa
      </p>

      <p className="mt-2 text-sm leading-6 text-red-100/80">
        Cancella definitivamente questa galleria. Le opere resteranno
        nell'archivio del proprietario, ma la galleria, l'allestimento, le
        richieste collegate e l'eventuale presenza in vetrina verranno rimossi.
      </p>

      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setMessage(null);
          }}
          className="mt-4 rounded-full border border-red-800 px-4 py-2 text-sm font-medium text-red-200 transition hover:border-red-500 hover:bg-red-950/50"
        >
          Elimina galleria
        </button>
      )}

      {isOpen && (
        <div className="mt-4 space-y-3">
          <p className="text-xs leading-5 text-red-100/70">
            Per eliminare <span className="font-semibold">{galleryTitle}</span>,
            scrivi <span className="font-semibold">ELIMINA</span> nel campo qui
            sotto.
          </p>

          <input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            disabled={isDeleting}
            className="w-full rounded-2xl border border-red-900 bg-black px-4 py-3 text-sm text-red-100 outline-none transition placeholder:text-red-200/30 focus:border-red-500 disabled:opacity-60"
            placeholder="Scrivi ELIMINA"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={deleteGallery}
              disabled={isDeleting}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Eliminazione..." : "Conferma eliminazione"}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setConfirmText("");
                setMessage(null);
              }}
              disabled={isDeleting}
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          className={
            message.type === "success"
              ? "mt-3 rounded-2xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200"
              : "mt-3 rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200"
          }
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
