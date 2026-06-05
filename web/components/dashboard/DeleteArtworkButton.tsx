"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteArtworkButtonProps = {
  artworkId: string;
  artworkTitle: string;
};

export default function DeleteArtworkButton({
  artworkId,
  artworkTitle,
}: DeleteArtworkButtonProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      `Vuoi davvero eliminare l opera "${artworkTitle}"?\n\nQuesta azione non puo essere annullata.`
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/dashboard/artworks/${artworkId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Errore eliminazione opera.");
        return;
      }

      setMessage("Opera eliminata correttamente.");
      router.refresh();
    } catch {
      setMessage("Errore di rete durante eliminazione opera.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-red-950 bg-red-950/20 p-5">
      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-300">
        Zona pericolosa
      </p>

      <p className="text-sm leading-6 text-red-100/80">
        Puoi eliminare questa opera solo se non e gia collegata a una galleria.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isLoading}
          className="rounded-full border border-red-700 px-5 py-2 text-sm text-red-100 transition hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Eliminazione..." : "Elimina opera"}
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