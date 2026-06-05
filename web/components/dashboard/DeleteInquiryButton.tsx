"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteInquiryButtonProps = {
  inquiryId: string;
  inquiryName: string;
};

export default function DeleteInquiryButton({
  inquiryId,
  inquiryName,
}: DeleteInquiryButtonProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      `Vuoi davvero eliminare la richiesta di "${inquiryName}"?\n\nQuesta azione non puo essere annullata.`
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/dashboard/inquiries/${inquiryId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Errore eliminazione richiesta.");
        return;
      }

      router.refresh();
    } catch {
      setMessage("Errore di rete durante eliminazione richiesta.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-red-950 bg-red-950/20 p-4">
      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-red-300">
        Zona pericolosa
      </p>

      <p className="text-sm leading-6 text-red-100/80">
        Elimina questa richiesta solo se e un test, spam o un contatto gia
        gestito.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isLoading}
          className="rounded-full border border-red-700 px-4 py-2 text-xs text-red-100 transition hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Eliminazione..." : "Elimina richiesta"}
        </button>

        {message && (
          <p className="text-xs text-red-100">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}