"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { usePwaInstall } from "@/components/pwa/PwaInstallProvider";
import type { Messages } from "@/lib/i18n/dictionaries";
import {
  PUSH_PREFERENCE_DEFAULTS,
  type PushPreferences,
} from "@/lib/pwa/pushValidation";

type PushStatus =
  | "loading"
  | "available"
  | "active"
  | "paused"
  | "denied"
  | "needs-installation"
  | "unsupported"
  | "unconfigured"
  | "error";

type PushSubscriptionItem = {
  id: string;
  endpointHash: string;
  deviceLabel: string | null;
  locale: string | null;
  timezone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  expiresAt: string | null;
  disabledAt: string | null;
  failureCount: number;
  lastErrorCode: string | null;
  lastErrorAt: string | null;
};

type PushManagerWithEncodings = typeof PushManager & {
  supportedContentEncodings?: string[];
};

type PreferenceKey = Exclude<keyof PushPreferences, "pushEnabled">;

const PREFERENCE_OPTIONS: Array<{
  key: PreferenceKey;
  titleKey: keyof Messages;
  descriptionKey: keyof Messages;
  title: string;
  description: string;
}> = [
  {
    key: "messagesEnabled",
    titleKey: "pwa.push.categories.messages.title",
    descriptionKey: "pwa.push.categories.messages.description",
    title: "Messaggi",
    description: "Quando ricevi un nuovo messaggio privato.",
  },
  {
    key: "followersEnabled",
    titleKey: "pwa.push.categories.followers.title",
    descriptionKey: "pwa.push.categories.followers.description",
    title: "Nuovi follower",
    description: "Quando un profilo inizia a seguirti.",
  },
  {
    key: "favoritesEnabled",
    titleKey: "pwa.push.categories.favorites.title",
    descriptionKey: "pwa.push.categories.favorites.description",
    title: "Preferiti ricevuti",
    description: "Quando una tua opera o galleria viene salvata.",
  },
  {
    key: "publicationsEnabled",
    titleKey: "pwa.push.categories.publications.title",
    descriptionKey: "pwa.push.categories.publications.description",
    title: "Pubblicazioni",
    description: "Nuovi stati pubblicati dai profili che segui.",
  },
  {
    key: "invitationsEnabled",
    titleKey: "pwa.push.categories.invitations.title",
    descriptionKey: "pwa.push.categories.invitations.description",
    title: "Inviti",
    description: "Inviti personali a eventi e visite.",
  },
  {
    key: "eventsEnabled",
    titleKey: "pwa.push.categories.events.title",
    descriptionKey: "pwa.push.categories.events.description",
    title: "Nuovi eventi",
    description: "Eventi pubblicati dalle realtà che segui.",
  },
  {
    key: "eventRemindersEnabled",
    titleKey: "pwa.push.categories.eventReminders.title",
    descriptionKey: "pwa.push.categories.eventReminders.description",
    title: "Promemoria eventi",
    description: "Avvisi prima dell’inizio degli eventi salvati.",
  },
  {
    key: "galleryUpdatesEnabled",
    titleKey: "pwa.push.categories.galleryUpdates.title",
    descriptionKey: "pwa.push.categories.galleryUpdates.description",
    title: "Nuove gallerie",
    description: "Gallerie pubblicate dai profili che segui.",
  },
  {
    key: "platformUpdatesEnabled",
    titleKey: "pwa.push.categories.platformUpdates.title",
    descriptionKey: "pwa.push.categories.platformUpdates.description",
    title: "Comunicazioni Mostra.Space",
    description: "Aggiornamenti importanti e avvisi amministrativi.",
  },
];

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

async function readAccountPushSettings() {
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
    !subscriptionResponse.ok ||
    !subscriptionPayload?.success
  ) {
    throw new Error("Unable to load push settings.");
  }

  return {
    preferences: preferencePayload.preferences || {
      ...PUSH_PREFERENCE_DEFAULTS,
    },
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

  if (!response.ok) {
    throw new Error("Unable to save the push subscription.");
  }
}

