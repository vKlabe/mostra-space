"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type AccessMode = "public" | "password" | "invite_only" | "private_link";
type VoiceMode = "owner_only" | "everyone" | "request_to_speak";
type EventStatus = "scheduled" | "live" | "completed" | "cancelled" | string;

type AdminLiveGuidedVisitControlsProps = {
  liveEventId: string;
  eventTitle: string;
  isActive: boolean;
  linkedEventStatus: EventStatus | null;
  currentAccessMode: AccessMode;
  currentVoiceMode: VoiceMode;
  currentMaxParticipants: number | null;
  hasLinkedCalendarEvent: boolean;
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

export default function AdminLiveGuidedVisitControls({
  liveEventId,
  eventTitle,
  isActive,
  linkedEventStatus,
  currentAccessMode,
  currentVoiceMode,
  currentMaxParticipants,
  hasLinkedCalendarEvent,
}: AdminLiveGuidedVisitControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [accessMode, setAccessMode] = useState<AccessMode>(currentAccessMode);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(currentVoiceMode);
  const [maxParticipants, setMaxParticipants] = useState(
    currentMaxParticipants ? String(currentMaxParticipants) : "50"
  );

  async function patchLiveVisit(payload: Record<string, unknown>) {
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/live-guided-visits/${liveEventId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getJsonError(result, "Non riesco ad aggiornare la Live guided visit.")
        );
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Non riesco ad aggiornare la Live guided visit."
      );
    }
  }

  async function toggleActive() {
    const nextActive = !isActive;
    const confirmed = window.confirm(
      nextActive
        ? `Riattivare la Live guided visit "${eventTitle}"?`
        : `Disattivare la Live guided visit "${eventTitle}"?`
    );

    if (!confirmed) {
      return;
    }

    await patchLiveVisit({
      action: nextActive ? "activate" : "deactivate",
    });
  }

  async function updateControls() {
    await patchLiveVisit({
      action: "update-controls",
      accessMode,
      voiceMode,
      maxParticipants,
    });
  }

  async function completeLinkedEvent() {
    const confirmed = window.confirm(
      `Segnare come terminato anche l'evento calendario collegato a "${eventTitle}"?`
    );

    if (!confirmed) {
      return;
    }

    await patchLiveVisit({ action: "complete-linked-event" });
  }

  async function cancelLinkedEvent() {
    const confirmed = window.confirm(
      `Annullare anche l'evento calendario collegato a "${eventTitle}"?`
    );

    if (!confirmed) {
      return;
    }

    await patchLiveVisit({ action: "cancel-linked-event" });
  }

  const canCloseLinkedEvent =
    hasLinkedCalendarEvent &&
    (linkedEventStatus === "scheduled" || linkedEventStatus === "live");

  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-[0.22em] text-neutral-500">
        Controlli admin
      </p>

      <div className="grid gap-3">
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.18em] text-neutral-600">
            Accesso
          </span>
          <select
            value={accessMode}
            onChange={(event) => setAccessMode(event.target.value as AccessMode)}
            disabled={isPending}
            className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="public">Pubblico</option>
            <option value="password">Password</option>
            <option value="invite_only">Solo invito</option>
            <option value="private_link">Link privato</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.18em] text-neutral-600">
            Permessi microfono
          </span>
          <select
            value={voiceMode}
            onChange={(event) => setVoiceMode(event.target.value as VoiceMode)}
            disabled={isPending}
            className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="owner_only">Solo owner/moderatori parlano</option>
            <option value="everyone">Tutti possono parlare</option>
            <option value="request_to_speak">Richiesta parola</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.18em] text-neutral-600">
            Max partecipanti
          </span>
          <input
            type="number"
            min={1}
            max={500}
            value={maxParticipants}
            onChange={(event) => setMaxParticipants(event.target.value)}
            disabled={isPending}
            className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={updateControls}
          className="rounded-full bg-white px-4 py-2 text-xs font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Salva controlli
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={toggleActive}
          className={
            isActive
              ? "rounded-full border border-yellow-900 bg-yellow-950/30 px-4 py-2 text-xs font-medium text-yellow-200 transition hover:bg-yellow-950/60 disabled:cursor-not-allowed disabled:opacity-60"
              : "rounded-full border border-emerald-900 bg-emerald-950/30 px-4 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-950/60 disabled:cursor-not-allowed disabled:opacity-60"
          }
        >
          {isActive ? "Disattiva live" : "Riattiva live"}
        </button>

        {canCloseLinkedEvent && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={completeLinkedEvent}
              className="rounded-full border border-neutral-700 px-4 py-2 text-xs font-medium text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Segna terminato
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={cancelLinkedEvent}
              className="rounded-full border border-red-900 bg-red-950/30 px-4 py-2 text-xs font-medium text-red-200 transition hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Annulla evento
            </button>
          </>
        )}
      </div>

      {message && <p className="mt-3 text-xs text-red-300">{message}</p>}
    </div>
  );
}
