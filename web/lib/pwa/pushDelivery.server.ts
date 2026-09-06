import { randomUUID } from "node:crypto";
import webPush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_NOTIFICATION_URL = "/account/notifiche";
const CLAIM_LIMIT = 50;
const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MINUTES = [1, 5, 30, 120] as const;

type PushCategory =
  | "messages"
  | "followers"
  | "favorites"
  | "publications"
  | "invitations"
  | "events"
  | "event_reminders"
  | "gallery_updates"
  | "platform_updates";

type ClaimedDelivery = {
  delivery_id: string;
  notification_id: string;
  subscription_id: string;
  attempt_count: number;
};

type AccountNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  href: string | null;
  scheduled_for: string | null;
  read_at: string | null;
  push_category: string | null;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  content_encoding: "aes128gcm" | "aesgcm";
  locale: string | null;
  active: boolean;
  expires_at: string | null;
};

type PushPreferenceRow = {
  user_id: string;
  push_enabled: boolean;
  messages_enabled: boolean;
  followers_enabled: boolean;
  favorites_enabled: boolean;
  publications_enabled: boolean;
  invitations_enabled: boolean;
  events_enabled: boolean;
  event_reminders_enabled: boolean;
  gallery_updates_enabled: boolean;
  platform_updates_enabled: boolean;
};

type WebPushFailure = Error & {
  statusCode?: number;
  headers?: Record<string, string | string[] | undefined>;
};

export type PushDispatchSummary = {
  queued: number;
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  skipped: number;
  deactivatedExpired: number;
  deactivatedGone: number;
};

export class PushDeliveryConfigurationError extends Error {
  constructor() {
    super("Push delivery is not configured");
    this.name = "PushDeliveryConfigurationError";
  }
}

const CATEGORY_PREFERENCE_COLUMN: Record<PushCategory, keyof PushPreferenceRow> = {
  messages: "messages_enabled",
  followers: "followers_enabled",
  favorites: "favorites_enabled",
  publications: "publications_enabled",
  invitations: "invitations_enabled",
  events: "events_enabled",
  event_reminders: "event_reminders_enabled",
  gallery_updates: "gallery_updates_enabled",
  platform_updates: "platform_updates_enabled",
};

const COPY = {
  it: {
    messages: ["Nuovo messaggio su Mostra.Space", "Hai ricevuto un nuovo messaggio."],
    followers: ["Novità su Mostra.Space", "Hai un nuovo follower."],
    favorites: ["Novità su Mostra.Space", "Una tua opera o galleria è stata salvata."],
    publications: ["Nuovo aggiornamento su Mostra.Space", "Un profilo che segui ha pubblicato un aggiornamento."],
    invitations: ["Nuovo invito su Mostra.Space", "Hai ricevuto un nuovo invito."],
    events: ["Nuovo evento su Mostra.Space", "È disponibile un nuovo evento."],
    event_reminders: ["Promemoria evento", "Un evento salvato sta per iniziare."],
    gallery_updates: ["Nuova galleria su Mostra.Space", "Un profilo che segui ha pubblicato una nuova galleria."],
    platform_updates: ["Aggiornamento Mostra.Space", "È disponibile un nuovo aggiornamento."],
  },
  en: {
    messages: ["New message on Mostra.Space", "You received a new message."],
    followers: ["News from Mostra.Space", "You have a new follower."],
    favorites: ["News from Mostra.Space", "One of your artworks or galleries was saved."],
    publications: ["New update on Mostra.Space", "A profile you follow posted an update."],
    invitations: ["New invitation on Mostra.Space", "You received a new invitation."],
    events: ["New event on Mostra.Space", "A new event is available."],
    event_reminders: ["Event reminder", "A saved event is about to begin."],
    gallery_updates: ["New gallery on Mostra.Space", "A profile you follow published a new gallery."],
    platform_updates: ["Mostra.Space update", "A new update is available."],
  },
  fr: {
    messages: ["Nouveau message sur Mostra.Space", "Vous avez reçu un nouveau message."],
    followers: ["Actualité Mostra.Space", "Vous avez un nouvel abonné."],
    favorites: ["Actualité Mostra.Space", "Une de vos œuvres ou galeries a été enregistrée."],
    publications: ["Nouvelle publication sur Mostra.Space", "Un profil suivi a publié une actualité."],
    invitations: ["Nouvelle invitation sur Mostra.Space", "Vous avez reçu une nouvelle invitation."],
    events: ["Nouvel événement sur Mostra.Space", "Un nouvel événement est disponible."],
    event_reminders: ["Rappel d’événement", "Un événement enregistré va bientôt commencer."],
    gallery_updates: ["Nouvelle galerie sur Mostra.Space", "Un profil suivi a publié une nouvelle galerie."],
    platform_updates: ["Mise à jour Mostra.Space", "Une nouvelle mise à jour est disponible."],
  },
  es: {
    messages: ["Nuevo mensaje en Mostra.Space", "Has recibido un nuevo mensaje."],
    followers: ["Novedades de Mostra.Space", "Tienes un nuevo seguidor."],
    favorites: ["Novedades de Mostra.Space", "Una de tus obras o galerías se ha guardado."],
    publications: ["Nueva publicación en Mostra.Space", "Un perfil que sigues ha publicado una novedad."],
    invitations: ["Nueva invitación en Mostra.Space", "Has recibido una nueva invitación."],
    events: ["Nuevo evento en Mostra.Space", "Hay un nuevo evento disponible."],
    event_reminders: ["Recordatorio de evento", "Un evento guardado está a punto de comenzar."],
    gallery_updates: ["Nueva galería en Mostra.Space", "Un perfil que sigues ha publicado una nueva galería."],
    platform_updates: ["Actualización de Mostra.Space", "Hay una nueva actualización disponible."],
  },
} satisfies Record<string, Record<PushCategory, readonly [string, string]>>;