async function patchPreferences(patch: Partial<PushPreferences>) {
  const response = await fetch("/api/account/push-preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; code?: string; preferences?: PushPreferences }
    | null;

  if (!response.ok || !payload?.success || !payload.preferences) {
    throw new Error(payload?.code || "PREFERENCE_UPDATE_FAILED");
  }

  return payload.preferences;
}

async function disableServerSubscription(selector: {
  subscriptionId?: string;
  endpoint?: string;
}) {
  const response = await fetch("/api/account/push-subscriptions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(selector),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error("Unable to disable the push subscription.");
  }
}

function formatDate(value: string | null, locale: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function PwaPushPanel() {
  const { locale, t } = useLanguage();
  const { isIos, isReady, isStandalone } = usePwaInstall();
  const [status, setStatus] = useState<PushStatus>("loading");
  const [preferences, setPreferences] = useState<PushPreferences>({
    ...PUSH_PREFERENCE_DEFAULTS,
  });
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionItem[]>([]);
  const [currentEndpointHash, setCurrentEndpointHash] = useState<string | null>(
    null
  );
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [workingKey, setWorkingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackIsError, setFeedbackIsError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deviceLabelDraft, setDeviceLabelDraft] = useState("");
  const [badgeSupported, setBadgeSupported] = useState(false);

  const translate = useCallback(
    (key: keyof Messages, fallback: string) => t(key, fallback),
    [t]
  );

  const activeDeviceCount = useMemo(
    () => subscriptions.filter((subscription) => subscription.active).length,
    [subscriptions]
  );

  const refreshSettings = useCallback(async () => {
    if (!isReady) {
      return;
    }

    try {
      const serverSettings = await readAccountPushSettings();
      setPreferences(serverSettings.preferences);
      setSubscriptions(serverSettings.subscriptions);
      setBadgeSupported(
        typeof navigator !== "undefined" && "setAppBadge" in navigator
      );

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

      const key = await readPublicKey();

      if (!key) {
        setStatus("unconfigured");
        return;
      }

      setPublicKey(key);
      const registration = await navigator.serviceWorker.ready;
      const browserSubscription =
        await registration.pushManager.getSubscription();
      const endpointHash = browserSubscription
        ? await hashEndpoint(browserSubscription.endpoint)
        : null;
      const currentDeviceActive = Boolean(
        endpointHash &&
          serverSettings.subscriptions.some(
            (subscription) =>
              subscription.active &&
              subscription.endpointHash === endpointHash
          )
      );

      setCurrentEndpointHash(endpointHash);
      setStatus(
        currentDeviceActive
          ? serverSettings.preferences.pushEnabled
            ? "active"
            : "paused"
          : "available"
      );
    } catch {
      setStatus("error");
    }
  }, [isIos, isReady, isStandalone]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshSettings();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [refreshSettings]);

  function showFeedback(message: string, isError = false) {
    setFeedback(message);
    setFeedbackIsError(isError);
  }

  async function handleEnableCurrentDevice() {
    if (!publicKey || workingKey) {
      return;
    }

    setWorkingKey("enable-current");
    setFeedback(null);
    let browserSubscription: PushSubscription | null = null;
    let createdSubscription: PushSubscription | null = null;
    let savedOnServer = false;

    try {
      const permission = await Notification.requestPermission();

      if (permission === "denied") {
        setStatus("denied");
        return;
      }

      if (permission !== "granted") {
        showFeedback(
          translate(
            "pwa.push.feedback.cancelled",
            "Permesso non concesso. Potrai riprovare quando vuoi."
          )
        );
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      browserSubscription = await registration.pushManager.getSubscription();

      if (!browserSubscription) {
        browserSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(publicKey),
        });
        createdSubscription = browserSubscription;
      }

      await saveBrowserSubscription(browserSubscription, locale);
      savedOnServer = true;
      const nextPreferences = await patchPreferences({ pushEnabled: true });
      setPreferences(nextPreferences);
      showFeedback(
        translate(
          "pwa.push.feedback.enabled",
          "Notifiche attivate su questo dispositivo."
        )
      );
      await refreshSettings();
    } catch {
      if (savedOnServer && browserSubscription) {
        await disableServerSubscription({
          endpoint: browserSubscription.endpoint,
        }).catch(() => undefined);
      }

      if (createdSubscription) {
        await createdSubscription.unsubscribe().catch(() => false);
      }

      showFeedback(
        translate(
          "pwa.push.feedback.error",
          "Operazione non riuscita. Riprova tra poco."
        ),
        true
      );
      await refreshSettings();
    } finally {
      setWorkingKey(null);
    }
  }

  async function handleGlobalToggle() {
    if (workingKey) {
      return;
    }

    if (!preferences.pushEnabled && activeDeviceCount === 0) {
      showFeedback(
        translate(
          "pwa.push.feedback.activeDeviceRequired",
          "Attiva prima le notifiche su almeno un dispositivo."
        ),
        true
      );
      return;
    }

    setWorkingKey("global");
    setFeedback(null);

    try {
      const nextPreferences = await patchPreferences({
        pushEnabled: !preferences.pushEnabled,
      });
      setPreferences(nextPreferences);
      setStatus((current) => {
        if (current !== "active" && current !== "paused") return current;
        return nextPreferences.pushEnabled ? "active" : "paused";
      });
      showFeedback(
        nextPreferences.pushEnabled
          ? translate(
              "pwa.push.feedback.globalEnabled",
              "Invio push riattivato sui dispositivi registrati."
            )
          : translate(
              "pwa.push.feedback.globalDisabled",
              "Invio push sospeso su tutti i dispositivi."
            )
      );
    } catch {
      showFeedback(
        translate(
          "pwa.push.feedback.error",
          "Operazione non riuscita. Riprova tra poco."
        ),
        true
      );
    } finally {
      setWorkingKey(null);
    }
  }

  async function handleCategoryToggle(key: PreferenceKey) {
    if (workingKey) {
      return;
    }

    setWorkingKey(key);
    setFeedback(null);

    try {
      const nextPreferences = await patchPreferences({
        [key]: !preferences[key],
      });
      setPreferences(nextPreferences);
      showFeedback(
        translate(
          "pwa.push.feedback.preferencesSaved",
          "Preferenze salvate."
        )
      );
    } catch {
      showFeedback(
        translate(
          "pwa.push.feedback.error",
          "Operazione non riuscita. Riprova tra poco."
        ),
        true
      );
    } finally {
      setWorkingKey(null);
    }
  }

  async function handleDisableDevice(subscription: PushSubscriptionItem) {
    if (workingKey || !subscription.active) {
      return;
    }

    setWorkingKey(`disable:${subscription.id}`);
    setFeedback(null);

    try {
      await disableServerSubscription({ subscriptionId: subscription.id });

      if (subscription.endpointHash === currentEndpointHash && supportsPush()) {
        const registration = await navigator.serviceWorker.ready;
        const browserSubscription =
          await registration.pushManager.getSubscription();
        await browserSubscription?.unsubscribe().catch(() => false);
      }

      showFeedback(
        translate(
          "pwa.push.feedback.deviceDisabled",
          "Dispositivo disattivato."
        )
      );
      await refreshSettings();
    } catch {
      showFeedback(
        translate(
          "pwa.push.feedback.error",
          "Operazione non riuscita. Riprova tra poco."
        ),
        true
      );
    } finally {
      setWorkingKey(null);
    }
  }

  async function handleRenameDevice(subscriptionId: string) {
    const cleanedLabel = deviceLabelDraft.trim();

    if (workingKey || !cleanedLabel) {
      return;
    }

    setWorkingKey(`rename:${subscriptionId}`);
    setFeedback(null);

    try {
      const response = await fetch("/api/account/push-subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId,
          deviceLabel: cleanedLabel,
        }),
      });

      if (!response.ok) {
        throw new Error("DEVICE_RENAME_FAILED");
      }

      setEditingId(null);
      setDeviceLabelDraft("");
      showFeedback(
        translate(
          "pwa.push.feedback.deviceRenamed",
          "Nome del dispositivo aggiornato."
        )
      );
      await refreshSettings();
    } catch {
      showFeedback(
        translate(
          "pwa.push.feedback.error",
          "Operazione non riuscita. Riprova tra poco."
        ),
        true
      );
    } finally {
      setWorkingKey(null);
    }
  }

  const statusDescription = (() => {
    if (status === "active") {
      return translate(
        "pwa.push.activeDescription",
        "Le notifiche sono attive su questo dispositivo."
      );
    }

    if (status === "paused") {
      return translate(
        "pwa.push.pausedDescription",
        "Questo dispositivo è registrato, ma l’invio push globale è sospeso."
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
    <article className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 md:col-span-3">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="font-medium text-neutral-100">
            {translate("pwa.push.title", "Notifiche sul dispositivo")}
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {statusDescription}
          </p>
          <p className="mt-2 text-xs leading-5 text-neutral-600">
            {badgeSupported
              ? translate(
                  "pwa.push.badge.supported",
                  "Il badge numerico sull’icona si aggiorna automaticamente."
                )
              : translate(
                  "pwa.push.badge.unsupported",
                  "Il badge numerico dipende dal supporto del sistema e del browser."
                )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {(status === "active" || status === "paused") && (
            <span
              className={
                status === "active"
                  ? "inline-flex rounded-full border border-green-900 bg-green-950/40 px-4 py-2 text-sm text-green-300"
                  : "inline-flex rounded-full border border-amber-900 bg-amber-950/30 px-4 py-2 text-sm text-amber-300"
              }
            >
              {status === "active"
                ? translate("pwa.push.active", "Attive")
                : translate("pwa.push.paused", "In pausa")}
            </span>
          )}

          {status === "available" && (
            <button
              type="button"
              onClick={handleEnableCurrentDevice}
              disabled={Boolean(workingKey)}
              className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-wait disabled:opacity-60"
            >
              {workingKey === "enable-current"
                ? translate("pwa.push.enabling", "Attivo...")
                : translate("pwa.push.enable", "Attiva notifiche")}
            </button>
          )}
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/55 p-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-neutral-100">
              {translate("pwa.push.master.title", "Invio push globale")}
            </p>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              {translate(
                "pwa.push.master.description",
                "Sospende o riattiva tutte le categorie senza rimuovere i dispositivi."
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGlobalToggle}
            disabled={Boolean(workingKey)}
            aria-pressed={preferences.pushEnabled}
            className={
              preferences.pushEnabled
                ? "inline-flex w-fit rounded-full border border-green-900 bg-green-950/40 px-5 py-2 text-sm text-green-300 transition hover:border-green-700 disabled:opacity-60"
                : "inline-flex w-fit rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-300 transition hover:border-neutral-500 disabled:opacity-60"
            }
          >
            {preferences.pushEnabled
              ? translate("pwa.push.master.enabled", "Invio attivo")
              : translate("pwa.push.master.disabled", "Invio sospeso")}
          </button>
        </div>
      </section>

      <section className="mt-6">
        <div>
          <p className="text-sm font-medium text-neutral-100">
            {translate("pwa.push.categories.title", "Preferenze per categoria")}
          </p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            {translate(
              "pwa.push.categories.description",
              "Scegli quali attività possono generare una notifica push. Gli avvisi restano disponibili nel centro notifiche."
            )}
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {PREFERENCE_OPTIONS.map((option) => (
            <label
              key={option.key}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/55 p-4 transition hover:border-neutral-700"
            >
              <input
                type="checkbox"
                checked={preferences[option.key]}
                onChange={() => void handleCategoryToggle(option.key)}
                disabled={Boolean(workingKey)}
                className="mt-1 h-4 w-4 accent-amber-500 disabled:cursor-wait"
              />
              <span>
                <span className="block text-sm font-medium text-neutral-200">
                  {translate(option.titleKey, option.title)}
                </span>
                <span className="mt-1 block text-xs leading-5 text-neutral-500">
                  {translate(option.descriptionKey, option.description)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="mt-6 border-t border-neutral-800 pt-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-neutral-100">
              {translate("pwa.push.devices.title", "Dispositivi registrati")}
            </p>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              {translate(
                "pwa.push.devices.description",
                "Controlla dove possono arrivare i push, rinomina i dispositivi e disattiva quelli che non usi più."
              )}
            </p>
          </div>
          <span className="text-xs text-neutral-600">
            {activeDeviceCount} {translate("pwa.push.devices.activeCount", "attivi")}
          </span>
        </div>

        {subscriptions.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900/55 p-4 text-sm text-neutral-500">
            {translate(
              "pwa.push.devices.empty",
              "Nessun dispositivo registrato."
            )}
          </p>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {subscriptions.map((subscription) => {
              const isCurrent =
                subscription.endpointHash === currentEndpointHash;
              const isRenaming = editingId === subscription.id;

              return (
                <div
                  key={subscription.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900/55 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-neutral-200">
                          {subscription.deviceLabel ||
                            translate(
                              "pwa.push.devices.unnamed",
                              "Dispositivo senza nome"
                            )}
                        </p>
                        {isCurrent && (
                          <span className="rounded-full border border-amber-900 bg-amber-950/30 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-amber-300">
                            {translate("pwa.push.devices.current", "Questo")}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-neutral-500">
                        {subscription.active
                          ? translate("pwa.push.devices.active", "Attivo")
                          : translate("pwa.push.devices.inactive", "Disattivato")}
                        {subscription.timezone
                          ? ` · ${subscription.timezone}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-neutral-600">
                        {translate("pwa.push.devices.lastSeen", "Ultima attività")}: {" "}
                        {formatDate(subscription.lastSeenAt, locale)}
                      </p>
                      {subscription.lastErrorCode && (
                        <p className="mt-2 text-xs text-red-300">
                          {translate(
                            "pwa.push.devices.lastError",
                            "Ultimo problema"
                          )}: {subscription.lastErrorCode}
                        </p>
                      )}
                    </div>

                    <span
                      className={
                        subscription.active
                          ? "h-2.5 w-2.5 shrink-0 rounded-full bg-green-400"
                          : "h-2.5 w-2.5 shrink-0 rounded-full bg-neutral-700"
                      }
                      aria-hidden="true"
                    />
                  </div>

                  {isRenaming ? (
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={deviceLabelDraft}
                        onChange={(event) =>
                          setDeviceLabelDraft(event.target.value.slice(0, 120))
                        }
                        maxLength={120}
                        className="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-700"
                        aria-label={translate(
                          "pwa.push.devices.nameLabel",
                          "Nome dispositivo"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => void handleRenameDevice(subscription.id)}
                        disabled={Boolean(workingKey) || !deviceLabelDraft.trim()}
                        className="rounded-full bg-white px-4 py-2 text-xs font-medium text-neutral-950 disabled:opacity-50"
                      >
                        {translate("pwa.push.devices.save", "Salva")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setDeviceLabelDraft("");
                        }}
                        disabled={Boolean(workingKey)}
                        className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-300 disabled:opacity-50"
                      >
                        {translate("pwa.push.devices.cancel", "Annulla")}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(subscription.id);
                          setDeviceLabelDraft(subscription.deviceLabel || "");
                        }}
                        disabled={Boolean(workingKey)}
                        className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-300 transition hover:border-neutral-500 disabled:opacity-50"
                      >
                        {translate("pwa.push.devices.rename", "Rinomina")}
                      </button>
                      {subscription.active && (
                        <button
                          type="button"
                          onClick={() => void handleDisableDevice(subscription)}
                          disabled={Boolean(workingKey)}
                          className="rounded-full border border-red-900 px-4 py-2 text-xs text-red-300 transition hover:border-red-700 disabled:opacity-50"
                        >
                          {workingKey === `disable:${subscription.id}`
                            ? translate(
                                "pwa.push.devices.disabling",
                                "Disattivo..."
                              )
                            : translate(
                                "pwa.push.devices.disable",
                                "Disattiva"
                              )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {feedback && (
        <p
          className={`mt-5 text-sm ${
            feedbackIsError ? "text-red-300" : "text-neutral-400"
          }`}
          role="status"
        >
          {feedback}
        </p>
      )}
    </article>
  );
}
