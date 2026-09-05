"use client";

import { useEffect } from "react";

const SERVICE_WORKER_PATH = "/sw.js";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const registerServiceWorker = () => {
      void navigator.serviceWorker
        .register(SERVICE_WORKER_PATH, {
          scope: "/",
          updateViaCache: "none",
        })
        .catch((error: unknown) => {
          console.error(error);
        });
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
      return;
    }

    window.addEventListener("load", registerServiceWorker, { once: true });

    return () => {
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  return null;
}
