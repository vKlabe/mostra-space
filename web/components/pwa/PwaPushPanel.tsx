"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { usePwaInstall } from "@/components/pwa/PwaInstallProvider";
import type { Messages } from "@/lib/i18n/dictionaries";

type PushStatus =
  | "loading"
  | "available"
  | "active"
  | "denied"
  | "needs-installation"
  | "unsupported"
  | "unconfigured"
  | "error";

type Feedback = "idle" | "enabled" | "disabled" | "cancelled" | "error";

type PushManagerWithEncodings = typeof PushManager & {
  supportedContentEncodings?: string[];
};

function supportsPush() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function decodeApplicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const decoded = window.atob(base64);
  const bytes = new Uint8Array(decoded.length);

  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }

  return bytes;
}

function getDeviceLabel() {
  const userAgent = navigator.userAgent;
  const device = /iphone/i.test(userAgent)
    ? "iPhone"
    : /ipad/i.test(userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
      ? "iPad"
      : /android/i.test(userAgent)
        ? "Android"
        : /windows/i.test(userAgent)
          ? "Windows"
          : /macintosh|mac os x/i.test(userAgent)
            ? "Mac"
            : "Dispositivo";
  const browser = /edg/i.test(userAgent)
    ? "Edge"
    : /firefox|fxios/i.test(userAgent)
      ? "Firefox"
      : /chrome|crios/i.test(userAgent)
        ? "Chrome"
        : /safari/i.test(userAgent)
          ? "Safari"
          : "Browser";

  return `${browser} · ${device}`;
}

async function readPublicKey() {
  const response = await fetch("/api/pwa/push-public-key", {
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; publicKey?: string }
    | null;

  if (!response.ok || !payload?.success || !payload.publicKey) {
    return null;
  }

  return payload.publicKey;
}

async function readPushEnabled() {
  const response = await fetch("/api/account/push-preferences", {
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; preferences?: { pushEnabled?: boolean } }
    | null;

  if (!response.ok || !payload?.success) {
    throw new Error("Unable to load push preferences.");
  }

  return payload.preferences?.pushEnabled === true;
}

async function hashEndpoint(endpoint: string) {
  const digest = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(endpoint)
  );

  return window
    .btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function readCurrentSubscriptionActive(endpoint: string) {
  const [endpointHash, response] = await Promise.all([
    hashEndpoint(endpoint),
    fetch("/api/account/push-subscriptions", { cache: "no-store" }),
  ]);
  const payload = (await response.json().catch(() => null)) as
    | {
        success?: boolean;
        subscriptions?: { endpointHash?: string; active?: boolean }[];
      }
    | null;

  if (!response.ok || !payload?.success) {
    throw new Error("Unable to inspect the current push subscription.");
  }

  return Boolean(
    payload.subscriptions?.some(
      (subscription) =>
        subscription.active === true && subscription.endpointHash === endpointHash
    )
  );
}

async function saveBrowserSubscription(
  subscription: PushSubscription,
  locale: string
) {
  const serialized = subscription.toJSON();
  const pushManager = PushManager as PushManagerWithEncodings;
  const contentEncoding = pushManager.supportedContentEncodings?.includes(
    "aes128gcm"
  )
    ? "aes128gcm"
    : pushManager.supportedContentEncodings?.[0] || "aes128gcm";
  const response = await fetch("/api/account/push-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: serialized,
      contentEncoding,
      deviceLabel: getDeviceLabel(),
      locale,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to save the push subscription.");
  }
}

async function setPushEnabled(pushEnabled: boolean) {
  const response = await fetch("/api/account/push-preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pushEnabled }),
  });

  if (!response.ok) {
    throw new Error("Unable to update push preferences.");
  }
}

async function disableBrowserSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/account/push-subscriptions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error("Unable to disable the push subscription.");
  }
}

