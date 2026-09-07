"use client";

import { useEffect } from "react";
import { reconcileCurrentPushLifecycle } from "@/lib/pwa/pushLifecycle.client";

const SERVICE_WORKER_PATH = "/sw.js";
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const UPDATE_CHECK_THROTTLE_MS = 15 * 60 * 1000;

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let cancelled = false;
    let registration: ServiceWorkerRegistration | null = null;
    let permissionStatus: PermissionStatus | null = null;
    let updateTimer: number | null = null;
    let lastUpdateCheck = 0;

    async function reconcile() {
      if (!registration || cancelled) {
        return;
      }

      await reconcileCurrentPushLifecycle(registration).catch(() => undefined);
    }

    async function checkForUpdate(force = false) {
      if (!registration || cancelled || !navigator.onLine) {
        return;
      }

      const now = Date.now();

      if (!force && now - lastUpdateCheck < UPDATE_CHECK_THROTTLE_MS) {
        return;
      }

      lastUpdateCheck = now;
      await registration.update().catch(() => undefined);
    }

    async function observePermission() {
      if (!("permissions" in navigator)) {
        return;
      }

      try {
        permissionStatus = await navigator.permissions.query({
          name: "notifications" as PermissionName,
        });
        permissionStatus.addEventListener("change", reconcile);
      } catch {
        permissionStatus = null;
      }
    }

    async function registerServiceWorker() {
      try {
        registration = await navigator.serviceWorker.register(
          SERVICE_WORKER_PATH,
          {
          scope: "/",
          updateViaCache: "none",
          }
        );

        if (cancelled) {
          return;
        }

        await Promise.all([checkForUpdate(true), reconcile()]);
        await observePermission();

        updateTimer = window.setInterval(() => {
          void checkForUpdate(true);
        }, UPDATE_CHECK_INTERVAL_MS);
      } catch (error: unknown) {
        console.error(error);
      }
    }

    function handleForeground() {
      if (document.visibilityState === "visible") {
        void checkForUpdate();
        void reconcile();
      }
    }

    function handleOnline() {
      void checkForUpdate(true);
      void reconcile();
    }

    window.addEventListener("focus", handleForeground);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleForeground);

    if (document.readyState === "complete") {
      void registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", registerServiceWorker);
      window.removeEventListener("focus", handleForeground);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleForeground);

      if (permissionStatus) {
        permissionStatus.removeEventListener("change", reconcile);
      }

      if (updateTimer) {
        window.clearInterval(updateTimer);
      }
    };
  }, []);

  return null;
}
