"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import T from "@/components/i18n/T";

type GalleryEventStatus = "scheduled" | "live" | "completed" | "cancelled";

type GalleryEventActionsProps = {
  eventId: string;
  eventTitle?: string;
  status: GalleryEventStatus;
};

type ActionState = "complete" | "cancel" | "delete" | null;

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || "Operazione non riuscita.";
  } catch {
    return "Operazione non riuscita.";
  }
}

export default function GalleryEventActions({
  eventId,
  status,
}: GalleryEventActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<ActionState>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBusy = isPending || Boolean(activeAction);
  const canClose = status === "scheduled" || status === "live";

  async function updateStatus(nextStatus: Extract<GalleryEventStatus, "completed" | "cancelled">) {
    setError(null);
    setActiveAction(nextStatus === "completed" ? "complete" : "cancel");

    try {
      const response = await fetch(`/api/dashboard/events/${eventId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Operazione non riuscita."
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function deleteEvent() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setError(null);
    setActiveAction("delete");

    try {
      const response = await fetch(`/api/dashboard/events/${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Eliminazione non riuscita."
      );
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap gap-2">
        {canClose && (
          <>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => updateStatus("completed")}
              className="rounded-full border border-emerald-900 bg-emerald-950/30 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-emerald-100 transition hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activeAction === "complete" ? (
                <T
                  textKey="dashboard.events.actions.completing"
                  fallback="Chiusura..."
                />
              ) : (
                <T
                  textKey="dashboard.events.actions.complete"
                  fallback="Segna concluso"
                />
              )}
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => updateStatus("cancelled")}
              className="rounded-full border border-amber-900 bg-amber-950/30 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-amber-100 transition hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activeAction === "cancel" ? (
                <T
                  textKey="dashboard.events.actions.cancelling"
                  fallback="Annullamento..."
                />
              ) : (
                <T
                  textKey="dashboard.events.actions.cancel"
                  fallback="Annulla evento"
                />
              )}
            </button>
          </>
        )}

        <button
          type="button"
          disabled={isBusy}
          onClick={deleteEvent}
          className={
            confirmDelete
              ? "rounded-full border border-red-500 bg-red-600 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              : "rounded-full border border-neutral-800 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-neutral-400 transition hover:border-red-500 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
          }
        >
          {activeAction === "delete" ? (
            <T
              textKey="dashboard.events.actions.deleting"
              fallback="Eliminazione..."
            />
          ) : confirmDelete ? (
            <T
              textKey="dashboard.events.actions.confirmDelete"
              fallback="Conferma elimina"
            />
          ) : (
            <T textKey="dashboard.events.actions.delete" fallback="Elimina" />
          )}
        </button>

        {confirmDelete && !activeAction && (
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="rounded-full border border-neutral-800 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-neutral-400 transition hover:border-neutral-500 hover:text-white"
          >
            <T textKey="dashboard.events.actions.keep" fallback="Mantieni" />
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-2xl border border-red-900 bg-red-950/30 px-4 py-3 text-xs text-red-100">
          {error}
        </p>
      )}
    </div>
  );
}
