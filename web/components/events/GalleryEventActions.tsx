"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import T from "@/components/i18n/T";

type GalleryEventActionsProps = {
  eventId: string;
  eventTitle: string;
  status: "scheduled" | "live" | "completed" | "cancelled";
};

export default function GalleryEventActions({
  eventId,
  eventTitle,
  status,
}: GalleryEventActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  async function updateStatus(nextStatus: "completed" | "cancelled") {
    setMessage(null);

    const confirmed = window.confirm(
      nextStatus === "completed"
        ? `Segnare come terminato "${eventTitle}"? Potrai creare un nuovo evento per questa galleria.`
        : `Annullare "${eventTitle}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/dashboard/events/${eventId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Non riesco ad aggiornare l'evento.");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Non riesco ad aggiornare l'evento."
      );
    }
  }

  async function deleteEvent() {
    setMessage(null);

    const confirmed = window.confirm(
      `Eliminare definitivamente "${eventTitle}"? Le notifiche collegate verranno rimosse.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/dashboard/events/${eventId}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Non riesco a eliminare l'evento.");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Non riesco a eliminare l'evento."
      );
    }
  }

  const canClose = status === "scheduled" || status === "live";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {canClose && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => updateStatus("completed")}
              className="rounded-full border border-neutral-700 px-4 py-2 text-xs font-medium text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <T
                textKey="dashboard.events.actions.markCompleted"
                fallback="Segna terminato"
              />
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => updateStatus("cancelled")}
              className="rounded-full border border-yellow-900 bg-yellow-950/25 px-4 py-2 text-xs font-medium text-yellow-200 transition hover:bg-yellow-950/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <T
                textKey="dashboard.events.actions.cancel"
                fallback="Annulla"
              />
            </button>
          </>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={deleteEvent}
          className="rounded-full border border-red-900 bg-red-950/30 px-4 py-2 text-xs font-medium text-red-200 transition hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <T
            textKey="dashboard.events.actions.delete"
            fallback="Elimina"
          />
        </button>
      </div>

      {message && <p className="text-xs text-red-300">{message}</p>}
    </div>
  );
}