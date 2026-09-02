"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import T from "@/components/i18n/T";

type NotificationMarkAllReadButtonProps = {
  disabled?: boolean;
};

export default function NotificationMarkAllReadButton({
  disabled = false,
}: NotificationMarkAllReadButtonProps) {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function markAllAsRead() {
    setError(false);

    try {
      const response = await fetch("/api/account/notifications/read-all", {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("read_all_failed");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError(true);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={markAllAsRead}
        disabled={disabled || isPending}
        className="rounded-full border border-neutral-700 px-4 py-2 text-xs font-medium text-neutral-200 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {isPending ? (
          <T
            textKey="account.notifications.actions.markingAll"
            fallback="Aggiorno..."
          />
        ) : (
          <T
            textKey="account.notifications.actions.markAllAsRead"
            fallback="Segna tutte come lette"
          />
        )}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-300">
          <T
            textKey="account.notifications.errors.markAll"
            fallback="Non riesco ad aggiornare tutte le notifiche."
          />
        </p>
      )}
    </div>
  );
}
