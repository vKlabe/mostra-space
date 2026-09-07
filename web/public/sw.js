/*
 * Mostra.Space push service worker.
 *
 * It intentionally has no fetch handler and never caches or rewrites requests.
 * Notifications are processed only after a user has explicitly subscribed.
 */

const DEFAULT_NOTIFICATION_URL = "/account/notifiche";
const NOTIFICATION_ICON = "/pwa/icon-192x192.png";

function cleanText(value, fallback, maximumLength) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim();

  return cleaned ? cleaned.slice(0, maximumLength) : fallback;
}

function notificationUrl(value) {
  if (typeof value !== "string") {
    return DEFAULT_NOTIFICATION_URL;
  }

  try {
    const url = new URL(value, self.location.origin);

    if (url.origin !== self.location.origin) {
      return DEFAULT_NOTIFICATION_URL;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_NOTIFICATION_URL;
  }
}

function readPushPayload(event) {
  if (!event.data) {
    return {};
  }

  try {
    const payload = event.data.json();

    return payload && typeof payload === "object" ? payload : {};
  } catch {
    return { body: event.data.text() };
  }
}

function badgeCount(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.min(999, Math.floor(parsed));
}

async function updateAppBadge(count) {
  try {
    if (count > 0 && typeof self.navigator?.setAppBadge === "function") {
      await self.navigator.setAppBadge(count);
    } else if (
      count === 0 &&
      typeof self.navigator?.clearAppBadge === "function"
    ) {
      await self.navigator.clearAppBadge();
    }
  } catch {
    // App badging is optional and must never prevent notification delivery.
  }
}

async function notifyOpenClients() {
  const windowClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of windowClients) {
    client.postMessage({ type: "MOSTRASPACE_BADGE_SYNC" });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const title = cleanText(payload.title, "Mostra.Space", 120);
  const body = cleanText(
    payload.body,
    "Hai una nuova notifica.",
    280
  );
  const url = notificationUrl(payload.url);
  const tag = cleanText(payload.tag, "mostra-space-notification", 120);
  const unreadCount = badgeCount(payload.badgeCount);

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body,
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_ICON,
        data: { url },
        tag,
      }),
      updateAppBadge(unreadCount),
      notifyOpenClients(),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = notificationUrl(event.notification.data?.url);

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if ("navigate" in client) {
          await client.navigate(url);
        }

        return client.focus();
      }

      return self.clients.openWindow(url);
    })()
  );
});