export default function PwaPushPanel() {
  const { locale, t } = useLanguage();
  const { isIos, isReady, isStandalone } = usePwaInstall();
  const [status, setStatus] = useState<PushStatus>("loading");
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [isWorking, setIsWorking] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const translate = useCallback(
    (key: keyof Messages, fallback: string) => t(key, fallback),
    [t]
  );

  useEffect(() => {
    if (!isReady) {
      return;
    }

    let cancelled = false;

    async function loadStatus() {
      if (isIos && !isStandalone) {
        setStatus("needs-installation");
        return;
      }

      if (!supportsPush()) {
        setStatus("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }

      try {
        const [key, registration, pushEnabled] = await Promise.all([
          readPublicKey(),
          navigator.serviceWorker.ready,
          readPushEnabled(),
        ]);

        if (cancelled) {
          return;
        }

        if (!key) {
          setStatus("unconfigured");
          return;
        }

        setPublicKey(key);

        const subscription = await registration.pushManager.getSubscription();

        if (cancelled) {
          return;
        }

        const currentSubscriptionActive = subscription
          ? await readCurrentSubscriptionActive(subscription.endpoint)
          : false;

        if (cancelled) {
          return;
        }

        setStatus(
          subscription && currentSubscriptionActive && pushEnabled
            ? "active"
            : "available"
        );
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [isIos, isReady, isStandalone]);

  async function handleEnable() {
    if (!publicKey || isWorking) {
      return;
    }

    setIsWorking(true);
    setFeedback("idle");

    let createdSubscription: PushSubscription | null = null;

    try {
      const permission = await Notification.requestPermission();

      if (permission === "denied") {
        setStatus("denied");
        return;
      }

      if (permission !== "granted") {
        setStatus("available");
        setFeedback("cancelled");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(publicKey),
        });
        createdSubscription = subscription;
      }

      await saveBrowserSubscription(subscription, locale);
      await setPushEnabled(true);

      setStatus("active");
      setFeedback("enabled");
    } catch {
      if (createdSubscription) {
        await createdSubscription.unsubscribe().catch(() => false);
      }

      setStatus("error");
      setFeedback("error");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleDisable() {
    if (isWorking) {
      return;
    }

    setIsWorking(true);
    setFeedback("idle");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await disableBrowserSubscription(subscription);
        await subscription.unsubscribe();
      } else {
        await setPushEnabled(false);
      }

      setStatus("available");
      setFeedback("disabled");
    } catch {
      setFeedback("error");
    } finally {
      setIsWorking(false);
    }
  }

  const description = (() => {
    if (status === "active") {
      return translate(
        "pwa.push.activeDescription",
        "Le notifiche sono attive su questo dispositivo."
      );
    }

    if (status === "needs-installation") {
      return translate(
        "pwa.push.iosInstallRequired",
        "Su iPhone e iPad le notifiche sono disponibili dopo aver aggiunto Mostra.Space alla schermata Home e averla aperta dall’icona."
      );
    }

    if (status === "denied") {
      return translate(
        "pwa.push.deniedDescription",
        "Le notifiche sono bloccate nelle impostazioni del browser o del dispositivo."
      );
    }

    if (status === "unsupported") {
      return translate(
        "pwa.push.unsupportedDescription",
        "Questo browser non supporta le notifiche web su questo dispositivo."
      );
    }

    if (status === "unconfigured") {
      return translate(
        "pwa.push.unconfiguredDescription",
        "Le notifiche non sono ancora configurate per questo ambiente."
      );
    }

    if (status === "error") {
      return translate(
        "pwa.push.errorDescription",
        "Non riesco a verificare le notifiche in questo momento. Ricarica la pagina e riprova."
      );
    }

    return translate(
      "pwa.push.description",
      "Puoi attivare le notifiche per questo dispositivo. Il permesso viene richiesto solo dopo la tua conferma."
    );
  })();

  return (
    <article className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 md:col-span-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="font-medium text-neutral-200">
            {translate("pwa.push.title", "Notifiche sul dispositivo")}
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {description}
          </p>
        </div>

        {status === "active" && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex w-fit rounded-full border border-green-900 bg-green-950/40 px-4 py-2 text-sm text-green-300">
              {translate("pwa.push.active", "Attive")}
            </span>
            <button
              type="button"
              onClick={handleDisable}
              disabled={isWorking}
              className="inline-flex w-fit rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400 disabled:cursor-wait disabled:opacity-60"
            >
              {isWorking
                ? translate("pwa.push.disabling", "Disattivo...")
                : translate("pwa.push.disable", "Disattiva su questo dispositivo")}
            </button>
          </div>
        )}

        {status === "available" && (
          <button
            type="button"
            onClick={handleEnable}
            disabled={isWorking}
            className="inline-flex w-fit rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-wait disabled:opacity-60"
          >
            {isWorking
              ? translate("pwa.push.enabling", "Attivo...")
              : translate("pwa.push.enable", "Attiva notifiche")}
          </button>
        )}
      </div>

      {feedback !== "idle" && (
        <p
          className={`mt-4 text-sm ${
            feedback === "error" ? "text-red-300" : "text-neutral-400"
          }`}
          role="status"
        >
          {feedback === "enabled" &&
            translate(
              "pwa.push.feedback.enabled",
              "Notifiche attivate su questo dispositivo."
            )}
          {feedback === "disabled" &&
            translate(
              "pwa.push.feedback.disabled",
              "Notifiche disattivate su questo dispositivo."
            )}
          {feedback === "cancelled" &&
            translate(
              "pwa.push.feedback.cancelled",
              "Permesso non concesso. Potrai riprovare quando vuoi."
            )}
          {feedback === "error" &&
            translate(
              "pwa.push.feedback.error",
              "Operazione non riuscita. Riprova tra poco."
            )}
        </p>
      )}
    </article>
  );
}
