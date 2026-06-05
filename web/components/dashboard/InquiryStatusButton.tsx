"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type InquiryStatus = "new" | "read" | "closed";

type InquiryStatusButtonProps = {
  inquiryId: string;
  currentStatus: InquiryStatus;
};

export default function InquiryStatusButton({
  inquiryId,
  currentStatus,
}: InquiryStatusButtonProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function updateStatus(nextStatus: InquiryStatus) {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/dashboard/inquiries/${inquiryId}/status`,
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
        setMessage(data.error || "Errore aggiornamento richiesta.");
        return;
      }

      setMessage("Status aggiornato.");
      router.refresh();
    } catch {
      setMessage("Errore di rete durante aggiornamento richiesta.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {currentStatus !== "read" && (
        <button
          type="button"
          onClick={() => updateStatus("read")}
          disabled={isLoading}
          className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Segna letta
        </button>
      )}

      {currentStatus !== "new" && (
        <button
          type="button"
          onClick={() => updateStatus("new")}
          disabled={isLoading}
          className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Riapri
        </button>
      )}

      {currentStatus !== "closed" && (
        <button
          type="button"
          onClick={() => updateStatus("closed")}
          disabled={isLoading}
          className="rounded-full border border-yellow-800 px-4 py-2 text-xs text-yellow-200 transition hover:border-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Chiudi
        </button>
      )}

      {message && (
        <p className="text-xs text-neutral-400">
          {message}
        </p>
      )}
    </div>
  );
}