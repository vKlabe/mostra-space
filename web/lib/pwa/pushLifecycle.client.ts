"use client";

import { setAppBadgeCount } from "@/lib/pwa/appBadge.client";

const CURRENT_SUBSCRIPTION_ID_KEY =
  "mostra-space:pwa-current-subscription-id";
const REQUEST_TIMEOUT_MS = 4_000;

function readStoredSubscriptionId() {
  try {
    const value = window.localStorage.getItem(CURRENT_SUBSCRIPTION_ID_KEY);

    return value && value.length <= 80 ? value : null;
  } catch {
    return null;
  }
}

export function rememberCurrentPushSubscriptionId(subscriptionId: string) {
  try {
    window.localStorage.setItem(CURRENT_SUBSCRIPTION_ID_KEY, subscriptionId);
  } catch {
    // The subscription remains usable when private storage is unavailable.
  }
}

export function forgetCurrentPushSubscriptionId() {
  try {
    window.localStorage.removeItem(CURRENT_SUBSCRIPTION_ID_KEY);
  } catch {
    // Nothing else is required when private storage is unavailable.
  }
}

async function currentBrowserSubscription(
  registration?: ServiceWorkerRegistration | null
) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  const resolvedRegistration =
    registration || (await navigator.serviceWorker.getRegistration("/"));

  return resolvedRegistration?.pushManager.getSubscription() || null;
}

async function disableServerSubscription(
  selector: { subscriptionId: string } | { endpoint: string }
) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("/api/account/push-subscriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selector),
      cache: "no-store",
      signal: controller.signal,
    });

    return response.ok || response.status === 401 || response.status === 404;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function deactivateCurrentDevicePush(options?: {
  notifyServer?: boolean;
  registration?: ServiceWorkerRegistration | null;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const notifyServer = options?.notifyServer !== false;
  const subscription = await currentBrowserSubscription(options?.registration);
  const storedSubscriptionId = readStoredSubscriptionId();

  if (notifyServer) {
    const selector = subscription
      ? { endpoint: subscription.endpoint }
      : storedSubscriptionId
        ? { subscriptionId: storedSubscriptionId }
        : null;

    if (selector) {
      await disableServerSubscription(selector);
    }
  }

  if (subscription) {
    await subscription.unsubscribe().catch(() => false);
  }

  forgetCurrentPushSubscriptionId();
  await setAppBadgeCount(0);
}

export async function reconcileCurrentPushLifecycle(
  registration: ServiceWorkerRegistration
) {
  if (!("Notification" in window)) {
    return;
  }

  const subscription = await currentBrowserSubscription(registration);

  if (Notification.permission === "granted" && subscription) {
    return;
  }

  if (subscription || readStoredSubscriptionId()) {
    await deactivateCurrentDevicePush({ registration });
  }
}
