"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import T from "@/components/i18n/T";

type AdminEventCurationControlsProps = {
  eventId: string;
  eventTitle: string;
  currentFeatured: boolean;
  currentFeaturedSortOrder: number;
  currentHighlight: boolean;
  currentHighlightSortOrder: number;
};

function getJsonError(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }

  return fallback;
}

export default function AdminEventCurationControls({
  eventId,
  eventTitle,
  currentFeatured,
  currentFeaturedSortOrder,
  currentHighlight,
  currentHighlightSortOrder,
}: AdminEventCurationControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [featuredSortOrder, setFeaturedSortOrder] = useState(
    String(currentFeaturedSortOrder ?? 100)
  );
  const [highlightSortOrder, setHighlightSortOrder] = useState(
    String(currentHighlightSortOrder ?? 100)
  );

  async function patchEvent(payload: Record<string, unknown>) {
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getJsonError(result, "Non riesco ad aggiornare l'evento.")
        );
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

  async function toggleFeatured() {
    const nextFeatured = !currentFeatured;

    await patchEvent({
      action: nextFeatured ? "set-featured" : "unset-featured",
      featuredSortOrder,
    });
  }

  async function updateFeaturedOrder() {
    await patchEvent({
      action: "update-featured-order",
      featuredSortOrder,
    });
  }

  async function toggleHighlight() {
    await patchEvent({
      action: currentHighlight ? "unset-highlight" : "set-highlight",
      highlightSortOrder,
    });
  }

  async function updateHighlightOrder() {
    await patchEvent({
      action: "update-highlight-order",
      highlightSortOrder,
    });
  }

  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-[0.22em] text-neutral-500">
        <T
          textKey="admin.events.curation.controls.label"
          fallback="Curation pubblica"
        />
      </p>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-100">
                <T
                  textKey="admin.events.curation.featured.title"
                  fallback="Evento in evidenza"
                />
              </p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                <T
                  textKey="admin.events.curation.featured.description"
                  fallback="Uno solo: verrà mostrato come hero principale su /eventi."
                />
              </p>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={toggleFeatured}
              className={
                currentFeatured
                  ? "rounded-full border border-amber-800 bg-amber-950/35 px-4 py-2 text-xs font-medium text-amber-200 disabled:opacity-60"
                  : "rounded-full border border-neutral-700 px-4 py-2 text-xs font-medium text-neutral-100 transition hover:border-neutral-400 disabled:opacity-60"
              }
            >
              {currentFeatured ? (
                <T
                  textKey="admin.events.curation.featured.active"
                  fallback="In evidenza"
                />
              ) : (
                <T
                  textKey="admin.events.curation.featured.set"
                  fallback="Imposta"
                />
              )}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              type="number"
              min={1}
              max={999}
              value={featuredSortOrder}
              aria-label="Ordine evento in evidenza"
              onChange={(event) => setFeaturedSortOrder(event.target.value)}
              className="w-28 rounded-2xl border border-neutral-800 bg-black px-4 py-2 text-sm text-neutral-100 outline-none focus:border-amber-700"
            />

            <button
              type="button"
              disabled={isPending}
              onClick={updateFeaturedOrder}
              className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400 disabled:opacity-60"
            >
              <T
                textKey="admin.events.curation.actions.saveOrder"
                fallback="Salva ordine"
              />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-100">
                <T
                  textKey="admin.events.curation.highlight.title"
                  fallback="Slider eventi selezionati"
                />
              </p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                <T
                  textKey="admin.events.curation.highlight.description"
                  fallback="Gli eventi attivi qui compongono lo slider ‘Da non perdere’."
                />
              </p>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={toggleHighlight}
              className={
                currentHighlight
                  ? "rounded-full border border-sky-800 bg-sky-950/35 px-4 py-2 text-xs font-medium text-sky-200 disabled:opacity-60"
                  : "rounded-full border border-neutral-700 px-4 py-2 text-xs font-medium text-neutral-100 transition hover:border-neutral-400 disabled:opacity-60"
              }
            >
              {currentHighlight ? (
                <T
                  textKey="admin.events.curation.highlight.active"
                  fallback="Nello slider"
                />
              ) : (
                <T
                  textKey="admin.events.curation.highlight.add"
                  fallback="Aggiungi"
                />
              )}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              type="number"
              min={1}
              max={999}
              value={highlightSortOrder}
              aria-label="Ordine slider eventi"
              onChange={(event) => setHighlightSortOrder(event.target.value)}
              className="w-28 rounded-2xl border border-neutral-800 bg-black px-4 py-2 text-sm text-neutral-100 outline-none focus:border-amber-700"
            />

            <button
              type="button"
              disabled={isPending}
              onClick={updateHighlightOrder}
              className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400 disabled:opacity-60"
            >
              <T
                textKey="admin.events.curation.actions.saveOrder"
                fallback="Salva ordine"
              />
            </button>
          </div>
        </div>
      </div>

      {message && <p className="mt-3 text-xs text-red-300">{message}</p>}
    </div>
  );
}
