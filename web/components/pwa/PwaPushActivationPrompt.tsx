"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { usePwaInstall } from "@/components/pwa/PwaInstallProvider";
import type { Messages } from "@/lib/i18n/dictionaries";
import type { PushPreferences } from "@/lib/pwa/pushValidation";
import {
  forgetCurrentPushSubscriptionId,
  rememberCurrentPushSubscriptionId,
} from "@/lib/pwa/pushLifecycle.client";
import { createClient } from "@/lib/supabase/client";

type PushSubscriptionItem = {
  id: string;
  endpointHash: string;
  active: boolean;
};

type ActivationContext = {
  userId: string;
  publicKey: string;
  activeSubscriptions: PushSubscriptionItem[];
};

type Feedback = "idle" | "cancelled" | "denied" | "error";

type PushManagerWithEncodings = typeof PushManager & {
  supportedContentEncodings?: string[];
};

const SHOW_AFTER_MS = 30 * 1000;
const DISMISSED_FOR_MS = 3 * 24 * 60 * 60 * 1000;
const INSTALL_PROMPT_RECHECK_MS = 2 * 1000;
const DISMISSED_STORAGE_PREFIX =
  "mostra-space:pwa-push-activation-prompt:dismissed-at";

function dismissalKey(userId: string) {
  return `${DISMISSED_STORAGE_PREFIX}:${userId}`;
}

function wasRecentlyDismissed(userId: string) {
  try {
    const dismissedAt = Number(
      window.localStorage.getItem(dismissalKey(userId))
    );

    return (
      Number.isFinite(dismissedAt) &&
      dismissedAt > 0 &&
      Date.now() - dismissedAt < DISMISSED_FOR_MS
    );
  } catch {
    return false;
  }
}

function rememberDismissal(userId: string) {
  try {
    window.localStorage.setItem(dismissalKey(userId), String(Date.now()));
  } catch {
    // The prompt can still be dismissed for the current page view.
  }
}

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

async function readPushSettings() {
  const [preferenceResponse, subscriptionResponse] = await Promise.all([
    fetch("/api/account/push-preferences", { cache: "no-store" }),
    fetch("/api/account/push-subscriptions", { cache: "no-store" }),
  ]);
  const preferencePayload = (await preferenceResponse
    .json()
    .catch(() => null)) as
    | { success?: boolean; preferences?: PushPreferences }
    | null;
  const subscriptionPayload = (await subscriptionResponse
    .json()
    .catch(() => null)) as
    | { success?: boolean; subscriptions?: PushSubscriptionItem[] }
    | null;

  if (
    !preferenceResponse.ok ||
    !preferencePayload?.success ||
    !preferencePayload.preferences ||
    !subscriptionResponse.ok ||
    !subscriptionPayload?.success
  ) {
    return null;
  }

  return {
    preferences: preferencePayload.preferences,
    subscriptions: subscriptionPayload.subscriptions || [],
  };
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
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; subscription?: { id?: string } }
    | null;

  if (
    !response.ok ||
    !payload?.success ||
    typeof payload.subscription?.id !== "string"
  ) {
    throw new Error("SUBSCRIPTION_SAVE_FAILED");
  }

  rememberCurrentPushSubscriptionId(payload.subscription.id);
}

