"use client";

import { useState } from "react";
import T from "@/components/i18n/T";

type NotificationOpenLinkProps = {
  notificationId: string;
  href: string;
};

export default function NotificationOpenLink({
  notificationId,
  href,
}: NotificationOpenLinkProps) {
  const [isPending, setIsPending] = useState(false);

  async function openNotification() {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      await fetch(`/api/account/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
    } finally {
      window.location.assign(href);
    }
  }

  return (
    <button
      type="button"
      onClick={openNotification}
      disabled={isPending}
      className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-wait disabled:opacity-60"
    >
      {isPending ? (
        <T textKey="account.notifications.actions.opening" fallback="Apro..." />
      ) : (
        <T textKey="account.notifications.actions.open" fallback="Apri" />
      )}
    </button>
  );
}