function configureWebPush() {
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim();
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();

  if (!subject || !publicKey || !privateKey) {
    throw new PushDeliveryConfigurationError();
  }

  try {
    webPush.setVapidDetails(subject, publicKey, privateKey);
  } catch {
    throw new PushDeliveryConfigurationError();
  }
}

function categoryFor(notification: AccountNotification): PushCategory {
  if (
    typeof notification.push_category === "string" &&
    notification.push_category in CATEGORY_PREFERENCE_COLUMN
  ) {
    return notification.push_category as PushCategory;
  }

  if (notification.type === "gallery_published") return "gallery_updates";
  if (notification.type === "status_published") return "publications";
  if (
    notification.type === "event_3_days_before" ||
    notification.type === "event_30_minutes_before"
  ) {
    return "event_reminders";
  }
  if (notification.type === "event_created" && notification.title === "Invito evento") {
    return "invitations";
  }
  if (notification.type === "event_created") return "events";
  return "platform_updates";
}

function safeNotificationUrl(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_NOTIFICATION_URL;
  }

  try {
    const url = new URL(value, "https://mostra.space");
    return url.origin === "https://mostra.space"
      ? `${url.pathname}${url.search}${url.hash}`
      : DEFAULT_NOTIFICATION_URL;
  } catch {
    return DEFAULT_NOTIFICATION_URL;
  }
}

function payloadFor(
  notification: AccountNotification,
  subscription: PushSubscriptionRow
) {
  const category = categoryFor(notification);
  const language = subscription.locale?.toLowerCase().split("-")[0] || "it";
  const localized = COPY[language as keyof typeof COPY] || COPY.it;
  const [title, body] = localized[category];

  return {
    category,
    serialized: JSON.stringify({
      title,
      body,
      url: safeNotificationUrl(notification.href),
      tag: `account-notification-${notification.id}`,
    }),
  };
}

function retryAfterMilliseconds(error: WebPushFailure) {
  const raw = error.headers?.["retry-after"];
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, 6 * 60 * 60 * 1000);
  }

  const date = Date.parse(value);
  return Number.isFinite(date)
    ? Math.max(0, Math.min(date - Date.now(), 6 * 60 * 60 * 1000))
    : null;
}

function isTransient(statusCode: number | undefined) {
  return (
    statusCode === undefined ||
    statusCode === 408 ||
    statusCode === 425 ||
    statusCode === 429 ||
    statusCode >= 500
  );
}

