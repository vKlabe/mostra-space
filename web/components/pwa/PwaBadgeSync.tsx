"use client";

import { useEffect } from "react";
import {
  APP_BADGE_SYNC_EVENT,
  setAppBadgeCount,
} from "@/lib/pwa/appBadge.client";
import { createClient } from "@/lib/supabase/client";

type BadgeResponse = {
  success?: boolean;
  unreadCount?: number;
};

export default function PwaBadgeSync() {
  useEffect(() => {
    let cancelled = false;
    let authenticated = false;
    const supabase = createClient();

    async function syncBadge() {
      if (cancelled || !authenticated) {
        return;
      }

      try {
        const response = await fetch("/api/account/pwa-badge", {
          cache: "no-store",
        });

        if (response.status === 401) {
          authenticated = false;
          await setAppBadgeCount(0);
          return;
        }

        const result = (await response.json().catch(() => null)) as
          | BadgeResponse
          | null;

        if (!cancelled && response.ok && result?.success) {
          await setAppBadgeCount(Number(result.unreadCount) || 0);
        }
      } catch {
        // Badge synchronization is non-essential and must fail silently.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void syncBadge();
      }
    }

    async function initialize() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        authenticated = Boolean(user);

        if (authenticated) {
          await syncBadge();
        } else {
          await setAppBadgeCount(0);
        }
      } catch {
        authenticated = false;
      }
    }

    function handleServiceWorkerMessage(event: MessageEvent) {
      if (event.data?.type === "MOSTRASPACE_BADGE_SYNC") {
        void syncBadge();
      }
    }

    void initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        authenticated = Boolean(session?.user);

        if (authenticated) {
          void syncBadge();
        } else {
          void setAppBadgeCount(0);
        }
      }
    );

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncBadge();
      }
    }, 60_000);

    window.addEventListener("focus", syncBadge);
    window.addEventListener("online", syncBadge);
    window.addEventListener(APP_BADGE_SYNC_EVENT, syncBadge);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    navigator.serviceWorker?.addEventListener(
      "message",
      handleServiceWorkerMessage
    );

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
      window.clearInterval(interval);
      window.removeEventListener("focus", syncBadge);
      window.removeEventListener("online", syncBadge);
      window.removeEventListener(APP_BADGE_SYNC_EVENT, syncBadge);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      navigator.serviceWorker?.removeEventListener(
        "message",
        handleServiceWorkerMessage
      );
    };
  }, []);

  return null;
}
