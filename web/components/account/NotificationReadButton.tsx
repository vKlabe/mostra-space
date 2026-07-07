"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type NotificationReadButtonProps = {
  notificationId: string;
  isRead: boolean;
};

export default function NotificationReadButton({
  notificationId,
  isRead,
}: NotificationReadButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function markAsRead() {
    setError(null);

    try {
      const response = await fetch(
        `/api/account/notifications/${notificationId}/read`,
        {
          method: "PATCH",
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || "Non riesco ad aggiornare la notifica."
        );
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Non riesco ad aggiornare la notifica."
      );
    }
  }

  if (isRead) {
    return (
      <span className="rounded-full border border-neutral-800 px-4 py-2 text-xs text-neutral-500">
        Letta
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={markAsRead}
        className="rounded-full border border-neutral-700 px-4 py-2 text-xs font-medium text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Aggiorno..." : "Segna letta"}
      </button>

      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