async function enableGlobalPush() {
  const response = await fetch("/api/account/push-preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pushEnabled: true }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean }
    | null;

  if (!response.ok || !payload?.success) {
    throw new Error("PREFERENCE_SAVE_FAILED");
  }
}

async function disableServerSubscription(endpoint: string) {
  const response = await fetch("/api/account/push-subscriptions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error("SUBSCRIPTION_ROLLBACK_FAILED");
  }
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 21h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PwaPushActivationPrompt() {
  const pathname = usePathname();
  const { locale, t } = useLanguage();
  const { isIos, isReady, isStandalone } = usePwaInstall();
  const currentUserRef = useRef<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activationContext, setActivationContext] =
    useState<ActivationContext | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const promptUserId = activationContext?.userId || userId;

  const translate = (key: keyof Messages, fallback: string) =>
    t(key, fallback);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function refreshUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) {
          return;
        }

        const nextUserId = user?.id || null;

        if (currentUserRef.current !== nextUserId) {
          currentUserRef.current = nextUserId;
          setActivationContext(null);
          setIsOpen(false);
          setFeedback("idle");
        }

        setUserId(nextUserId);
      } catch {
        if (!cancelled) {
          currentUserRef.current = null;
          setUserId(null);
          setActivationContext(null);
          setIsOpen(false);
        }
      }
    }

    void refreshUser();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (
      !userId ||
      !isReady ||
      !supportsPush() ||
      Notification.permission === "denied" ||
      (isIos && !isStandalone) ||
      wasRecentlyDismissed(userId)
    ) {
      return;
    }

    let cancelled = false;
    let installPromptTimer: number | null = null;

    const showTimer = window.setTimeout(async () => {
      try {
        if (Notification.permission === "denied") {
          return;
        }

        const [settings, publicKey] = await Promise.all([
          readPushSettings(),
          readPublicKey(),
        ]);

        if (cancelled || !settings || !publicKey) {
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const browserSubscription =
          await registration.pushManager.getSubscription();

        if (cancelled) {
          return;
        }

        const endpointHash = browserSubscription
          ? await hashEndpoint(browserSubscription.endpoint)
          : null;
        const currentServerSubscription = endpointHash
          ? settings.subscriptions.find(
              (subscription) =>
                subscription.active &&
                subscription.endpointHash === endpointHash
            )
          : null;

        if (currentServerSubscription) {
          rememberCurrentPushSubscriptionId(currentServerSubscription.id);
        }

        if (settings.preferences.pushEnabled && currentServerSubscription) {
          return;
        }

        const nextContext: ActivationContext = {
          userId,
          publicKey,
          activeSubscriptions: settings.subscriptions.filter(
            (subscription) => subscription.active
          ),
        };

        function openWhenInstallPromptIsClosed() {
          if (cancelled) {
            return;
          }

          if (document.getElementById("pwa-global-install-title")) {
            installPromptTimer = window.setTimeout(
              openWhenInstallPromptIsClosed,
              INSTALL_PROMPT_RECHECK_MS
            );
            return;
          }

          setActivationContext(nextContext);
          setFeedback("idle");
          setIsOpen(true);
        }

        openWhenInstallPromptIsClosed();
      } catch {
        // A temporary check failure must not interrupt normal navigation.
      }
    }, SHOW_AFTER_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(showTimer);

      if (installPromptTimer) {
        window.clearTimeout(installPromptTimer);
      }
    };
  }, [isIos, isReady, isStandalone, userId]);

  const dismissForThreeDays = useCallback(() => {
    if (promptUserId) {
      rememberDismissal(promptUserId);
    }

    setIsOpen(false);
    setFeedback("idle");
  }, [promptUserId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismissForThreeDays();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [dismissForThreeDays, isOpen]);

  async function handleActivate() {
    if (
      !activationContext ||
      activationContext.userId !== userId ||
      isActivating
    ) {
      return;
    }

    setIsActivating(true);
    setFeedback("idle");

    let browserSubscription: PushSubscription | null = null;
    let createdSubscription: PushSubscription | null = null;
    let savedOnServer = false;

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        rememberDismissal(activationContext.userId);
        setFeedback(permission === "denied" ? "denied" : "cancelled");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      browserSubscription =
        await registration.pushManager.getSubscription();

      if (!browserSubscription) {
        browserSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(
            activationContext.publicKey
          ),
        });
        createdSubscription = browserSubscription;
      }

      const endpointHash = await hashEndpoint(browserSubscription.endpoint);
      const activeServerSubscription =
        activationContext.activeSubscriptions.find(
          (subscription) => subscription.endpointHash === endpointHash
        );

      if (activeServerSubscription) {
        rememberCurrentPushSubscriptionId(activeServerSubscription.id);
      } else {
        await saveBrowserSubscription(browserSubscription, locale);
        savedOnServer = true;
      }

      await enableGlobalPush();
      setIsOpen(false);
      setActivationContext(null);
    } catch {
      if (savedOnServer && browserSubscription) {
        await disableServerSubscription(browserSubscription.endpoint).catch(
          () => undefined
        );
      }

      if (createdSubscription) {
        await createdSubscription.unsubscribe().catch(() => false);
      }

      if (savedOnServer) {
        forgetCurrentPushSubscriptionId();
      }

      setFeedback("error");
    } finally {
      setIsActivating(false);
    }
  }

  if (
    !isOpen ||
    !activationContext ||
    activationContext.userId !== userId
  ) {
    return null;
  }

  const activationUnavailable =
    feedback === "cancelled" || feedback === "denied";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          dismissForThreeDays();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-push-prompt-title"
        aria-describedby="pwa-push-prompt-description"
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.65)] sm:p-7"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,rgba(197,151,94,0.18),transparent_70%)]" />

        <button
          type="button"
          onClick={dismissForThreeDays}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--museum-border)] text-xl text-[var(--museum-stone)] transition hover:border-[var(--museum-bronze)] hover:text-[var(--museum-ivory)]"
          aria-label={translate(
            "pwa.push.prompt.close",
            "Chiudi l’invito alle notifiche"
          )}
        >
          ×
        </button>

        <div className="relative flex items-start gap-4 pr-12">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--museum-border)] bg-black/30 text-[var(--museum-bronze-light)] sm:h-16 sm:w-16">
            <BellIcon />
          </div>

          <div>
            <p className="museum-label">
              {translate("pwa.push.prompt.label", "Resta aggiornato")}
            </p>
            <h2
              id="pwa-push-prompt-title"
              className="mt-2 font-editorial text-3xl font-medium leading-tight text-[var(--museum-ivory)] sm:text-4xl"
            >
              {translate(
                "pwa.push.prompt.title",
                "Non perdere ciò che accade su Mostra.Space"
              )}
            </h2>
          </div>
        </div>

        <p
          id="pwa-push-prompt-description"
          className="relative mt-5 text-sm leading-7 text-[var(--museum-stone)]"
        >
          {translate(
            "pwa.push.prompt.description",
            "Attiva le notifiche per ricevere nuovi messaggi e aggiornamenti su eventi, esposizioni e attività dei profili che segui. Potrai scegliere le categorie e disattivarle in qualsiasi momento."
          )}
        </p>

        <ul className="relative mt-5 grid gap-2 text-sm text-[var(--museum-ivory-soft)] sm:grid-cols-3">
          <li className="rounded-2xl border border-[var(--museum-border)] bg-black/20 px-4 py-3">
            {translate(
              "pwa.push.prompt.messages",
              "Messaggi e interazioni"
            )}
          </li>
          <li className="rounded-2xl border border-[var(--museum-border)] bg-black/20 px-4 py-3">
            {translate(
              "pwa.push.prompt.discoveries",
              "Eventi e nuove esposizioni"
            )}
          </li>
          <li className="rounded-2xl border border-[var(--museum-border)] bg-black/20 px-4 py-3">
            {translate(
              "pwa.push.prompt.reminders",
              "Promemoria importanti"
            )}
          </li>
        </ul>

        <p className="relative mt-5 text-xs leading-6 text-[var(--museum-stone-muted)]">
          {translate(
            "pwa.push.prompt.consent",
            "Il browser ti chiederà conferma. Le notifiche restano facoltative e non vengono mai attivate senza il tuo consenso."
          )}
        </p>

        {feedback !== "idle" && (
          <p
            className="relative mt-4 rounded-2xl border border-[rgba(182,91,78,0.4)] bg-[rgba(182,91,78,0.08)] p-4 text-sm leading-6 text-[var(--museum-danger)]"
            role="status"
          >
            {feedback === "denied" &&
              translate(
                "pwa.push.deniedDescription",
                "Le notifiche sono bloccate nelle impostazioni del browser o del dispositivo."
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

        <div className="relative mt-6 flex flex-col gap-3 sm:flex-row">
          {!activationUnavailable && (
            <button
              type="button"
              onClick={() => void handleActivate()}
              disabled={isActivating}
              className="museum-button-primary flex-1 px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isActivating
                ? translate("pwa.push.enabling", "Attivazione...")
                : translate("pwa.push.enable", "Attiva notifiche")}
            </button>
          )}

          <button
            type="button"
            onClick={dismissForThreeDays}
            className="museum-button-secondary flex-1 px-6 py-3"
          >
            {translate("pwa.push.prompt.later", "Più tardi")}
          </button>
        </div>
      </section>
    </div>
  );
}
