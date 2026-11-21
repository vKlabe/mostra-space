"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import T from "@/components/i18n/T";
import { requestAppBadgeSync } from "@/lib/pwa/appBadge.client";

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

      requestAppBadgeSync();

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
      <span className="rounded-full border border-[var(--museum-border)] px-4 py-2 text-xs text-[var(--museum-stone)]">
        <T
          textKey="account.notifications.status.read"
          fallback="Letta"
        />
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={markAsRead}
        aria-busy={isPending}
        className="museum-button-secondary min-h-11 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <T
            textKey="account.notifications.actions.updating"
            fallback="Aggiorno..."
          />
        ) : (
          <T
            textKey="account.notifications.actions.markAsRead"
            fallback="Segna letta"
          />
        )}
      </button>

      {error && <p role="status" className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
