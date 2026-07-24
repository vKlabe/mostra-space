"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import T from "@/components/i18n/T";

type GalleryEventInviteManagerProps = {
  eventId: string;
  initialInviteCount: number;
};

type MessageState = {
  type: "success" | "error";
  textKey: string;
  fallback: string;
};

function splitEmails(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export default function GalleryEventInviteManager({
  eventId,
  initialInviteCount,
}: GalleryEventInviteManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [emails, setEmails] = useState("");
  const [message, setMessage] = useState<MessageState | null>(null);

  const parsedEmails = useMemo(() => splitEmails(emails), [emails]);

  async function addInvites() {
    setMessage(null);

    if (parsedEmails.length === 0) {
      setMessage({
        type: "error",
        textKey: "dashboard.events.invites.errors.empty",
        fallback: "Inserisci almeno una email.",
      });
      return;
    }

    try {
      const response = await fetch(`/api/dashboard/events/${eventId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emails: parsedEmails }),
      });

      if (!response.ok) {
        setMessage({
          type: "error",
          textKey: "dashboard.events.invites.errors.generic",
          fallback: "Non riesco ad aggiungere gli inviti.",
        });
        return;
      }

      setEmails("");
      setMessage({
        type: "success",
        textKey: "dashboard.events.invites.success.updated",
        fallback: "Inviti aggiornati.",
      });
      startTransition(() => router.refresh());
    } catch {
      setMessage({
        type: "error",
        textKey: "dashboard.events.invites.errors.generic",
        fallback: "Non riesco ad aggiungere gli inviti.",
      });
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-neutral-800 bg-black/30 p-3">
      <p className="text-xs font-medium text-neutral-200">
        <T textKey="dashboard.events.invites.title" fallback="Inviti evento" />{" "}
        · {initialInviteCount}
      </p>

      <label className="mt-3 grid gap-2">
        <span className="text-xs uppercase tracking-[0.18em] text-neutral-500">
          <T
            textKey="dashboard.events.invites.emailField"
            fallback="Email invitate"
          />
        </span>

        <textarea
          value={emails}
          onChange={(event) => setEmails(event.target.value)}
          rows={2}
          placeholder="email1@example.com, email2@example.com"
          className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs leading-5 text-neutral-100 outline-none transition focus:border-amber-600"
        />
      </label>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isPending || parsedEmails.length === 0}
          onClick={addInvites}
          className="rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <T
              textKey="dashboard.events.invites.adding"
              fallback="Aggiungo..."
            />
          ) : (
            <T
              textKey="dashboard.events.invites.add"
              fallback="Aggiungi inviti"
            />
          )}
        </button>

        {parsedEmails.length > 0 && (
          <span className="text-xs text-neutral-500">
            {parsedEmails.length} {" "}
            <T
              textKey="dashboard.events.invites.detected"
              fallback="email rilevate"
            />
          </span>
        )}
      </div>

      {message && (
        <p
          className={
            message.type === "success"
              ? "mt-2 text-xs text-emerald-300"
              : "mt-2 text-xs text-red-300"
          }
        >
          <T textKey={message.textKey} fallback={message.fallback} />
        </p>
      )}
    </div>
  );
}