function errorCode(statusCode: number | undefined) {
  return statusCode ? `HTTP_${statusCode}` : "NETWORK_ERROR";
}

export async function dispatchDuePushNotifications(): Promise<PushDispatchSummary> {
  configureWebPush();

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const summary: PushDispatchSummary = {
    queued: 0,
    claimed: 0,
    sent: 0,
    retried: 0,
    failed: 0,
    skipped: 0,
    deactivatedExpired: 0,
    deactivatedGone: 0,
  };

  const { data: expired, error: expireError } = await admin
    .from("pwa_push_subscriptions")
    .update({
      active: false,
      disabled_at: now,
      last_error_code: "SUBSCRIPTION_EXPIRED",
      last_error_at: now,
    })
    .eq("active", true)
    .lte("expires_at", now)
    .select("id");

  if (expireError) throw new Error(`Push expiration cleanup failed: ${expireError.code}`);
  summary.deactivatedExpired = expired?.length || 0;

  const { data: queued, error: queueError } = await admin.rpc(
    "pwa_queue_push_deliveries",
    { p_limit: 500 }
  );
  if (queueError) throw new Error(`Push queue failed: ${queueError.code}`);
  summary.queued = typeof queued === "number" ? queued : 0;

  const claimToken = randomUUID();
  const { data: claimedData, error: claimError } = await admin.rpc(
    "pwa_claim_push_deliveries",
    { p_limit: CLAIM_LIMIT, p_claim_token: claimToken }
  );
  if (claimError) throw new Error(`Push claim failed: ${claimError.code}`);

  const claimed = (claimedData || []) as ClaimedDelivery[];
  summary.claimed = claimed.length;
  if (claimed.length === 0) return summary;

  const notificationIds = [...new Set(claimed.map((row) => row.notification_id))];
  const subscriptionIds = [...new Set(claimed.map((row) => row.subscription_id))];

  const [notificationResult, subscriptionResult] = await Promise.all([
    admin
      .from("account_notifications")
      .select("id, user_id, type, title, href, scheduled_for, read_at, push_category")
      .in("id", notificationIds),
    admin
      .from("pwa_push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth_key, content_encoding, locale, active, expires_at")
      .in("id", subscriptionIds),
  ]);

  if (notificationResult.error || subscriptionResult.error) {
    throw new Error("Unable to load claimed push delivery data");
  }

  const notifications = new Map(
    ((notificationResult.data || []) as AccountNotification[]).map((row) => [row.id, row])
  );
  const subscriptions = new Map(
    ((subscriptionResult.data || []) as PushSubscriptionRow[]).map((row) => [row.id, row])
  );
  const userIds = [...new Set([...subscriptions.values()].map((row) => row.user_id))];
  const { data: preferenceData, error: preferenceError } = await admin
    .from("pwa_push_preferences")
    .select("user_id, push_enabled, messages_enabled, followers_enabled, favorites_enabled, publications_enabled, invitations_enabled, events_enabled, event_reminders_enabled, gallery_updates_enabled, platform_updates_enabled")
    .in("user_id", userIds);

  if (preferenceError) throw new Error(`Push preference load failed: ${preferenceError.code}`);
  const preferences = new Map(
    ((preferenceData || []) as PushPreferenceRow[]).map((row) => [row.user_id, row])
  );

  async function settle(
    delivery: ClaimedDelivery,
    values: Record<string, unknown>
  ) {
    const { error } = await admin
      .from("pwa_push_deliveries")
      .update({ ...values, claim_token: null, claimed_at: null })
      .eq("id", delivery.delivery_id)
      .eq("claim_token", claimToken)
      .eq("status", "processing");

    if (error) throw new Error(`Push delivery update failed: ${error.code}`);
  }

  async function skip(delivery: ClaimedDelivery, code: string) {
    await settle(delivery, { status: "skipped", last_error_code: code });
    summary.skipped += 1;
  }

  async function processDelivery(delivery: ClaimedDelivery) {
    if (delivery.attempt_count > MAX_ATTEMPTS) {
      await settle(delivery, { status: "failed", last_error_code: "MAX_ATTEMPTS_EXCEEDED" });
      summary.failed += 1;
      return;
    }

    const notification = notifications.get(delivery.notification_id);
    const subscription = subscriptions.get(delivery.subscription_id);

    if (!notification) return skip(delivery, "NOTIFICATION_NOT_FOUND");
    if (!subscription) return skip(delivery, "SUBSCRIPTION_NOT_FOUND");
    if (notification.user_id !== subscription.user_id) return skip(delivery, "USER_MISMATCH");
    if (notification.read_at) return skip(delivery, "NOTIFICATION_ALREADY_READ");
    if (!notification.scheduled_for || Date.parse(notification.scheduled_for) > Date.now()) {
      return skip(delivery, "NOTIFICATION_NOT_DUE");
    }
    if (!subscription.active) return skip(delivery, "SUBSCRIPTION_INACTIVE");
    if (subscription.expires_at && Date.parse(subscription.expires_at) <= Date.now()) {
      return skip(delivery, "SUBSCRIPTION_EXPIRED");
    }

    const preference = preferences.get(subscription.user_id);
    const category = categoryFor(notification);
    if (!preference?.push_enabled) return skip(delivery, "PUSH_DISABLED");
    if (!preference[CATEGORY_PREFERENCE_COLUMN[category]]) {
      return skip(delivery, "CATEGORY_DISABLED");
    }

    const payload = payloadFor(notification, subscription);

    try {
      const response = await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
        },
        payload.serialized,
        {
          TTL: payload.category === "event_reminders" ? 3600 : 86400,
          urgency: payload.category === "event_reminders" ? "high" : "normal",
          contentEncoding: subscription.content_encoding,
        }
      );

      await settle(delivery, {
        status: "sent",
        sent_at: new Date().toISOString(),
        response_status: response.statusCode,
        last_error_code: null,
      });
      const { error: healthyUpdateError } = await admin
        .from("pwa_push_subscriptions")
        .update({ failure_count: 0, last_error_code: null, last_error_at: null })
        .eq("id", subscription.id)
        .eq("active", true);
      if (healthyUpdateError) {
        console.error("Unable to reset PWA push subscription failures", {
          code: healthyUpdateError.code,
        });
      }
      summary.sent += 1;
    } catch (caught) {
      const failure = caught as WebPushFailure;
      const statusCode = failure.statusCode;
      const gone = statusCode === 404 || statusCode === 410;
      const code = gone ? "ENDPOINT_GONE" : errorCode(statusCode);

      const { error: failureRecordError } = await admin.rpc(
        "pwa_record_push_subscription_failure",
        {
          p_subscription_id: subscription.id,
          p_error_code: code,
          p_disable: gone,
        }
      );
      if (failureRecordError) {
        throw new Error(
          `Push subscription failure update failed: ${failureRecordError.code}`
        );
      }

      if (gone) {
        await settle(delivery, {
          status: "failed",
          response_status: statusCode,
          last_error_code: code,
        });
        summary.failed += 1;
        summary.deactivatedGone += 1;
        return;
      }

      if (isTransient(statusCode) && delivery.attempt_count < MAX_ATTEMPTS) {
        const defaultDelay = RETRY_DELAYS_MINUTES[
          Math.min(delivery.attempt_count - 1, RETRY_DELAYS_MINUTES.length - 1)
        ] * 60 * 1000;
        const delay = retryAfterMilliseconds(failure) ?? defaultDelay;
        await settle(delivery, {
          status: "pending",
          next_attempt_at: new Date(Date.now() + delay).toISOString(),
          response_status: statusCode || null,
          last_error_code: code,
        });
        summary.retried += 1;
        return;
      }

      await settle(delivery, {
        status: "failed",
        response_status: statusCode || null,
        last_error_code: code,
      });
      summary.failed += 1;
    }
  }

  const groups = new Map<string, ClaimedDelivery[]>();
  for (const delivery of claimed) {
    const group = groups.get(delivery.subscription_id) || [];
    group.push(delivery);
    groups.set(delivery.subscription_id, group);
  }

  const work = [...groups.values()];
  let workIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(5, work.length) }, async () => {
      while (workIndex < work.length) {
        const group = work[workIndex++];
        for (const delivery of group) await processDelivery(delivery);
      }
    })
  );

  return summary;
}
